from flask import Flask,request, jsonify
from flask_cors import CORS
from flask_mail import Mail, Message
from jwt import ExpiredSignatureError
import mysql.connector
import os
from dotenv import load_dotenv
from itsdangerous import URLSafeTimedSerializer
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import random
from datetime import datetime, timedelta, timezone, date
import json

from flask_mail import Message
import threading


from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    set_access_cookies,
    unset_jwt_cookies,
    jwt_required,
    get_jwt_identity,
    get_jwt,
    verify_jwt_in_request
)

import cloudinary
import cloudinary.uploader
import os

load_dotenv()

app = Flask(__name__)
CORS(app, supports_credentials=True, origins=["http://localhost:5173"])

app.config['SECRET_KEY'] = os.getenv("SECRET_KEY", "dev-secret-key")
app.config['PORT'] = int(os.getenv("FLASK_PORT", 5000))

# Mail config
app.config['MAIL_SERVER'] = os.getenv("MAIL_SERVER", "smtp.gmail.com")
app.config['MAIL_PORT'] = int(os.getenv("MAIL_PORT", 587))
app.config['MAIL_USE_TLS'] = os.getenv("MAIL_USE_TLS", "True").lower() == "true"
app.config['MAIL_USERNAME'] = os.getenv("MAIL_USERNAME")
app.config['MAIL_PASSWORD'] = os.getenv("MAIL_PASSWORD")

# JWT config
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
app.config["JWT_TOKEN_LOCATION"] = ["cookies"]
app.config["JWT_ACCESS_COOKIE_NAME"] = "access_token"
app.config["JWT_COOKIE_SECURE"] = False
app.config["JWT_COOKIE_SAMESITE"] = "Lax"
app.config["JWT_COOKIE_CSRF_PROTECT"] = False
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(minutes=30)

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

jwt = JWTManager(app)

mail = Mail(app)
serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'])


def role_required(*roles):

    def wrapper(fn):

        @wraps(fn)
        def decorator(*args, **kwargs):

            verify_jwt_in_request()

            claims = get_jwt()
            user_role = claims.get("role")
            user_id = claims.get("id")

            if user_role not in roles:
                return jsonify({"message": "Access forbidden"}), 403

            try:
                conn = get_db_connection()
                cursor = conn.cursor(dictionary=True)

                cursor.execute(
                    "SELECT status FROM users WHERE id = %s",
                    (user_id,)
                )

                row = cursor.fetchone()

                cursor.close()
                conn.close()

                if not row or row["status"] != "approved":
                    return jsonify({"message": "Account not approved"}), 403

            except Exception as e:
                print("Auth check error:", str(e))
                return jsonify({"message": "Authorization failed"}), 500

            return fn(*args, **kwargs)

        return decorator

    return wrapper


def admin_required(fn):
    return role_required("admin")(fn)


def warden_required(fn):
    return role_required("warden")(fn)


def student_required(fn):
    return role_required("student")(fn)


def mess_required(fn):
    return role_required("mess")(fn)


# ---------------------------


def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "localhost"),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", ""),
        database=os.getenv("MYSQL_DB", "hostel_db"),
        port=int(os.getenv("MYSQL_PORT", 3306))
    )


def get_allowed_domains(cursor):
    cursor.execute(
        "SELECT domain FROM email_policies WHERE is_active = TRUE"
    )
    return [row[0] for row in cursor.fetchall()]


def is_email_allowed(email, allowed_domains):
    try:
        domain = email.split("@")[1].lower()
        return domain in allowed_domains
    except IndexError:
        return False

@app.route("/get-email-domains", methods=["GET"])
@admin_required
def get_email_domains():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        "SELECT id, domain, is_active, created_at FROM email_policies"
    )

    domains = cursor.fetchall()

    return jsonify(domains)

@app.route("/add-email-domain", methods=["POST"])
@admin_required
def add_email_domain():

    data = request.json
    domain = data.get("domain", "").strip()

    if not domain:
        return jsonify({"message":"Domain name required"}),400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT id FROM email_policies WHERE domain=%s
            """,
            (domain,)
        )

        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({"message":"Domain already exists!"}),500

        cursor.execute(
            """
            INSERT INTO email_policies (domain, is_active) VALUES (%s, 1)
            """,
            (domain,)
        )

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"message":"Domain added!"}),200
    except Exception as e:
        print(str(e))
        return jsonify({"message":"Domain could not be added"}),500

@app.route("/remove-email-domain", methods=["DELETE"])
@admin_required
def remove_email_domain():

    data = request.json
    id = int(data.get("id", ""))


    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            DELETE FROM email_policies WHERE id=%s
            """,
            (id,)
        )

        conn.commit()

        return jsonify({"message":"Domain removed!"}),200
    except Exception as e:
        print(str(e))
        return jsonify({"message":"Domain could not be removed"}),500

@app.route("/toggle-email-domain", methods=["POST"])
@admin_required
def toggle_email_domain():

    data = request.json
    id = int(data.get("id", ""))
    is_active = bool(data.get("is_active", False))

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            UPDATE email_policies
            SET is_active = %s
            WHERE id = %s
            """,
            (is_active, id)
        )
        
        conn.commit()

        return jsonify({"message":"Domain toggled!"}),200
    except Exception as e:
        print(str(e))
        return jsonify({"message":"Domain could not be toggled"}),500

def can_send_email(settings, category, sub=None):

    if category not in settings:
        return False

    if isinstance(settings[category], dict):
        if sub is None:
            return False
        return settings[category].get(sub, False)

    return settings.get(category, False)

def get_user_settings(user_id):

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT settings FROM user_email_settings WHERE user_id=%s",
        (user_id,)
    )

    row = cursor.fetchone()

    if row and row["settings"]:
        return json.loads(row["settings"])

    return None

def get_user_email(user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            "SELECT email FROM users WHERE id = %s",
            (user_id,)
        )

        row = cursor.fetchone()

        cursor.close()
        conn.close()

        if row and row["email"]:
            return row["email"]

        return None

    except Exception as e:
        print("get_user_email error:", str(e))
        return None

def get_admin_emails():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT email FROM users WHERE role = 'admin'"
        )

        emails = [row[0] for row in cursor.fetchall()]

        cursor.close()
        conn.close()

        return emails

    except Exception as e:
        print("get_admin_emails error:", str(e))
        return []

def _send_async(app, msg):
    with app.app_context():
        try:
            mail.send(msg)
        except Exception as e:
            print("Email send error:", str(e))


def send_email(to, subject, body, html=None):
    try:
        msg = Message(
            subject=subject,
            sender=app.config['MAIL_USERNAME'],
            recipients=[to]
        )

        if html:
            msg.html = html
        else:
            msg.body = body

        threading.Thread(target=_send_async, args=(app, msg)).start()

    except Exception as e:
        print("send_email error:", str(e))

# ---------------- ADMIN USER MANAGEMENT ----------------

@app.route("/get-all-users", methods=["GET"])
@admin_required
def get_all_users():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute(
            """
            SELECT id, email, name, room, roll_no, user_type, is_verified, created_at
            FROM users
            ORDER BY created_at DESC
            """
        )
        
        users = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify(users)
    except Exception as e:
        print(str(e))
        return jsonify({"message": "Failed to fetch users"}), 500

@app.route("/delete-user/<int:user_id>", methods=["DELETE"])
@admin_required
def delete_user(user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({"message": "User deleted successfully"}), 200
    except Exception as e:
        print(str(e))
        return jsonify({"message": "Failed to delete user"}), 500

@app.route("/add-user", methods=["POST"])
@admin_required
def add_user():
    data = request.json
    email = data.get("email", "").strip()
    name = data.get("name", email).strip()
    password = data.get("password", "").strip()
    user_type = data.get("user_type", "student")
    room = int(data.get("room", 0)) if data.get("room") else None
    roll_no = int(data.get("roll_no", 0)) if data.get("roll_no") else None
    
    if not email or not password:
        return jsonify({"message": "Email and password required"}), 400
    
    if user_type == "student" and (not room or not roll_no):
        return jsonify({"message": "Room and roll number required for students"}), 400
    
    password_hash = generate_password_hash(password)
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({"message": "User already exists"}), 409
        
        if user_type == "student":
            cursor.execute(
                """
                INSERT INTO users (name, email, password, is_verified, user_type, room, roll_no)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (name, email, password_hash, True, user_type, room, roll_no)
            )
        else:
            cursor.execute(
                """
                INSERT INTO users (name, email, password, is_verified, user_type)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (name, email, password_hash, True, user_type)
            )
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({"message": "User added successfully"}), 201
    except Exception as e:
        print(str(e))
        return jsonify({"message": "Failed to add user", "error": str(e)}), 500

# Get user complaints
@app.route("/get-user-complaints-by-roll/<int:roll_no>", methods=["GET"])
@admin_required
def get_user_complaints_by_roll(roll_no):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute(
            """
            SELECT id, type, description, priority, status, datetime, note
            FROM complaints
            WHERE roll_no = %s
            ORDER BY datetime DESC
            """,
            (roll_no,)
        )
        
        complaints = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify(complaints)
    except Exception as e:
        print(str(e))
        return jsonify({"message": "Failed to fetch complaints"}), 500

# Get user leaves
@app.route("/get-user-leaves-by-roll/<int:roll_no>", methods=["GET"])
@admin_required
def get_user_leaves_by_roll(roll_no):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute(
            """
            SELECT id, start_date, end_date, applied_date, description, status, note
            FROM leaves
            WHERE roll_no = %s
            ORDER BY applied_date DESC
            """,
            (roll_no,)
        )
        
        leaves = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify(leaves)
    except Exception as e:
        print(str(e))
        return jsonify({"message": "Failed to fetch leaves"}), 500

# Get user meal requests
@app.route("/get-user-meal-requests-by-roll/<int:roll_no>", methods=["GET"])
@admin_required
def get_user_meal_requests_by_roll(roll_no):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute(
            """
            SELECT id, reason, day, meal_time, status, date, reoccurring, note
            FROM meal_requests
            WHERE roll_no = %s
            ORDER BY created_at DESC
            """,
            (roll_no,)
        )
        
        requests = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify(requests)
    except Exception as e:
        print(str(e))
        return jsonify({"message": "Failed to fetch meal requests"}), 500

# Get user room change requests
@app.route("/get-user-room-change-by-roll/<int:roll_no>", methods=["GET"])
@admin_required
def get_user_room_change_by_roll(roll_no):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute(
            """
            SELECT id, reason, current_room, requested_room, status, note, applied_date
            FROM room_change
            WHERE roll_no = %s
            ORDER BY applied_date DESC
            """,
            (roll_no,)
        )
        
        requests = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify(requests)
    except Exception as e:
        print(str(e))
        return jsonify({"message": "Failed to fetch room change requests"}), 500

# Get user item reports (lost and found)
@app.route("/get-user-item-reports-by-roll/<int:roll_no>", methods=["GET"])
@admin_required
def get_user_item_reports_by_roll(roll_no):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute(
            """
            SELECT id, item_name, description, report_type, status, date
            FROM lost_and_found
            WHERE roll_no = %s
            ORDER BY date DESC
            """,
            (roll_no,)
        )
        
        reports = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify(reports)
    except Exception as e:
        print(str(e))
        return jsonify({"message": "Failed to fetch item reports"}), 500

# Get user feedback
@app.route("/get-user-feedback-by-roll/<int:roll_no>", methods=["GET"])
@admin_required
def get_user_feedback_by_roll(roll_no):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute(
            """
            SELECT id, meal_time, description, date
            FROM feedback
            WHERE roll_no = %s
            ORDER BY date DESC
            """,
            (roll_no,)
        )
        
        feedback = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify(feedback)
    except Exception as e:
        print(str(e))
        return jsonify({"message": "Failed to fetch feedback"}), 500

# Get user announcements (for warden/mess)
@app.route("/get-user-announcements-by-id/<int:user_id>", methods=["GET"])
@admin_required
def get_user_announcements_by_id(user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute(
            """
            SELECT id, title, description, type, duration, priority, datetime
            FROM announcements
            WHERE creator_id = %s
            ORDER BY datetime DESC
            """,
            (user_id,)
        )
        
        announcements = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify(announcements)
    except Exception as e:
        print(str(e))
        return jsonify({"message": "Failed to fetch announcements"}), 500

@app.route('/get-config', methods=["GET"])
@admin_required
def get_config():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT config_key, value, created_at, type FROM system_config
            """
        )

        configs = cursor.fetchall()

        return jsonify(configs)
    except Exception as e:
        print(str(e))
        return jsonify({"message": "Could not fetch configurations!"})


