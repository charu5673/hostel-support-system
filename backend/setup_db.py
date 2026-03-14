import mysql.connector
from dotenv import load_dotenv
import os

load_dotenv()

conn = mysql.connector.connect(
    host=os.getenv("MYSQL_HOST"),
    user=os.getenv("MYSQL_USER"),
    password=os.getenv("MYSQL_PASSWORD"),
    port=int(os.getenv("MYSQL_PORT", 3306))
)

cursor = conn.cursor()

db_name = os.getenv("MYSQL_DB", "hostel_db")
cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
print(f"Database '{db_name}' created or already exists.")

cursor.execute(f"USE {db_name}")

# ---------------- USERS TABLE ----------------
create_users_table = """
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    room INT,
    roll_no INT UNIQUE,
    password VARCHAR(255) NOT NULL,
    user_type ENUM('student','warden','mess','admin') NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
"""
cursor.execute(create_users_table)
print("Table 'users' created or already exists.")


# ---------------- EMAIL POLICIES ----------------
create_email_policies_table = """
CREATE TABLE IF NOT EXISTS email_policies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    domain VARCHAR(255) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
"""
cursor.execute(create_email_policies_table)
print("Table 'email policies' created or already exists.")

add_default_email = """
INSERT INTO email_policies (domain)
VALUES ('gmail.com')
ON DUPLICATE KEY UPDATE domain = domain;
"""
cursor.execute(add_default_email)
print("Added default email, or it already existed.")


# ---------------- COMPLAINTS ----------------
create_complaints_table = """
CREATE TABLE IF NOT EXISTS complaints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    roll_no INT NOT NULL,
    room INT NOT NULL,
    type ENUM('room','washroom','cleaning', 'laundry', 'gym', 'other') DEFAULT 'other',
    description TEXT,
    priority ENUM('low','medium','high') DEFAULT 'medium',
    status ENUM('pending','in_progress','resolved','rejected') DEFAULT 'pending',
    datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
"""
cursor.execute(create_complaints_table)
print("Table 'complaints' created or already exists.")


# ---------------- LEAVES ----------------
create_leaves_table = """
CREATE TABLE IF NOT EXISTS leaves (
    id INT AUTO_INCREMENT PRIMARY KEY,
    roll_no INT,
    start_date DATE,
    end_date DATE,
    applied_date DATE,
    description TEXT,
    status ENUM('pending','approved','rejected') DEFAULT 'pending'
    )
"""
cursor.execute(create_leaves_table)
print("Table 'leaves' created or already exists.")


# ---------------- FEEDBACK ----------------
create_feedback_table = """
CREATE TABLE IF NOT EXISTS feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    roll_no INT,
    meal_time ENUM('breakfast','lunch','snacks','dinner'),
    description TEXT,
    date DATE
)
"""
cursor.execute(create_feedback_table)
print("Table 'feedback' created or already exists.")


# ---------------- ANNOUNCEMENTS ----------------
create_announcements_table = """
CREATE TABLE IF NOT EXISTS announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    description TEXT,
    type VARCHAR(100),
    duration INT,
    priority ENUM('low','medium','high') DEFAULT 'medium',
    datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
"""
cursor.execute(create_announcements_table)
print("Table 'announcements' created or already exists.")


# ---------------- LOST AND FOUND ----------------
create_lost_found_table = """
CREATE TABLE IF NOT EXISTS lost_and_found (
    id INT AUTO_INCREMENT PRIMARY KEY,
    roll_no INT,
    item_name VARCHAR(255),
    description TEXT,
    image VARCHAR(255),
    contact VARCHAR(100),
    report_type ENUM('lost','found'),
    status ENUM('open','claimed','closed') DEFAULT 'open',
    date DATE
)
"""
cursor.execute(create_lost_found_table)
print("Table 'lost_and_found' created or already exists.")


# ---------------- MESS MENU ----------------
create_mess_menu_table = """
CREATE TABLE IF NOT EXISTS mess_menu (
    id INT AUTO_INCREMENT PRIMARY KEY,
    day ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'),
    breakfast TEXT,
    lunch TEXT,
    snacks TEXT,
    dinner TEXT
)
"""
cursor.execute(create_mess_menu_table)
print("Table 'mess_menu' created or already exists.")


# ---------------- TIMINGS ----------------
create_timings_table = """
CREATE TABLE IF NOT EXISTS timings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    facility VARCHAR(255),
    day ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'),
    start_time TIME,
    end_time TIME,
    is_closed BOOLEAN DEFAULT FALSE
)
"""
cursor.execute(create_timings_table)
print("Table 'timings' created or already exists.")


# ---------------- Meal Request ----------------
create_meal_requests_table = """
CREATE TABLE IF NOT EXISTS meal_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reason TEXT,
    day ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'),
    roll_no INT,
    meal_time ENUM('breakfast','lunch','snacks','dinner'),
    status ENUM('pending','approved','rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
"""
cursor.execute(create_meal_requests_table)
print("Table 'meal requests' created or already exists.")


# ---------------- Meal Request ----------------
create_room_change_table = """
CREATE TABLE IF NOT EXISTS room_change (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reason TEXT,
    current_room INT NOT NULL,
    new_room INT,
    roll_no INT NOT NULL,
    status ENUM('pending','approved','rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
"""
cursor.execute(create_room_change_table)
print("Table 'room change' created or already exists.")


conn.commit()
cursor.close()
conn.close()

print("Database setup completed successfully!")