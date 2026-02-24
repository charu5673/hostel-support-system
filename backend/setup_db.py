import mysql.connector
from dotenv import load_dotenv
import os

load_dotenv()

# Connect to MySQL
conn = mysql.connector.connect(
    host=os.getenv("MYSQL_HOST"),
    user=os.getenv("MYSQL_USER"),
    password=os.getenv("MYSQL_PASSWORD"),
    port=int(os.getenv("MYSQL_PORT", 3306))
)

cursor = conn.cursor()

# Create database if it doesn't exist
db_name = os.getenv("MYSQL_DB", "hostel_db")
cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
print(f"Database '{db_name}' created or already exists.")

# Select the database
cursor.execute(f"USE {db_name}")

# Create users table
create_users_table = """
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
"""

cursor.execute(create_users_table)
print("Table 'users' created or already exists.")

conn.commit()
cursor.close()
conn.close()

print("Database setup completed successfully!")