@app.route('/update-config', methods=["POST"])
@admin_required
def update_config():
    data = request.json
    key = data.get("key", "").strip()
    value = data.get("value", "")
    config_type = data.get("type", "string")

    if not key:
        return jsonify({"message": "Key is required"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if key exists
        cursor.execute(
            """
            SELECT id FROM system_config
            WHERE config_key = %s 
            """,
            (key,)
        )

        existing = cursor.fetchone()

        if existing:
            # Update existing
            cursor.execute(
                """
                UPDATE system_config
                SET value = %s
                WHERE config_key = %s
                """,
                (value, key)
            )
        else:
            # Insert new
            cursor.execute(
                """
                INSERT INTO system_config (config_key, value, type)
                VALUES (%s, %s, %s)
                """,
                (key, value, config_type)
            )

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"message": "Configuration updated!"})
    except Exception as e:
        print(str(e))
        return jsonify({"message": "Configuration could not be updated!"})

@app.route("/signup", methods=["POST"])
def signup():

    data = request.json
    email = data.get("email","").strip()
    name = data.get("name",email).strip()
    password = data.get("password","").strip()
    user_type = data.get("user_type","student")
    room = int(data.get("room",0))
    roll_no = int(data.get("roll_no",0))

    if not email or not password:
        return jsonify({"message":"Email and password required"}),400

    if user_type == "student":
        if not room:
            return jsonify({"message":"Room number required"}),400
        if not roll_no:
            return jsonify({"message":"Roll number required"}),400

    password_hash = generate_password_hash(password)

    try:

        conn = get_db_connection()
        cursor = conn.cursor()

        allowed_domains = get_allowed_domains(cursor)

        if not is_email_allowed(email,allowed_domains):
            cursor.close()
            conn.close()
            return jsonify({"message":"Email domain not allowed"}),403

        cursor.execute("SELECT id FROM users WHERE email=%s",(email,))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({"message":"User already exists"}),409

        if user_type in ["warden", "mess"]:
            status = "pending"
        else:
            status = "approved"

        if user_type == "student":

            cursor.execute(
                """
                INSERT INTO users
                (name,email,password,is_verified,user_type,room,roll_no,status)
                VALUES (%s,%s,%s,%s,%s,%s,%s)
                """,
                (name,email,password_hash,False,user_type,room,roll_no,status)
            )

        else:

            cursor.execute(
                """
                INSERT INTO users
                (name,email,password,is_verified,user_type, status)
                VALUES (%s,%s,%s,%s,%s)
                """,
                (name,email,password_hash,False,user_type, status)
            )

        conn.commit()

        token = serializer.dumps(email,salt="email-verify")

        base_url = os.getenv(
            "BASE_URL",
            f"http://127.0.0.1:{app.config['PORT']}"
        )

        verify_link = f"{base_url}/verify/{token}"

        msg = Message(
            "Verify your account",
            sender=app.config['MAIL_USERNAME'],
            recipients=[email]
        )

        msg.body = f"Click to verify your account:\n{verify_link}"

        mail.send(msg)


        if user_type in ["warden", "mess"]:

            admin_emails = get_admin_emails()

            subject = "New Account Approval Required"

            body = f"""
        A new {user_type} account has been registered and requires approval.

        Name: {name}
        Email: {email}

        Please review and approve/reject from the admin dashboard.
        """

            for admin_email in admin_emails:
                send_email(admin_email, subject, body)

        cursor.close()
        conn.close()

        return jsonify({"message":"Verification email sent"}),201

    except Exception as e:
        print(str(e))
        return jsonify({"message":"Signup error","error":str(e)}),500


@app.route("/verify/<token>")
def verify_email(token):

    try:
        email = serializer.loads(token,salt="email-verify",max_age=3600)
    except:
        return jsonify({"message":"Verification link invalid"}),400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "UPDATE users SET is_verified=TRUE WHERE email=%s",
        (email,)
    )

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message":"Email verified"})


@app.route("/login",methods=["POST"])
def login():

    data = request.json
    email = data.get("email")
    password = data.get("password")

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        "SELECT * FROM users WHERE email=%s",
        (email,)
    )

    user = cursor.fetchone()

    if not user:
        return jsonify({"message":"User not found"}),404

    if not user["is_verified"]:
        return jsonify({"message":"Verify email first"}),403

    if not check_password_hash(user["password"],password):
        return jsonify({"message":"Invalid credentials"}),401
    
    if user["status"] == "pending":
        return jsonify({
            "message": "Account pending admin approval"
        }), 403
    
    if user["status"] == "rejected":
        return jsonify({
            "message": "Your account was rejected by the admin!"
        }), 403

    access_token = create_access_token(
        identity=str(user["id"]),
        additional_claims={
            "id": user["id"],
            "name": user["name"],
            "role": user["user_type"],
            "email": user["email"],
            "room": user["room"],
            "roll_no": user["roll_no"]
        }
    )
    print(user["user_type"])

    cursor.close()
    conn.close()

    response = jsonify({"message":"Login successful"})
    set_access_cookies(response,access_token)

    return response


@app.route("/logout",methods=["POST"])
def logout():

    try:

        response = jsonify({"message":"Logged out"})
        unset_jwt_cookies(response)
    except:
        return jsonify({"message": "Logout failed!"}) , 500

    return response , 200


@app.route("/me")
@jwt_required()
def me():

    user_id = int(get_jwt_identity())
    claims = get_jwt()

    return jsonify({
        "id": user_id,
        "name": claims["name"],
        "email": claims["email"],
        "role": claims["role"],
        "room": claims["room"],
        "roll_no": claims["roll_no"]
    })




@app.route("/get-announcements", methods=["GET"])
@jwt_required()
def get_announcements():

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                id,
                title,
                description,
                type,
                duration,
                priority,
                datetime
            FROM announcements
            WHERE datetime + INTERVAL duration DAY >= NOW()
            ORDER BY
                FIELD(priority,'high','medium','low'),
                datetime DESC
            """
        )

        announcements = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify(announcements)

    except Exception as e:
        return jsonify({
            "message": "Failed to fetch announcements",
            "error": str(e)
        }), 500
    
@app.route("/get-user-announcements", methods=["GET"])
@role_required("warden", "mess", "admin")
def get_user_announcements():

    try:
        claims = get_jwt()
        user_id = claims["id"]

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                id,
                title,
                description,
                type,
                duration,
                priority,
                datetime
            FROM announcements
            WHERE creator_id = %s
            """,
            (user_id,)
        )

        announcements = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify(announcements)

    except Exception as e:
        return jsonify({
            "message": "Failed to fetch announcements",
            "error": str(e)
        }), 500
    
