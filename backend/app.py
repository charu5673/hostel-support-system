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

            if user_role not in roles:
                return jsonify({"message": "Access forbidden"}), 403

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
    
def add_to_updates_history(table, user_id, entry_id, action):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO updates_history
            (table, user_id, entry_id, action_type)
            VALUES (%s, %s, %s, %s)
            """,
            (table, user_id, entry_id, action)
        )
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        print(str(e))


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

        if user_type == "student":

            cursor.execute(
                """
                INSERT INTO users
                (name,email,password,is_verified,user_type,room,roll_no)
                VALUES (%s,%s,%s,%s,%s,%s,%s)
                """,
                (name,email,password_hash,False,user_type,room,roll_no)
            )

        else:

            cursor.execute(
                """
                INSERT INTO users
                (name,email,password,is_verified,user_type)
                VALUES (%s,%s,%s,%s,%s)
                """,
                (name,email,password_hash,False,user_type)
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

        cursor.execute(
            """
            SELECT id FROM users
            WHERE email=%s
            """,
            (email,)
        )
        user_id = cursor.fetchone()

        cursor.close()
        conn.close()

        add_to_updates_history('signup', user_id, user_id, 'signup')

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
@role_required("warden", "mess")
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
@role_required("warden", "mess")
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

        cursor.close()
        conn.close()


        return jsonify({"message":"Announcement submitted!"}),200

    except Exception as e:
        print(str(e))
        return jsonify({"message":"Announcement could not be submitted!","error":str(e)}),500
    
@app.route("/delete-announcement/<int:announcement_id>", methods=["DELETE"])
@role_required('warden', 'mess')
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

        print(roll_no)

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
            f"""
            UPDATE mess_menu
            SET {meal_time} = %s
            WHERE day = %s
            """,
            (value, day)
        )
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"success": True, "message": "Menu item updated"})
    except Exception as e:
        print(str(e))
        return jsonify({"success": False, "message": "Could not update menu item", "error": str(e)}), 500

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
    print(day)
    date = data.get("date", "")
    print(date)
    reoccurring = data.get("reoccurring", False)
    print(reoccurring)

    if not roll_no:
        return jsonify({"message":"Roll No. is required."}), 400

    if len(reason) < 10 or len(reason) > 300:
        return jsonify({"message": "Reason must be between 10 and 300 characters."}), 400

    try:

        conn = get_db_connection()
        cursor = conn.cursor()

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
                    (status, note, id, new_room)
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

        cursor.close()
        conn.close()

        return jsonify({"message":"Status updated!"}),200

    except Exception as e:
        print(str(e))
        return jsonify({"message":"Status could not be updated!","error":str(e)}),500
    


@app.after_request
def refresh_expiring_jwts(response):
    try:
        verify_jwt_in_request(optional=True)

        exp_timestamp = get_jwt()["exp"]
        now = datetime.now(timezone.utc)

        target_timestamp = datetime.timestamp(now + timedelta(minutes=15))

        if target_timestamp > exp_timestamp:

            identity = get_jwt_identity()

            claims = get_jwt()
            new_token = create_access_token(
                identity=identity,
                additional_claims={
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

@app.route("/")
def home():
    return jsonify({"message": "Backend is running"})

if __name__ == "__main__":
    app.run(host="0.0.0.0",debug=True,port=app.config['PORT'])