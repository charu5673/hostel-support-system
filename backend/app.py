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
    return role_required("mess_incharge")(fn)


# ---------------------------


@app.route("/")
def home():
    return jsonify({"message": "Backend is running"})


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


@app.route("/signup", methods=["POST"])
def signup():

    data = request.json
    email = data.get("email","").strip()
    name = data.get("name",email).strip()
    password = data.get("password","").strip()
    user_type = data.get("user_type","student")
    room = int(data.get("room",0))
    print(room)
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

        cursor.close()
        conn.close()

        return jsonify({"message":"Verification email sent"}),201

    except Exception as e:
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
            "name": user["name"],
            "role": user["user_type"],
            "email": user["email"],
            "room": user["room"],
            "roll_no": user["roll_no"]
        }
    )

    cursor.close()
    conn.close()

    response = jsonify({"message":"Login successful"})
    set_access_cookies(response,access_token)

    return response


@app.route("/logout",methods=["POST"])
def logout():

    response = jsonify({"message":"Logged out"})
    unset_jwt_cookies(response)

    return response


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

@app.route("/announcements", methods=["GET"])
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
                id,
                type,
                description,
                priority,
                status,
                datetime
            FROM complaints
            WHERE roll_no = %s
            ORDER BY
                FIELD(priority,'high','medium','low'),
                datetime DESC
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
                id,
                description,
                status,
                start_date,
                end_date,
                applied_date
            FROM leaves
            WHERE roll_no = %s
            ORDER BY
                applied_date DESC
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

@app.route("/meal-request", methods=["POST"])
@student_required
def meal_request():

    data = request.json
    reason = data.get("reason", "")
    roll_no = int(data.get("roll_no", 0))
    meal_time = data.get("meal_time", "")
    day = data.get("day", "")

    if not roll_no:
        return jsonify({"message":"Roll No. is required."}), 400

    if len(reason) < 10 or len(reason) > 300:
        return jsonify({"message": "Reason must be between 10 and 300 characters."}), 400

    try:

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO meal_requests
            (roll_no, reason, day, meal_time)
            VALUES (%s,%s,%s,%s)
            """,
            (roll_no, reason, day, meal_time)
        )

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({"message":"Request submitted!"}),200

    except Exception as e:
        print(str(e))
        return jsonify({"message":"Request could not be submitted!","error":str(e)}),500

@app.route("/get-user-requests", methods=["GET"])
@student_required
def get_user_requests():

    try:

        claims = get_jwt()
        roll_no = claims["roll_no"]

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                id,
                reason,
                status,
                created_at,
                meal_time,
                day
            FROM meal_requests
            WHERE roll_no = %s
            ORDER BY
                created_at DESC
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

    types = ["general", "maintenance", "event", "notice"]

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

if __name__ == "__main__":
    app.run(host="0.0.0.0",debug=True,port=app.config['PORT'])