@app.route("/submit-announcement", methods=["POST"])
@role_required("warden", "mess", "admin")
def submit_announcement():

    data = request.json
    title = data.get("title", "")
    description = data.get("description", "")
    duration = int(data.get("duration", 0))
    announcement_type = data.get("announcement_type", "")
    priority = data.get("priority", "")

    if len(description) < 10 or len(description) > 300:
        return jsonify({"message": "Description must be between 10 and 300 characters."}), 400

    try:

        claims = get_jwt()
        user_id = claims["id"]

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO announcements
            (creator_id, title, description, type, duration, priority)
            VALUES (%s,%s,%s,%s,%s,%s)
            """,
            (user_id, title, description, announcement_type, duration, priority)
        )

        conn.commit()

        cursor.execute("SELECT id, email FROM users")
        users = cursor.fetchall()

        for u in users:
            settings = get_user_settings(u[0])
            if settings and can_send_email(settings, "announcements", priority):
                send_email(
                    u[1],
                    title,
                    description
                )

        cursor.close()
        conn.close()


        return jsonify({"message":"Announcement submitted!"}),200

    except Exception as e:
        print(str(e))
        return jsonify({"message":"Announcement could not be submitted!","error":str(e)}),500
    
@app.route("/delete-announcement/<int:announcement_id>", methods=["DELETE"])
@role_required('warden', 'mess', 'admin')
def delete_announcement(announcement_id):

    claims = get_jwt()
    id = claims["id"]

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        DELETE FROM announcements
        WHERE creator_id=%s AND id=%s
        """,
        (id, announcement_id)
    )

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message": "Announcement deleted"}), 200

@app.route("/submit-complaint", methods=["POST"])
@student_required
def submit_complaint():

    data = request.json
    description = data.get("description", "")
    complaint_type = data.get("type", "other")
    room = int(data.get("room", 0))
    roll_no = int(data.get("roll_no", 0))
    priority = data.get("priority", "")

    if not room or not roll_no:
        return jsonify({"message":"Room and Roll No. are required."}), 400

    if len(description) < 10 or len(description) > 300:
        return jsonify({"message": "Description must be between 10 and 300 characters."}), 400

    try:

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO complaints
            (roll_no, room, type, description, priority)
            VALUES (%s,%s,%s,%s,%s)
            """,
            (roll_no, room, complaint_type, description, priority)
        )

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({"message":"Complaint submitted!"}),200

    except Exception as e:
        return jsonify({"message":"Complaint could not be submitted!","error":str(e)}),500

@app.route("/get-user-complaints", methods=["GET"])
@student_required
def get_user_complaints():

    try:

        claims = get_jwt()
        roll_no = claims["roll_no"]

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                c.id,
                c.type,
                c.description,
                c.priority,
                c.status,
                c.datetime,
                c.note,
                u.name,
                u.room
            FROM complaints c
            LEFT JOIN users u ON c.roll_no = u.roll_no
            WHERE c.roll_no = %s
            ORDER BY
                FIELD(c.priority,'high','medium','low'),
                c.datetime DESC
            """,
            (roll_no,)
        )

        complaints = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify(complaints), 200

    except Exception as e:

        print(str(e))

        return jsonify({
            "message": "Could not fetch complaints",
            "error": str(e)
        }), 500
    
@app.route("/get-complaints", methods=["GET"])
@warden_required
def get_complaints():

    try:

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                c.id,
                c.type,
                c.description,
                c.priority,
                c.status,
                c.datetime,
                c.note,
                u.name,
                u.roll_no,
                u.room
            FROM complaints c
            LEFT JOIN users u ON c.roll_no = u.roll_no
            ORDER BY
                FIELD(c.priority,'high','medium','low'),
                c.datetime DESC
            """
        )

        complaints = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify(complaints), 200

    except Exception as e:

        print(str(e))

        return jsonify({
            "message": "Could not fetch complaints",
            "error": str(e)
        }), 500

@app.route("/delete-complaint/<int:complaint_id>", methods=["DELETE"])
@student_required
def delete_complaint(complaint_id):

    claims = get_jwt()
    roll_no = claims["roll_no"]

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        DELETE FROM complaints
        WHERE id=%s AND roll_no=%s AND status='pending'
        """,
        (complaint_id, roll_no)
    )

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message": "Complaint deleted"}), 200

@app.route("/apply-for-leave", methods=["POST"])
@student_required
def apply_for_leave():

    data = request.json
    description = data.get("description", "")
    roll_no = int(data.get("roll_no", 0))
    start_date = data.get("start_date", "")
    end_date = data.get("end_date", "")

    if not roll_no:
        return jsonify({"message":"Roll No. is required."}), 400

    if len(description) < 10 or len(description) > 300:
        return jsonify({"message": "Description must be between 10 and 300 characters."}), 400
    

    try:

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT value FROM system_config
            WHERE config_key = 'max_leave_days'
            """
        )

        max_duration = int(cursor.fetchone()[0])

        if abs(datetime.strptime(start_date, "%Y-%m-%d").date() - datetime.strptime(end_date, "%Y-%m-%d").date()).days > max_duration:
            cursor.close()
            conn.close()
            return jsonify({"message": f"Leave duration cannot be longer than {max_duration} days!"}), 201

        cursor.execute(
            """
            SELECT value FROM system_config
            WHERE config_key = 'min_leave_notice'
            """
        )

        notice = int(cursor.fetchone()[0])

        if abs(datetime.strptime(start_date, "%Y-%m-%d").date() - date.today()).days < notice:
            cursor.close()
            conn.close()
            return jsonify({"message": f"{notice} days of notice is required!"}), 201

        cursor.execute(
            """
            SELECT id FROM leaves
            WHERE roll_no=%s AND status='pending'
            """,
            (roll_no,)
        )

        res = cursor.fetchone()

        if(res):
            cursor.close()
            conn.close()
            return jsonify({"message":"Pending leave application!"}),409

        cursor.execute(
            """
            INSERT INTO leaves
            (roll_no, description, start_date, end_date, applied_date)
            VALUES (%s,%s,%s,%s,%s)
            """,
            (roll_no, description, start_date, end_date, date.today())
        )

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({"message":"Leave submitted!"}),200

    except Exception as e:
        print(str(e))
        return jsonify({"message":"Leave could not be submitted!","error":str(e)}),500

@app.route("/get-user-leaves", methods=["GET"])
@student_required
def get_user_leaves():

    try:

        claims = get_jwt()
        roll_no = claims["roll_no"]

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                l.id,
                l.description,
                l.status,
                l.start_date,
                l.end_date,
                l.applied_date,
                l.note,
                u.name,
                u.room
            FROM leaves l
            LEFT JOIN users u ON l.roll_no = u.roll_no
            WHERE l.roll_no = %s
            ORDER BY
                l.applied_date DESC
            """,
            (roll_no,)
        )

        leaves = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify(leaves), 200

    except Exception as e:

        print(str(e))

        return jsonify({
            "message": "Could not fetch leaves",
            "error": str(e)
        }), 500
    
@app.route("/get-leaves", methods=["GET"])
@warden_required
def get_leaves():

    try:


        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                l.id,
                l.description,
                l.status,
                l.start_date,
                l.end_date,
                l.applied_date,
                l.note,
                l.roll_no,
                u.name,
                u.room
            FROM leaves l
            LEFT JOIN users u ON l.roll_no = u.roll_no
            ORDER BY
                l.start_date
            """
        )

        leaves = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify(leaves), 200

    except Exception as e:

        print(str(e))

        return jsonify({
            "message": "Could not fetch leaves",
            "error": str(e)
        }), 500
    
@app.route("/cancel-leave/<int:leave_id>", methods=["DELETE"])
@student_required
def cancel_leave(leave_id):

    claims = get_jwt()
    roll_no = claims["roll_no"]

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        DELETE FROM leaves
        WHERE id=%s AND roll_no=%s AND status='pending'
        """,
        (leave_id, roll_no)
    )

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message":"Leave cancelled"}),200

@app.route("/share-mess-feedback", methods=["POST"])
@student_required
def share_mess_feedback():

    data = request.json
    description = data.get("description", "")
    roll_no = int(data.get("roll_no", 0))
    meal_date = data.get("date", "")
    meal_time = data.get("meal_time", "")

    if not roll_no:
        return jsonify({"message":"Roll No. is required."}), 400

    if len(description) < 10 or len(description) > 300:
        return jsonify({"message": "Description must be between 10 and 300 characters."}), 400

    try:

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO feedback
            (roll_no, description, date, meal_time)
            VALUES (%s,%s,%s,%s)
            """,
            (roll_no, description, meal_date, meal_time)
        )

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({"message":"Feedback submitted!"}),200

    except Exception as e:
        print(str(e))
        return jsonify({"message":"Feedback could not be submitted!","error":str(e)}),500
    
@app.route('/get-mess-feedback', methods=["GET"])
@mess_required
def get_mess_feedback():
    try:
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)

        cur.execute(
            """
            SELECT * FROM feedback
            ORDER BY date DESC
            """
        )

        res = cur.fetchall()

        cur.close()
        conn.close()

        return jsonify({"success": True, "data": res})

    except Exception as e:
        print(str(e))
        return jsonify({"success": False, "error": str(e)})



@app.route("/get-mess-menu", methods=["GET"])
@jwt_required()
def get_mess_menu():
    try:
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)

        cur.execute("""
        SELECT * FROM mess_menu
        ORDER BY FIELD(day,
        'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')
        """)

        r = cur.fetchall()

        cur.close()
        conn.close()

        return jsonify({"success": True, "data": r})

    except Exception as e:
        print(str(e))
        return jsonify({"success": False, "error": str(e)})
    
@app.route("/update-menu-item", methods=["POST"])
@mess_required
def update_menu_item():
    data = request.json
    day = data.get("day", "")
    meal_time = data.get("meal_time", "")
    value = data.get("value", "")

    if meal_time not in ("breakfast", "lunch", "snacks", "dinner") or not day:
        return jsonify({"success": False, "message": "Invalid request data"}), 400

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            f"UPDATE mess_menu SET {meal_time} = %s WHERE day = %s",
            (value, day)
        )

        conn.commit()

        cur.execute("SELECT id, email FROM users")
        users = cur.fetchall()

        for u in users:
            settings = get_user_settings(u[0])
            if settings and can_send_email(settings, "menu"):
                send_email(u[1], "Menu Updated", f"{day} {meal_time} updated to {value}")

        cur.close()
        conn.close()

        return jsonify({"success": True, "message": "Menu item updated"})

    except Exception as e:
        print(str(e))
        return jsonify({"success": False, "message": "Could not update menu item"}), 500

@app.route("/update-day-menu", methods=["POST"])
@mess_required
def update_day_menu():
    data = request.json
    day = data.get("day", "")
    breakfast = data.get("breakfast", "")
    lunch = data.get("lunch", "")
    snacks = data.get("snacks", "")
    dinner = data.get("dinner", "")

    if not day:
        return jsonify({"success": False, "message": "Invalid request data"}), 400

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE mess_menu
            SET breakfast = %s,
                lunch = %s,
                snacks = %s,
                dinner = %s
            WHERE day = %s
            """,
            (breakfast, lunch, snacks, dinner, day)
        )
        conn.commit()

        cur.execute("SELECT id, email FROM users")
        users = cur.fetchall()

        for u in users:
            settings = get_user_settings(u[0])
            if settings and can_send_email(settings, "menu"):
                send_email(u[1], "Menu Updated", f"{day} full menu updated")

        cur.close()
        conn.close()

        return jsonify({"success": True, "message": "Day menu updated"})
    except Exception as e:
        print(str(e))
        return jsonify({"success": False, "message": "Could not update day menu", "error": str(e)}), 500

