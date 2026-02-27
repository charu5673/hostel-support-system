from flask import Flask,request, jsonify
from flask_cors import CORS
from flask_mail import Mail, Message
import mysql.connector
import os
from dotenv import load_dotenv
from itsdangerous import URLSafeTimedSerializer
from werkzeug.security import generate_password_hash, check_password_hash

load_dotenv()

app = Flask(__name__)
CORS(app)

app.config['SECRET_KEY'] = os.getenv("SECRET_KEY", "dev-secret-key")
app.config['PORT'] = int(os.getenv("FLASK_PORT", 5000))

# Mail config
app.config['MAIL_SERVER'] = os.getenv("MAIL_SERVER", "smtp.gmail.com")
app.config['MAIL_PORT'] = int(os.getenv("MAIL_PORT", 587))
app.config['MAIL_USE_TLS'] = os.getenv("MAIL_USE_TLS", "True").lower() == "true"
app.config['MAIL_USERNAME'] = os.getenv("MAIL_USERNAME")
app.config['MAIL_PASSWORD'] = os.getenv("MAIL_PASSWORD")

mail = Mail(app)
serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'])

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
    email = data.get("email", "").strip() if data else ""
    password = data.get("password", "").strip() if data else ""
    user_type = data.get("user_type", "").strip() if data else "Student"

    print(user_type)
    print(type(user_type))

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    password_hash = generate_password_hash(password)

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        print('got here 1')

        allowed_domains = get_allowed_domains(cursor)

        print('got here 2')
        
        if not is_email_allowed(email, allowed_domains):
            cursor.close()
            conn.close()
            return jsonify({
                "message": "Email domain not allowed"
            }), 403

        print('got here 3')

        cursor.execute("SELECT id FROM users WHERE email=%s", (email,))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({"message": "User already exists"}), 409

        print('got here 4')

        cursor.execute(
            "INSERT INTO users (email, password, is_verified, user_type) VALUES (%s, %s, %s, %s)",
            (email, password_hash, False, user_type)
        )

        print('got here 5')
        conn.commit()

        token = serializer.dumps(email, salt="email-verify")

        base_url = os.getenv("BASE_URL", f"http://127.0.0.1:{app.config['PORT']}")
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

        return jsonify({"message": "Verification email sent"}), 201
    except Exception as e:
        return jsonify({"message": "Error during signup", "error": str(e)}), 500

@app.route("/verify/<token>")
def verify_email(token):
    try:
        email = serializer.loads(token, salt="email-verify", max_age=3600)
    except:
        return jsonify({"message": "Verification link expired or invalid"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "UPDATE users SET is_verified=TRUE WHERE email=%s",
            (email,)
        )
        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({"message": "Email verified successfully! You can now log in."}), 200
    except Exception as e:
        return jsonify({"message": "Error verifying email", "error": str(e)}), 500

@app.route("/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email")
    print(email)
    password = data.get("password")

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
        user = cursor.fetchone()

        cursor.close()
        conn.close()

        if not user:
            return jsonify({"message": "User not found"}), 404

        if not user["is_verified"]:
            return jsonify({"message": "Please verify your email first"}), 403

        if not check_password_hash(user["password"], password):
            return jsonify({"message": "Invalid credentials"}), 401

        return jsonify({"message": "Login successful", "email": user["email"]}), 200
    except Exception as e:
        return jsonify({"message": "Error during login", "error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=app.config['PORT'])