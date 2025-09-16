import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()  # loads .env file

def get_db_connection():
    connection = mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "eco_campus_db")
    )
    return connection