@app.route("/update-time-menu", methods=["POST"])
@mess_required
def update_time_menu():
    data = request.json
    meal_time = data.get("meal_time", "")
    menu = data.get("menu", {})

    if meal_time not in ("breakfast", "lunch", "snacks", "dinner") or not isinstance(menu, dict):
        return jsonify({"success": False, "message": "Invalid request data"}), 400

    allowed_days = [
        'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'
    ]

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        for day, value in menu.items():
            if day not in allowed_days:
                continue
            cur.execute(
                f"""
                UPDATE mess_menu
                SET {meal_time} = %s
                WHERE day = %s
                """,
                (value, day)
            )
        conn.commit()

        cur.execute("SELECT id, email FROM users")
        users = cur.fetchall()

        for u in users:
            settings = get_user_settings(u[0])
            if settings and can_send_email(settings, "menu"):
                send_email(u[1], "Menu Updated", f"{meal_time} updated for multiple days")

        cur.close()
        conn.close()

        return jsonify({"success": True, "message": "Time menu updated"})
    except Exception as e:
        print(str(e))
        return jsonify({"success": False, "message": "Could not update time menu", "error": str(e)}), 500

@app.route("/request-meal", methods=["POST"])
@student_required
def request_meal():

    data = request.json
    reason = data.get("reason", "")
    roll_no = int(data.get("roll_no", 0))
    meal_time = data.get("meal_time", "")
    day = data.get("day", "")
    date = data.get("date", "")
    reoccurring = data.get("reoccurring", False)

    if not roll_no:
        return jsonify({"message":"Roll No. is required."}), 400

    if len(reason) < 10 or len(reason) > 300:
        return jsonify({"message": "Reason must be between 10 and 300 characters."}), 400

    try:

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT value FROM system_config
            WHERE config_key = 'max_active_meal_requests'
            """
        )

        max_requests = int(cursor.fetchone()[0])

        cursor.execute(
            """
            SELECT count(*) FROM meal_requests
            WHERE roll_no = %s AND status = 'pending'
            """,
            (roll_no,)
        )

        count = int(cursor.fetchone()[0])

        if count >= max_requests:
            cursor.close()
            conn.close()
            return jsonify({"message": f"Only {max_requests} requests at a time are allowed!"}), 201

        if reoccurring == '1':
            cursor.execute(
                """
                INSERT INTO meal_requests
                (roll_no, reason, day, meal_time, reoccurring)
                VALUES (%s,%s,%s,%s,%s)
                """,
                (roll_no, reason, day, meal_time, True)
            )
        else:
            cursor.execute(
                """
                INSERT INTO meal_requests
                (roll_no, reason, date, meal_time, reoccurring)
                VALUES (%s,%s,%s,%s,%s)
                """,
                (roll_no, reason, date, meal_time, False)
            ) 

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({"message":"Request submitted!"}),200

    except Exception as e:
        print(str(e))
        return jsonify({"message":"Request could not be submitted!","error":str(e)}),500

@app.route("/get-user-meal-requests", methods=["GET"])
@student_required
def get_user_meal_requests():

    try:

        claims = get_jwt()
        roll_no = claims["roll_no"]

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                m.id,
                m.reason,
                m.status,
                m.created_at,
                m.meal_time,
                m.day,
                m.date,
                m.note,
                u.name,
                u.room
            FROM meal_requests m
            LEFT JOIN users u ON m.roll_no = u.roll_no
            WHERE m.roll_no = %s
            ORDER BY
                m.created_at DESC
            """,
            (roll_no,)
        )

        requests = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify(requests), 200

    except Exception as e:

        print(str(e))

        return jsonify({
            "message": "Could not fetch requests",
            "error": str(e)
        }), 500
    
@app.route("/get-meal-requests", methods=["GET"])
@mess_required
def get_meal_requests():

    try:

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                m.id,
                m.reason,
                m.status,
                m.created_at,
                m.meal_time,
                m.day,
                m.date,
                m.note,
                u.name,
                u.roll_no,
                u.room
            FROM meal_requests m
            LEFT JOIN users u ON m.roll_no = u.roll_no
            ORDER BY
                m.created_at DESC
            """
        )

        requests = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify(requests), 200

    except Exception as e:

        print(str(e))

        return jsonify({
            "message": "Could not fetch requests",
            "error": str(e)
        }), 500

@app.route("/cancel-meal-request/<int:request_id>", methods=["DELETE"])
@student_required
def cancel__meal_request(request_id):

    claims = get_jwt()
    roll_no = claims["roll_no"]

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        DELETE FROM meal_requests
        WHERE id=%s AND roll_no=%s AND status='pending'
        """,
        (request_id, roll_no)
    )

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message": "Request cancelled"}), 200

@app.route("/request-room-change", methods=["POST"])
@student_required
def request_room_change():

    data = request.json
    reason = data.get("reason", "")
    roll_no = int(data.get("roll_no", 0))
    room = int(data.get("room", 0))
    try:
        new_room = int(data.get("new_room", 0))
    except:
        new_room = 0

    if not roll_no or not room:
        return jsonify({"message":"Roll No. and room are required."}), 400

    if len(reason) < 10 or len(reason) > 300:
        return jsonify({"message": "Reason must be between 10 and 300 characters."}), 400

    try:

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT value FROM system_config
            WHERE config_key = 'allow_room_change_requests'
            """
        )

        allow = int(cursor.fetchone()[0])

        if not allow:
            cursor.close()
            conn.close()
            return jsonify({"message": "Room change requests are currently not allowed!"}), 201


        cursor.execute("SELECT id FROM room_change WHERE roll_no=%s AND status='pending'",(roll_no,))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({"message":"User has a pending room change request!"}),409

        if new_room == 0:
            cursor.execute(
                """
                INSERT INTO room_change
                (roll_no, reason, current_room)
                VALUES (%s,%s,%s)
                """,
                (roll_no, reason, room)
            )
        else:
            cursor.execute(
                """
                INSERT INTO room_change
                (roll_no, reason, current_room, new_room)
                VALUES (%s,%s,%s,%s)
                """,
                (roll_no, reason, room, new_room)
            )    

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({"message":"Request submitted!"}),200

    except Exception as e:
        print(str(e))
        return jsonify({"message":"Request could not be submitted!","error":str(e)}),500

@app.route("/get-user-room-change-requests", methods=["GET"])
@student_required
def get_user_room_change_requests():

    try:

        claims = get_jwt()
        roll_no = claims["roll_no"]

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                r.id,
                r.reason,
                r.status,
                r.created_at,
                r.current_room,
                r.new_room,
                r.note,
                u.name,
                u.room
            FROM room_change r
            LEFT JOIN users u ON r.roll_no = u.roll_no
            WHERE r.roll_no = %s
            ORDER BY
                r.created_at DESC
            """,
            (roll_no,)
        )

        requests = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify(requests), 200

    except Exception as e:

        print(str(e))

        return jsonify({
            "message": "Could not fetch requests",
            "error": str(e)
        }), 500

@app.route("/get-room-change-requests", methods=["GET"])
@warden_required
def get_room_change_requests():

    try:

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                r.id,
                r.reason,
                r.status,
                r.created_at,
                r.current_room,
                r.new_room,
                r.note,
                u.name,
                u.roll_no,
                u.room
            FROM room_change r
            LEFT JOIN users u ON r.roll_no = u.roll_no
            ORDER BY
                r.created_at DESC
            """
        )

        requests = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify(requests), 200

    except Exception as e:

        print(str(e))

        return jsonify({
            "message": "Could not fetch requests",
            "error": str(e)
        }), 500

@app.route("/cancel-room-change-request/<int:request_id>", methods=["DELETE"])
@student_required
def cancel_room_change_request(request_id):

    claims = get_jwt()
    roll_no = claims["roll_no"]

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        DELETE FROM room_change
        WHERE id=%s AND roll_no=%s AND status='pending'
        """,
        (request_id, roll_no)
    )

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message": "Request cancelled"}), 200

