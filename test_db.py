import psycopg2 
import os
from dotenv import load_dotenv

load_dotenv()
def test_connection():
    connection = None
    try:
        
        connection = psycopg2.connect(
            user="postgres",
            password=os.getenv("DB_PASSWORD"),
            host="127.0.0.1",
            port="5432",
            database="turf_management"
        )
        
        cursor = connection.cursor()
        print("Executing query: SELECT turfname, type FROM turf...")
        cursor.execute("SELECT turfname, type FROM turf;")
        
        records = cursor.fetchall()
        
        print("\n Connection Successful!")
        print(f"Total Turfs found: {len(records)}")
        
        for row in records:
            print(f"Turf Name: {row[0]:<20} | Sport: {row[1]}")
        print("\n")

        cursor.close()

    except Exception as error:
        print(f"\n[!] Error while connecting to PostgreSQL: {error}")
    
    finally:
        if connection:
            connection.close()
            print("PostgreSQL connection is closed.")

if __name__ == "__main__":
    test_connection()