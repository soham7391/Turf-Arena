from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
import psycopg2.extras

app = Flask(__name__)
CORS(app)

DB_HOST = "localhost"
DB_NAME = "turf_management"
DB_USER = "postgres"
DB_PASS = "SODU1602"

def get_db_connection():
    return psycopg2.connect(host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASS)

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        if data['role'] == 'user':
            cur.execute("INSERT INTO Users (name, email, password, number) VALUES (%s, %s, %s, %s)",
                        (data['name'], data['email'], data['password'], data['number']))
        else:
            cur.execute("INSERT INTO Admin (name, email, password, number) VALUES (%s, %s, %s, %s)",
                        (data['name'], data['email'], data['password'], data['number']))
        conn.commit()
        return jsonify({"status": "success"}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 400
    finally:
        cur.close()
        conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    if data['role'] == 'user':
        cur.execute("SELECT userid as id, name, email FROM Users WHERE email = %s AND password = %s", 
                    (data['email'], data['password']))
    else:
        cur.execute("SELECT adminid as id, name, email FROM Admin WHERE email = %s AND password = %s", 
                    (data['email'], data['password']))
    user = cur.fetchone()
    cur.close()
    conn.close()
    
    if user:
        user['role'] = data['role']
        return jsonify(user), 200
    return jsonify({"error": "Invalid credentials"}), 401

@app.route('/api/turfs', methods=['GET'])
def get_turfs():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT * FROM Turf")
    turfs = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(turfs), 200

@app.route('/api/admin/dashboard/<int:admin_id>', methods=['GET'])
def admin_dashboard(admin_id):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    cur.execute("SELECT * FROM Turf WHERE adminid = %s", (admin_id,))
    turfs = cur.fetchall()
    
    cur.execute("""
        SELECT b.bookingid, u.name as username, t.turfname, b.bookingdate, b.duration, b.totalamount, b.status
        FROM booking b
        JOIN Users u ON b.userid = u.userid
        JOIN Turf t ON b.turfid = t.turfid
        WHERE t.adminid = %s
    """, (admin_id,))
    bookings = cur.fetchall()
    
    cur.close()
    conn.close()
    return jsonify({"turfs": turfs, "bookings": bookings}), 200

@app.route('/api/book', methods=['POST'])
def book():
    data = request.json
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO booking (userid, turfid, bookingdate, duration, totalamount, status)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (data['userid'], data['turfid'], data['bookingdate'], data['duration'], data['totalamount'], data['status']))
        conn.commit()
        return jsonify({"status": "success"}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 400
    finally:
        cur.close()
        conn.close()
@app.route('/api/user/bookings/<int:user_id>', methods=['GET'])
def get_user_bookings(user_id):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT b.bookingid, t.turfname, b.bookingdate, b.totalamount, b.status
        FROM booking b
        JOIN Turf t ON b.turfid = t.turfid
        WHERE b.userid = %s
        ORDER BY b.bookingid DESC
    """, (user_id,))
    bookings = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(bookings), 200
@app.route('/api/admin/turf/<int:turf_id>/price', methods=['PUT'])
def update_turf_price(turf_id):
    data = request.json
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("UPDATE Turf SET priceperhour = %s WHERE turfid = %s", (data['price'], turf_id))
        conn.commit()
        return jsonify({"status": "success"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 400
    finally:
        cur.close()
        conn.close()
@app.route('/api/admin/bookings/<int:booking_id>', methods=['PUT'])
def cancel_booking(booking_id):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # We UPDATE instead of DELETE so the user still gets a receipt with a refund message!
        cur.execute("UPDATE booking SET status = 'Cancelled' WHERE bookingid = %s", (booking_id,))
        conn.commit()
        return jsonify({"status": "success"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 400
    finally:
        cur.close()
        conn.close()
if __name__ == '__main__':
    app.run(debug=True, port=5000)