@app.route("/update-room-change-status", methods=["POST"])
@warden_required
def update_room_change_status():
    data = request.json
    id = int(data.get("id"))
    status = data.get("status", "")
    note = data.get("note", "")
    new_room = int(data.get("newRoom"))
    note.strip()

    try:

        conn = get_db_connection()
        cursor = conn.cursor()

        if len(note) > 0:
            if new_room:
                cursor.execute(
                    """
                    UPDATE room_change
                    SET status = %s, note = %s, new_room = %s
                    WHERE id = %s
                    """,
                    (status, note, new_room, id)
                )
            else:
                cursor.execute(
                    """
                    UPDATE room_change
                    SET status = %s, note = %s
                    WHERE id = %s
                    """,
                    (status, note, id)
                )
        else:
            if new_room:
                cursor.execute(
                    """
                    UPDATE room_change
                    SET status = %s, new_room = %s
                    WHERE id = %s
                    """,
                    (status, new_room, id)
                )
            else:
                cursor.execute(
                    """
                    UPDATE room_change
                    SET status = %s
                    WHERE id = %s
                    """,
                    (status, id)
                )
        if new_room:
            cursor.execute(
                """
                SELECT roll_no FROM room_change WHERE id = %s
                """,
                (id,)
            )
            roll_no = cursor.fetchone()[0]
            cursor.execute(
                """
                UPDATE users
                SET room = %s
                WHERE roll_no = %s
                """,
                (new_room, roll_no)
            )

        conn.commit()

        cursor.execute("""
            SELECT u.id, u.email 
            FROM users u
            JOIN room_change r ON u.roll_no = r.roll_no
            WHERE r.id = %s
        """, (id,))

        user = cursor.fetchone()

        if user:
            settings = get_user_settings(user[0])
            if settings and can_send_email(settings, "requests"):
                send_email(
                    user[1],
                    "Room Change Update",
                    f"Your room change request has been {status}"
                )

        cursor.close()
        conn.close()

        return jsonify({"message":"Status updated!"}),200

    except Exception as e:
        print(str(e))
        return jsonify({"message":"Status could not be updated!","error":str(e)}),500
    


@app.route("/report-item", methods=["POST"])
@student_required
def report_item():

    name = request.form.get("name")
    description = request.form.get("description")
    image = request.files.get("image")
    roll_no = int(request.form.get("roll_no"))
    date = request.form.get("date")
    contact = request.form.get("contact")
    report_type = request.form.get("item_type")

    url = None

    if image:
        req = cloudinary.uploader.upload(image, folder="lost_found")
        url = req["secure_url"]

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
            INSERT INTO lost_and_found
            (roll_no, description, item_name, image, date, contact, report_type)
            VALUES (%s,%s,%s,%s,%s,%s,%s)
        """,
        (roll_no, description, name, url, date, contact, report_type)
    )
    conn.commit()

    return {"message": "Item reported successfully!"}

@app.route("/get-user-item-reports", methods=["GET"])
@student_required
def get_user_item_reports():

    try:

        claims = get_jwt()
        roll_no = claims["roll_no"]

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                id,
                item_name,
                description,
                image,
                contact,
                report_type,
                status,
                date
            FROM lost_and_found
            WHERE roll_no = %s
            ORDER BY
                date DESC
            """,
            (roll_no,)
        )

        reports = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify(reports), 200

    except Exception as e:

        print(str(e))

        return jsonify({
            "message": "Could not fetch reports",
            "error": str(e)
        }), 500

@app.route("/close-lost-report/<int:request_id>", methods=["PUT"])
@student_required
def close_lost_report(request_id):

    claims = get_jwt()
    roll_no = claims["roll_no"]

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        UPDATE lost_and_found
        SET status='closed'
        WHERE id=%s AND roll_no=%s AND status='open'
        """,
        (request_id, roll_no)
    )

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message": "Report closed"}), 200

@app.route("/claim-found-item/<int:request_id>", methods=["PUT"])
@student_required
def claim_found_item(request_id):

    claims = get_jwt()
    roll_no = claims["roll_no"]

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        UPDATE lost_and_found
        SET status='claimed'
        WHERE id=%s AND roll_no=%s AND status='open'
        """,
        (request_id, roll_no)
    )

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"message": "Item marked as claimed"}), 200



@app.route("/get-facility-timings")
def get_facility_timings():

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM timings ORDER BY facility, day")
    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    for r in rows:
        if r["start_time"]:
            r["start_time"] = str(r["start_time"])
        if r["end_time"]:
            r["end_time"] = str(r["end_time"])

    return {
        "success": True,
        "data": rows
    }

@app.route("/update-facility-timing", methods=["POST"])
@warden_required
def update_facility_timing():

    data = request.json
    id = int(data.get("id"))
    start_time = data.get("start_time", "")
    end_time = data.get("end_time", "")
    is_closed = bool(data.get("is_closed", False))

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        if is_closed:
            cursor.execute(
                """
                UPDATE timings
                SET start_time = NULL, end_time = NULL, is_closed = 1
                WHERE id = %s
                """,
                (id,)
            )
        else:
            cursor.execute(
                """
                UPDATE timings
                SET start_time = %s, end_time = %s, is_closed = 0
                WHERE id = %s
                """,
                (start_time, end_time, id)
            )

        conn.commit()

        cursor.execute("SELECT id, email FROM users")
        users = cursor.fetchall()

        for u in users:
            settings = get_user_settings(u[0])
            if settings and can_send_email(settings, "facility_timings"):
                send_email(u[1], "Facility Timing Updated", "Facility timings have changed")

    except Exception as e:
        print(str(e))
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({
            "message": "Could not update timing",
            "error": str(e)
        }), 500

    cursor.close()
    conn.close()
    return jsonify({"success": True, "message": "Timing updated"}), 200


@app.route("/add-facility-timing", methods=["POST"])
@warden_required
def add_facility_timing():

    data = request.json
    facility = data.get("facility", "").strip()
    schedule = data.get("schedule", {})

    if not facility:
        return jsonify({"message": "Facility name is required"}), 400

    days = [
        'Monday', 'Tuesday', 'Wednesday',
        'Thursday', 'Friday', 'Saturday', 'Sunday'
    ]

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "SELECT 1 FROM timings WHERE facility = %s LIMIT 1",
            (facility,)
        )
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({"message": "Facility already exists"}), 409

        for day in days:
            entry = schedule.get(day, {})
            is_closed = bool(entry.get("is_closed", False))
            if is_closed:
                cursor.execute(
                    "INSERT INTO timings (facility, day, is_closed) VALUES (%s, %s, %s)",
                    (facility, day, True)
                )
            else:
                cursor.execute(
                    "INSERT INTO timings (facility, day, start_time, end_time, is_closed) VALUES (%s, %s, %s, %s, %s)",
                    (
                        facility,
                        day,
                        entry.get("start_time", "09:00"),
                        entry.get("end_time", "17:00"),
                        False
                    )
                )

        conn.commit()
    except Exception as e:
        print(str(e))
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"message": "Could not add facility", "error": str(e)}), 500

    cursor.close()
    conn.close()
    return jsonify({"success": True, "message": "Facility added"}), 200


@app.route("/update-facility-timings", methods=["POST"])
@warden_required
def update_facility_timings():

    data = request.json
    facility_key = data.get("facilityKey", "").strip()
    facility_name = data.get("facilityName", "").strip()
    schedule = data.get("schedule", {})

    if not facility_key or not facility_name:
        return jsonify({"message": "Facility key and name are required"}), 400

    days = [
        'Monday', 'Tuesday', 'Wednesday',
        'Thursday', 'Friday', 'Saturday', 'Sunday'
    ]

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        if facility_key != facility_name:
            cursor.execute(
                "SELECT 1 FROM timings WHERE facility = %s LIMIT 1",
                (facility_name,)
            )
            if cursor.fetchone():
                cursor.close()
                conn.close()
                return jsonify({"message": "Facility name already exists"}), 409

        for day in days:
            entry = schedule.get(day, {})
            is_closed = bool(entry.get("is_closed", False))
            if is_closed:
                cursor.execute(
                    "UPDATE timings SET facility = %s, start_time = NULL, end_time = NULL, is_closed = 1 WHERE facility = %s AND day = %s",
                    (facility_name, facility_key, day)
                )
            else:
                cursor.execute(
                    "UPDATE timings SET facility = %s, start_time = %s, end_time = %s, is_closed = 0 WHERE facility = %s AND day = %s",
                    (
                        facility_name,
                        entry.get("start_time", "09:00"),
                        entry.get("end_time", "17:00"),
                        facility_key,
                        day
                    )
                )

            if cursor.rowcount == 0:
                if is_closed:
                    cursor.execute(
                        "INSERT INTO timings (facility, day, is_closed) VALUES (%s, %s, %s)",
                        (facility_name, day, True)
                    )
                else:
                    cursor.execute(
                        "INSERT INTO timings (facility, day, start_time, end_time, is_closed) VALUES (%s, %s, %s, %s, %s)",
                        (
                            facility_name,
                            day,
                            entry.get("start_time", "09:00"),
                            entry.get("end_time", "17:00"),
                            False
                        )
                    )

        conn.commit()
    except Exception as e:
        print(str(e))
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"message": "Could not update facility", "error": str(e)}), 500

    cursor.close()
    conn.close()
    return jsonify({"success": True, "message": "Facility updated"}), 200


@app.route("/remove-facility-timing/<facility>", methods=["DELETE"])
@warden_required
def remove_facility_timing(facility):

    facility = facility.strip()
    if not facility:
        return jsonify({"message": "Facility name is required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "DELETE FROM timings WHERE facility = %s",
            (facility,)
        )
        conn.commit()
    except Exception as e:
        print(str(e))
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"message": "Could not remove facility", "error": str(e)}), 500

    cursor.close()
    conn.close()
    return jsonify({"success": True, "message": "Facility removed"}), 200


@app.route("/me/db")
@jwt_required()
def me_db():

    user_id = int(get_jwt_identity())

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT id,name,email,roll_no,room,user_type
        FROM users
        WHERE id=%s
        """,
        (user_id,)
    )

    user = cursor.fetchone()

    cursor.close()
    conn.close()

    return jsonify(user)

@app.route("/get-reported-items", methods=["GET"])
@student_required
def get_item_reports():

    try:

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                id,
                item_name,
                description,
                image,
                contact,
                report_type,
                status,
                date
            FROM lost_and_found
            WHERE status='open'
            ORDER BY
                date DESC
            """
        )

        reports = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify(reports), 200

    except Exception as e:

        print(str(e))

        return jsonify({
            "message": "Could not fetch reports",
            "error": str(e)
        }), 500

@app.route("/update-status", methods=["POST"])
@role_required("warden", "mess")
def update_status():
    data = request.json
    table = data.get("table")
    id = int(data.get("id"))
    status = data.get("status", "")
    note = data.get("note", "")
    note.strip()

    try:

        conn = get_db_connection()
        cursor = conn.cursor()

        if len(note) > 0:
            cursor.execute(
                f"""
                UPDATE {table}
                SET status = %s, note = %s
                WHERE id = %s
                """,
                (status, note, id)
            )
        else:
            cursor.execute(
                f"""
                UPDATE {table}
                SET status = %s
                WHERE id = %s
                """,
                (status, id)
            )

        conn.commit()

        cursor.execute(f"SELECT roll_no FROM {table} WHERE id = %s", (id,))
        roll_no = cursor.fetchone()[0]

        cursor.execute("SELECT id, email FROM users WHERE roll_no = %s", (roll_no,))
        user = cursor.fetchone()

        if user:
            settings = get_user_settings(user[0])
            if settings and can_send_email(settings, "requests"):
                send_email(
                    user[1],
                    "Request Status Updated",
                    f"Your {table} request is now {status}"
                )

        cursor.close()
        conn.close()


        return jsonify({"message":"Status updated!"}),200

    except Exception as e:
        print(str(e))
        return jsonify({"message":"Status could not be updated!","error":str(e)}),500
    
@app.route("/get-email-settings", methods=["GET"])
@jwt_required()
def get_email_settings():

    default_settings = {
        "menu": True,
        "requests": True,
        "announcements": {
            "high": True,
            "medium": True,
            "low": False
        },
        "facility_timings": False
    }

    try:
        user_id = int(get_jwt_identity())
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            "SELECT settings FROM user_email_settings WHERE user_id = %s",
            (user_id,)
        )

        row = cursor.fetchone()

        if row and row["settings"]:
            return jsonify(json.loads(row["settings"]))

        cursor.execute(
            "INSERT INTO user_email_settings (user_id, settings) VALUES (%s, %s)",
            (user_id, json.dumps(default_settings))
        )
        conn.commit()

        return jsonify(default_settings)

    except Exception as e:
        print(str(e))
        return jsonify({"message": "Could not fetch settings!"}), 500

@app.route("/update-email-settings", methods=["POST"])
@jwt_required()
def update_email_settings():

    data = request.get_json()

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        user_id = int(get_jwt_identity())

        cursor.execute(
            """
            INSERT INTO user_email_settings (user_id, settings)
            VALUES (%s, %s)
            ON DUPLICATE KEY UPDATE settings = VALUES(settings)
            """,
            (user_id, json.dumps(data))
        )

        conn.commit()

        return jsonify({"message": "Settings updated!"}), 200

    except Exception as e:
        print(str(e))
        return jsonify({"message": "Could not update settings!"}), 500

@app.route("/get-pending-users", methods=["GET"])
@admin_required
def get_pending_users():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT id, name, email, user_type, status, created_at FROM users WHERE status = 'pending'"
    )
    return jsonify(cursor.fetchall())

@app.route("/update-user-status", methods=["POST"])
@admin_required
def update_user_status():

    data = request.json
    user_id = data.get("user_id")
    status = data.get("status")

    if status not in ["approved", "rejected"]:
        return jsonify({"message": "Invalid status"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "UPDATE users SET status = %s WHERE id = %s",
        (status, user_id)
    )

    conn.commit()

    email = get_user_email(user_id)

    if email:
        send_email(
            email,
            "Account Status Update",
            f"Your account has been {status}"
        )

    return jsonify({"message": "User updated"})

@app.after_request
def refresh_expiring_jwts(response):
    if request.path == "/logout":
        return response
    try:
        verify_jwt_in_request(optional=True)

        claims = get_jwt()
        exp_timestamp = claims["exp"]
        now = datetime.now(timezone.utc)
        target_timestamp = datetime.timestamp(now + timedelta(minutes=15))

        if target_timestamp > exp_timestamp:
            new_token = create_access_token(
                identity=get_jwt_identity(),
                additional_claims={
                    "id": claims["id"],        # ← fix 1
                    "name": claims["name"],
                    "role": claims["role"],
                    "email": claims["email"],
                    "room": claims["room"],
                    "roll_no": claims["roll_no"]
                }
            )
            set_access_cookies(response, new_token)

    except (RuntimeError, KeyError, ExpiredSignatureError):
        pass

    return response

def generate_bursty_date():
    """Generates dates with artificial peaks for certain days and hours."""
    now = datetime.now()
    chance = random.random()
    
    # 1. Create bursty days/months (Peaks and Valleys)
    if chance < 0.15:
        # 15% of requests clustered in a single busy week recently
        base_date = now - timedelta(days=10 + random.randint(0, 3))
    elif chance < 0.30:
        # 15% clustered around mid-terms/finals period (e.g., ~150 days ago)
        base_date = now - timedelta(days=150 + random.randint(0, 5))
    elif chance < 0.45:
        # 15% clustered over a year ago
        base_date = now - timedelta(days=400 + random.randint(0, 10))
    else:
        # 55% spread randomly over the last 3 years (1095 days)
        base_date = now - timedelta(days=random.randint(0, 1095))
        
    # 2. Create bursty hours (e.g., lots of requests at 9 AM, 2 PM, and 10 PM)
    hour_chance = random.random()
    if hour_chance < 0.25:
        hour = 22  # 10 PM peak
    elif hour_chance < 0.50:
        hour = 9   # 9 AM peak
    elif hour_chance < 0.70:
        hour = 14  # 2 PM peak
    else:
        hour = random.randint(0, 23) # Random hour
        
    return base_date.replace(hour=hour, minute=random.randint(0, 59), second=random.randint(0, 59))


@app.route("/dev/populate/complaints")
def dev_populate_complaints():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        roll_nos = [3445678, 12345678]
        complaint_types = ["room", "washroom", "cleaning", "laundry", "gym", "other"]
        priorities = ["low", "medium", "high"]
        statuses = ["pending", "in_progress", "resolved", "rejected"]

        cur.execute("DELETE FROM complaints")

        for i in range(400): # Increased to 400
            created_dt = generate_bursty_date()
            
            # Weighted statuses: mostly resolved/rejected for older dates, higher chance of pending for recent
            is_recent = (datetime.now() - created_dt).days < 14
            if is_recent:
                status = random.choices(statuses, weights=[40, 30, 20, 10])[0]
            else:
                status = random.choices(statuses, weights=[5, 5, 70, 20])[0]

            # Determine updated_at
            if status in ['resolved', 'rejected']:
                # Resolved between 1 and 5 days after creation
                updated_dt = created_dt + timedelta(days=random.randint(1, 5), hours=random.randint(1, 12))
                # Cap it at current time if it generated a future date
                updated_dt = min(updated_dt, datetime.now())
                updated_str = updated_dt.strftime('%Y-%m-%d %H:%M:%S')
            else:
                updated_str = None

            cur.execute(
                """
                INSERT INTO complaints
                (roll_no, room, type, description, priority, status, datetime, updated_at, note)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    random.choice(roll_nos),
                    random.randint(100, 499), # More room variation
                    random.choice(complaint_types),
                    f"Test complaint {i} detailing the issue.",
                    random.choice(priorities),
                    status,
                    created_dt.strftime('%Y-%m-%d %H:%M:%S'),
                    updated_str,
                    "dev note" if random.random() > 0.7 else None
                )
            )

        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "Complaints populated with 400 varied records"}), 200

    except Exception as e:
        print(str(e))
        return jsonify({"message": "Failed"}), 500


@app.route("/dev/populate/leaves")
def dev_populate_leaves():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        roll_nos = [3445678, 12345678]
        statuses = ["pending", "approved", "rejected"]

        cur.execute("DELETE FROM leaves")

        for i in range(250): # Increased to 250
            applied_dt = generate_bursty_date()
            # Start date is usually 1 to 14 days after applied date
            start_dt = applied_dt + timedelta(days=random.randint(1, 14))
            # Duration is between 1 and 7 days
            end_dt = start_dt + timedelta(days=random.randint(1, 7))
            
            # Weighted statuses
            status = random.choices(statuses, weights=[15, 70, 15])[0]

            cur.execute(
                """
                INSERT INTO leaves
                (roll_no, start_date, end_date, applied_date, description, status, note)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    random.choice(roll_nos),
                    start_dt.strftime('%Y-%m-%d'),
                    end_dt.strftime('%Y-%m-%d'),
                    applied_dt.strftime('%Y-%m-%d %H:%M:%S'),
                    f"Leave reason generated {i}",
                    status,
                    "Leave admin note" if random.random() > 0.8 else None
                )
            )

        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "Leaves populated with 250 varied records"}), 200

    except Exception as e:
        print(str(e))
        return jsonify({"message": "Failed"}), 500


@app.route("/dev/populate/meals")
def dev_populate_meals():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        roll_nos = [3445678, 12345678]
        meals = ['breakfast', 'lunch', 'snacks', 'dinner']
        statuses = ["pending", "approved", "rejected"]

        cur.execute("DELETE FROM meal_requests")

        for i in range(350): # Increased to 350
            created_dt = generate_bursty_date()
            # Meal is usually requested for 1-3 days in advance
            meal_dt = created_dt + timedelta(days=random.randint(1, 3))
            day_of_week = meal_dt.strftime('%A')
            
            status = random.choices(statuses, weights=[20, 60, 20])[0]

            cur.execute(
                """
                INSERT INTO meal_requests
                (reason, day, roll_no, meal_time, status, date, reoccurring, created_at, note)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    f"Meal request {i} reasoning",
                    day_of_week,
                    random.choice(roll_nos),
                    random.choice(meals),
                    status,
                    meal_dt.strftime('%Y-%m-%d'),
                    random.choice([True, False]), # Randomize reoccurring boolean
                    created_dt.strftime('%Y-%m-%d %H:%M:%S'),
                    "Dietary note" if random.random() > 0.75 else None
                )
            )

        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "Meal requests populated with 350 varied records"}), 200

    except Exception as e:
        print(str(e))
        return jsonify({"message": "Failed"}), 500


@app.route("/dev/populate/room-change")
def dev_populate_room_change():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        roll_nos = [3445678, 12345678]
        statuses = ["pending", "approved", "rejected"]

        cur.execute("DELETE FROM room_change")

        for i in range(150): # Increased to 150
            created_dt = generate_bursty_date()
            current_room = random.randint(100, 399)
            new_room = random.randint(100, 399) if random.random() > 0.5 else None
            status = random.choices(statuses, weights=[30, 40, 30])[0]

            cur.execute(
                """
                INSERT INTO room_change
                (reason, current_room, new_room, roll_no, status, created_at, note)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    f"Room change requested {i}",
                    current_room,
                    new_room,
                    random.choice(roll_nos),
                    status,
                    created_dt.strftime('%Y-%m-%d %H:%M:%S'),
                    "Wants better view" if random.random() > 0.8 else None
                )
            )

        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "Room change populated with 150 varied records"}), 200

    except Exception as e:
        print(str(e))
        return jsonify({"message": "Failed"}), 500

@app.route("/populate-announcements")
def populate_announcements():
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)

    titles = [
        "Water Supply Maintenance",
        "Hostel Gate Timing Update",
        "Electricity Shutdown Notice",
        "Mess Menu Change",
        "WiFi Maintenance",
        "Room Inspection Notice",
        "Fire Drill Announcement",
        "Guest Entry Policy Update",
        "Common Room Renovation",
        "Laundry Service Update"
    ]

    descriptions = [
        "Water supply will be temporarily interrupted for maintenance work.",
        "Hostel gate closing time has been updated for security reasons.",
        "Electricity will be shut down for scheduled maintenance.",
        "The mess menu has been updated for the upcoming week.",
        "WiFi services will be unavailable for a short maintenance window.",
        "Routine room inspections will be conducted by hostel staff.",
        "A fire safety drill will be conducted for all residents.",
        "New guidelines have been issued regarding guest entry.",
        "Renovation work will begin in the common room area.",
        "Laundry service timings have been slightly modified."
    ]

    types = ['general','facilities','mess', 'laundry', 'timings', 'other']

    priorities = ["low", "medium", "high"]

    for i in range(10):

        title = titles[i]
        desc = descriptions[i]
        t = random.choice(types)
        dur = random.randint(1, 7)
        p = random.choice(priorities)

        q = """
        INSERT INTO announcements (title, description, type, duration, priority)
        VALUES (%s, %s, %s, %s, %s)
        """

        cur.execute(q, (title, desc, t, dur, p))

        conn.commit()

    print("10 announcements inserted")

    cur.close()
    conn.close()

    return("announcements added")

@app.route("/populate-mess-menu")
def populate_mess_menu():
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("DELETE FROM mess_menu")

        cur.execute("""
        INSERT INTO mess_menu (day, breakfast, lunch, snacks, dinner) VALUES

        ('Monday',
        'Poha, Boiled Eggs, Bread Butter, Tea',
        'Dal Tadka, Jeera Rice, Roti, Salad, Pickle',
        'Samosa, Green Chutney, Tea',
        'Paneer Butter Masala, Roti, Steamed Rice, Gulab Jamun'),

        ('Tuesday',
        'Idli, Sambar, Coconut Chutney, Tea',
        'Rajma, Steamed Rice, Roti, Salad',
        'Biscuits, Banana, Tea',
        'Aloo Gobi, Dal Fry, Roti, Rice'),

        ('Wednesday',
        'Upma, Bread Butter, Boiled Eggs, Tea',
        'Chole, Jeera Rice, Roti, Onion Salad',
        'Pakoda, Mint Chutney, Tea',
        'Mix Veg Curry, Dal Tadka, Roti, Rice'),

        ('Thursday',
        'Bread Omelette, Butter Toast, Tea',
        'Veg Pulao, Raita, Papad, Salad',
        'Samosa, Ketchup, Tea',
        'Paneer Bhurji, Roti, Dal Fry, Rice'),

        ('Friday',
        'Aloo Paratha, Curd, Pickle, Tea',
        'Dal Makhani, Jeera Rice, Roti, Salad',
        'Tea, Marie Biscuits, Banana',
        'Mix Veg, Dal Tadka, Roti, Rice'),

        ('Saturday',
        'Masala Dosa, Sambar, Coconut Chutney, Tea',
        'Fried Rice, Manchurian, Salad',
        'Veg Cutlet, Ketchup, Tea',
        'Paneer Curry, Roti, Dal Fry, Rice'),

        ('Sunday',
        'Puri, Aloo Bhaji, Jalebi, Tea',
        'Chicken Biryani, Raita, Salad',
        'Samosa, Tea, Biscuits',
        'Butter Chicken, Roti, Jeera Rice, Ice Cream')

        """)

        conn.commit()

        cur.close()
        conn.close()

        return jsonify({"success": True})

    except Exception as e:
        print(str(e))
        return jsonify({"success": False, "error": str(e)})
    
@app.route("/populate-lost-and-found")
def populate_lost_and_found():

    conn = get_db_connection()
    cursor = conn.cursor()

    data = [
        (220101, "Black leather wallet with some cards", "Wallet", "https://images.unsplash.com/photo-1601597111158-2fceff292cdc", "2026-03-10", "9876543210", "lost"),
        (220102, "Blue metal water bottle left near mess", "Bottle", "https://images.unsplash.com/photo-1523362628745-0c100150b504", "2026-03-10", "9123456780", "found"),
        (220103, "Casio scientific calculator", "Calculator", "https://images.unsplash.com/photo-1587145820266-a5951ee6f620", "2026-03-11", "9988776655", "lost"),
        (220104, "Set of keys with red keychain", "Keys", "https://images.unsplash.com/photo-1582139329536-e7284fece509", "2026-03-11", "9012345678", "found"),
        (220105, "Grey hoodie left in study room", "Hoodie", "https://images.unsplash.com/photo-1520975922284-8b456906c813", "2026-03-12", "9090909090", "lost"),
        (220106, "Pair of wireless earbuds in case", "Earbuds", "https://images.unsplash.com/photo-1585386959984-a41552231658", "2026-03-12", "9345678123", "found"),
        (220107, "Spiral notebook with math notes", "Notebook", "https://images.unsplash.com/photo-1531346680769-a1d79b57de5c", "2026-03-13", "9786541230", "lost"),
        (220108, "Black backpack found near hostel gate", "Backpack", "https://images.unsplash.com/photo-1553062407-98eeb64c6a62", "2026-03-13", "9654321876", "found"),
        (220109, "Silver wrist watch", "Watch", "https://images.unsplash.com/photo-1519744346363-dc1b7b6f3c2d", "2026-03-14", "9234567810", "lost"),
        (220110, "Smartphone found in mess hall", "Phone", "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9", "2026-03-14", "9345612789", "found")
    ]

    cursor.executemany(
        """
        INSERT INTO lost_and_found
        (roll_no, description, item_name, image, date, contact, report_type)
        VALUES (%s,%s,%s,%s,%s,%s,%s)
        """,
        data
    )

    conn.commit()
    cursor.close()
    conn.close()

    return {"message": "10 lost & found items inserted"}

@app.route("/populate-facility-timings")
def populate_facility_timings():

    conn = get_db_connection()
    cursor = conn.cursor()

    data = [
        ("Gym","Monday","06:00","10:00",0),
        ("Gym","Tuesday","06:00","10:00",0),
        ("Gym","Wednesday","06:00","10:00",0),
        ("Gym","Thursday","06:00","10:00",0),
        ("Gym","Friday","06:00","10:00",0),
        ("Gym","Saturday","07:00","12:00",0),
        ("Gym","Sunday",None,None,1),

        ("Mess","Monday","07:00","21:00",0),
        ("Mess","Tuesday","07:00","21:00",0),
        ("Mess","Wednesday","07:00","21:00",0),
        ("Mess","Thursday","07:00","21:00",0),
        ("Mess","Friday","07:00","21:00",0),
        ("Mess","Saturday","07:00","21:00",0),
        ("Mess","Sunday","07:00","21:00",0),

        ("Common Room","Monday","10:00","22:00",0),
        ("Common Room","Tuesday","10:00","22:00",0),
        ("Common Room","Wednesday","10:00","22:00",0),
        ("Common Room","Thursday","10:00","22:00",0),
        ("Common Room","Friday","10:00","23:00",0),
        ("Common Room","Saturday","10:00","23:00",0),
        ("Common Room","Sunday","10:00","22:00",0),

        ("Convenience Store","Monday","09:00","20:00",0),
        ("Convenience Store","Tuesday","09:00","20:00",0),
        ("Convenience Store","Wednesday","09:00","20:00",0),
        ("Convenience Store","Thursday","09:00","20:00",0),
        ("Convenience Store","Friday","09:00","21:00",0),
        ("Convenience Store","Saturday","10:00","18:00",0),
        ("Convenience Store","Sunday",None,None,1)
    ]

    cursor.executemany(
        """
        INSERT INTO timings
        (facility, day, start_time, end_time, is_closed)
        VALUES (%s,%s,%s,%s,%s)
        """,
        data
    )

    conn.commit()
    cursor.close()
    conn.close()

    return {"message": "Facility timings added"}

# ==================== ANALYTICS ENDPOINTS ====================

@app.route("/analytics-overview", methods=["GET"])
@admin_required
def analytics_overview():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT COUNT(*) as c FROM users WHERE user_type='student'")
        total_students = cursor.fetchone()["c"]

        cursor.execute("SELECT COUNT(*) as c FROM users WHERE user_type='warden'")
        total_wardens = cursor.fetchone()["c"]

        cursor.execute("SELECT COUNT(*) as c FROM users WHERE user_type='mess'")
        total_mess = cursor.fetchone()["c"]

        cursor.execute("""
            SELECT COUNT(*) as c 
            FROM complaints 
            WHERE status IN ('pending','in_progress')
        """)
        active_complaints = cursor.fetchone()["c"]

        cursor.execute("SELECT COUNT(*) as c FROM leaves WHERE status='pending'")
        pending_leaves = cursor.fetchone()["c"]

        cursor.execute("SELECT COUNT(*) as c FROM meal_requests WHERE status='pending'")
        pending_meals = cursor.fetchone()["c"]

        cursor.execute("SELECT COUNT(*) as c FROM room_change WHERE status='pending'")
        pending_rooms = cursor.fetchone()["c"]

        cursor.execute("""
            SELECT AVG(t) as avg_time FROM (
                SELECT TIMESTAMPDIFF(HOUR, datetime, updated_at) as t FROM complaints WHERE status IN ('resolved','rejected')
                UNION ALL
                SELECT TIMESTAMPDIFF(HOUR, applied_date, updated_at) FROM leaves WHERE status IN ('approved','rejected')
                UNION ALL
                SELECT TIMESTAMPDIFF(HOUR, created_at, updated_at) FROM meal_requests WHERE status IN ('approved','rejected')
                UNION ALL
                SELECT TIMESTAMPDIFF(HOUR, created_at, updated_at) FROM room_change WHERE status IN ('approved','rejected')
            ) x
        """)
        avg_time = cursor.fetchone()["avg_time"] or 0

        cursor.close()
        conn.close()

        return jsonify({
            "total_students": total_students,
            "total_wardens": total_wardens,
            "total_mess_incharges": total_mess,
            "active_complaints": active_complaints,
            "pending_leaves": pending_leaves,
            "pending_meal_requests": pending_meals,
            "pending_room_changes": pending_rooms,
            "avg_resolution_hours": round(avg_time, 1)
        })

    except Exception as e:
        print(str(e))
        return jsonify({"message":"Failed overview"}),500

def get_trend(cursor, table, date_col, status_col, period, status_filter):
    if period == "year":
        fmt = "%Y-%m"
    elif period == "month":
        fmt = "%Y-%m-%d"
    else:
        fmt = "%H"

    q = f"""
        SELECT DATE_FORMAT({date_col}, '{fmt}') p, COUNT(*) c
        FROM {table}
    """

    cond = []
    vals = []

    if status_filter != "all":
        cond.append(f"{status_col}=%s")
        vals.append(status_filter)

    if cond:
        q += " WHERE " + " AND ".join(cond)

    q += f" GROUP BY p ORDER BY p"

    cursor.execute(q, vals)
    return cursor.fetchall()

def get_time_group(level):
    if level == "year":
        return "%Y-%m", "MONTH"
    elif level == "month":
        return "%Y-%m-%d", "DAY"
    else:
        return "%Y-%m-%d %H:00", "HOUR"

@app.route("/analytics-complaints", methods=["GET"])
@admin_required
def complaints_analytics():
    try:
        period = request.args.get("period", "month")
        date_val = request.args.get("date")
        status = request.args.get("status", "all")
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        where = "WHERE 1=1"
        fmt = "%Y-%m-%d" # fallback
        
        if period == "year" and date_val:
            where += f" AND YEAR(datetime) = '{date_val}'"
            fmt = "%Y-%m"  # Group by month
        elif period == "month" and date_val:
            where += f" AND DATE_FORMAT(datetime, '%Y-%m') = '{date_val}'"
            fmt = "%Y-%m-%d" # Group by day
        elif period == "day" and date_val:
            where += f" AND DATE(datetime) = '{date_val}'"
            fmt = "%H:00" # Group by hour
            
        if status != "all":
            where += f" AND status = '{status}'"
            
        cursor.execute(f"SELECT COUNT(*) as c FROM complaints {where}")
        total = cursor.fetchone()["c"]
        
        cursor.execute(f"SELECT COUNT(*) as c FROM complaints {where} AND status='pending'")
        pending = cursor.fetchone()["c"]
        
        cursor.execute(f"SELECT COUNT(*) as c FROM complaints {where} AND status='in_progress'")
        in_progress = cursor.fetchone()["c"]
        
        cursor.execute(f"""
            SELECT DATE_FORMAT(datetime, '{fmt}') as t, COUNT(*) as c
            FROM complaints
            {where}
            GROUP BY t
            ORDER BY t
        """)
        trend = cursor.fetchall()
        
        # Get raw data for 'View All' Modal
        cursor.execute(f"SELECT * FROM complaints {where} ORDER BY datetime DESC LIMIT 100")
        all_records = cursor.fetchall()

        cursor.close()
        conn.close()
        
        return jsonify({
            "total": total,
            "pending": pending,
            "progress": in_progress,
            "trend": trend,
            "all": all_records
        })
        
    except Exception as e:
        print(str(e))
        return jsonify({"message":"Failed complaints analytics"}), 500


@app.route("/analytics-leaves", methods=["GET"])
@admin_required
def leaves_analytics():
    try:
        period = request.args.get("period", "month")
        date_val = request.args.get("date")
        status = request.args.get("status", "all")
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        where = "WHERE 1=1"
        fmt = "%Y-%m-%d"
        
        if period == "year" and date_val:
            where += f" AND YEAR(applied_date) = '{date_val}'"
            fmt = "%Y-%m"
        elif period == "month" and date_val:
            where += f" AND DATE_FORMAT(applied_date, '%Y-%m') = '{date_val}'"
            fmt = "%Y-%m-%d"
        elif period == "day" and date_val:
            where += f" AND DATE(applied_date) = '{date_val}'"
            fmt = "%H:00"
            
        if status != "all":
            where += f" AND status = '{status}'"
            
        cursor.execute(f"SELECT COUNT(*) as c FROM leaves {where}")
        total = cursor.fetchone()["c"]
        
        cursor.execute(f"SELECT COUNT(*) as c FROM leaves {where} AND status='pending'")
        pending = cursor.fetchone()["c"]
        
        cursor.execute(f"""
            SELECT DATE_FORMAT(applied_date, '{fmt}') as t, COUNT(*) as c
            FROM leaves
            {where}
            GROUP BY t
            ORDER BY t
        """)
        trend = cursor.fetchall()
        
        cursor.execute(f"SELECT * FROM leaves {where} ORDER BY applied_date DESC LIMIT 100")
        all_records = cursor.fetchall()

        cursor.close()
        conn.close()
        
        return jsonify({
            "total": total,
            "pending": pending,
            "trend": trend,
            "all": all_records
        })
        
    except Exception as e:
        print(str(e))
        return jsonify({"message":"Failed leaves analytics"}), 500


@app.route("/analytics-room-change", methods=["GET"])
@admin_required
def room_change_analytics():
    try:
        period = request.args.get("period", "month")
        date_val = request.args.get("date")
        status = request.args.get("status", "all")
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        where = "WHERE 1=1"
        fmt = "%Y-%m-%d"
        
        if period == "year" and date_val:
            where += f" AND YEAR(created_at) = '{date_val}'"
            fmt = "%Y-%m"
        elif period == "month" and date_val:
            where += f" AND DATE_FORMAT(created_at, '%Y-%m') = '{date_val}'"
            fmt = "%Y-%m-%d"
        elif period == "day" and date_val:
            where += f" AND DATE(created_at) = '{date_val}'"
            fmt = "%H:00"
            
        if status != "all":
            where += f" AND status = '{status}'"
            
        cursor.execute(f"SELECT COUNT(*) as c FROM room_change {where}")
        total = cursor.fetchone()["c"]
        
        cursor.execute(f"SELECT COUNT(*) as c FROM room_change {where} AND status='pending'")
        pending = cursor.fetchone()["c"]
        
        cursor.execute(f"""
            SELECT DATE_FORMAT(created_at, '{fmt}') as t, COUNT(*) as c
            FROM room_change
            {where}
            GROUP BY t
            ORDER BY t
        """)
        trend = cursor.fetchall()
        
        cursor.execute(f"SELECT * FROM room_change {where} ORDER BY created_at DESC LIMIT 100")
        all_records = cursor.fetchall()

        cursor.close()
        conn.close()
        
        return jsonify({
            "total": total,
            "pending": pending,
            "trend": trend,
            "all": all_records
        })
        
    except Exception as e:
        print(str(e))
        return jsonify({"message":"Failed room analytics"}), 500
    
    
@app.route("/analytics-meal-requests", methods=["GET"])
@admin_required
def meals_analytics():
    try:
        period = request.args.get("period", "month")
        date_val = request.args.get("date")
        status = request.args.get("status", "all")
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        where = "WHERE 1=1"
        fmt = "%Y-%m-%d"
        
        if period == "year" and date_val:
            where += f" AND YEAR(created_at) = '{date_val}'"
            fmt = "%Y-%m"
        elif period == "month" and date_val:
            where += f" AND DATE_FORMAT(created_at, '%Y-%m') = '{date_val}'"
            fmt = "%Y-%m-%d"
        elif period == "day" and date_val:
            where += f" AND DATE(created_at) = '{date_val}'"
            fmt = "%H:00"
            
        if status != "all":
            where += f" AND status = '{status}'"
            
        cursor.execute(f"SELECT COUNT(*) as c FROM meal_requests {where}")
        total = cursor.fetchone()["c"]
        
        cursor.execute(f"SELECT COUNT(*) as c FROM meal_requests {where} AND status='pending'")
        pending = cursor.fetchone()["c"]
        
        cursor.execute(f"""
            SELECT DATE_FORMAT(created_at, '{fmt}') as t, COUNT(*) as c
            FROM meal_requests
            {where}
            GROUP BY t
            ORDER BY t
        """)
        trend = cursor.fetchall()
        
        cursor.execute(f"SELECT * FROM meal_requests {where} ORDER BY created_at DESC LIMIT 100")
        all_records = cursor.fetchall()

        cursor.close()
        conn.close()
        
        return jsonify({
            "total": total,
            "pending": pending,
            "trend": trend,
            "all": all_records
        })
        
    except Exception as e:
        print(str(e))
        return jsonify({"message":"Failed meal analytics"}), 500

@app.route("/")
def home():
    return jsonify({"message": "Backend is running"})

if __name__ == "__main__":
    app.run(host="0.0.0.0",debug=True,port=app.config['PORT'])