from flask import Flask, request, jsonify
from flask_cors import CORS 
import os
from werkzeug.security import generate_password_hash, check_password_hash 
from werkzeug.utils import secure_filename
import psycopg2
import psycopg2.extras

app = Flask(__name__)
CORS(app)

DB_HOST = "localhost"
DB_NAME = "turf_management"
DB_USER = "postgres"
DB_PASS = "SODU1602"
app.config['UPLOAD_FOLDER'] = 'static/uploads'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
def get_db_connection():
    return psycopg2.connect(host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASS)

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        hashed_pw = generate_password_hash(data['password'])
        
        if data['role'] == 'user':
            cur.execute("INSERT INTO Users (name, email, number, password) VALUES (%s, %s, %s, %s)", 
                        (data['name'], data['email'], data['number'], hashed_pw))
        else:
            cur.execute("INSERT INTO Admin (name, email, number, password) VALUES (%s, %s, %s, %s)", 
                        (data['name'], data['email'], data['number'], hashed_pw))
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
    
    try:
        if data['role'] == 'user':
            cur.execute("SELECT * FROM users WHERE email = %s", (data['email'],))
            user = cur.fetchone()
            if user and check_password_hash(user['password'], data['password']):
                return jsonify({"id": user['userid'], "name": user['name'], "email": user['email'], "role": "user"}), 200
        else:
            cur.execute("SELECT * FROM Admin WHERE email = %s", (data['email'],))
            admin = cur.fetchone()
            if admin and check_password_hash(admin['password'], data['password']):
                return jsonify({"id": admin['adminid'], "name": admin['name'], "email": admin['email'], "role": "admin"}), 200
                
        return jsonify({"error": "Invalid credentials"}), 401
    finally:
        cur.close()
        conn.close() 
@app.route('/api/turfs', methods=['GET'])
def get_all_turfs():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:

        cur.execute("SELECT * FROM Turf ORDER BY turfid DESC")
        turfs = cur.fetchall()
        return jsonify(turfs), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()
@app.route('/api/turfs', methods=['POST'])
def add_turf():
    data = request.form 
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        image_url = ""
        if 'image' in request.files:
            file = request.files['image']
            if file.filename != '':
                filename = secure_filename(file.filename)
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(filepath)
                image_url = f"http://127.0.0.1:5000/static/uploads/{filename}"

        google_maps_link = data.get('google_maps_link', '')
        contact_email = data.get('contact_email', '') 

        cur.execute(
            "INSERT INTO Turf (turfname, type, priceperhour, location, adminid, image_url, google_maps_link, contact_email) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING turfid",
            (data['turfname'], data['type'], data['priceperhour'], data['location'], data['adminid'], image_url, google_maps_link, contact_email)
        )
        new_turfid = cur.fetchone()[0]
        conn.commit()
        return jsonify({"status": "success", "turfid": new_turfid}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 400
    finally:
        cur.close()
        conn.close()

@app.route('/api/admin/dashboard/<int:admin_id>', methods=['GET'])
def get_admin_dashboard(admin_id):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:

        cur.execute("SELECT * FROM Turf WHERE adminid = %s ORDER BY turfid DESC", (admin_id,))
        turfs = cur.fetchall()

        cur.execute("""
            SELECT booking.bookingid, users.name AS username, Turf.turfname, booking.bookingdate, booking.timeslot, booking.status
            FROM booking
            JOIN Turf ON booking.turfid = Turf.turfid
            JOIN Users ON booking.userid = users.userid
            WHERE Turf.adminid = %s
            ORDER BY booking.bookingid DESC
        """, (admin_id,))
        bookings = cur.fetchall()

        return jsonify({"turfs": turfs, "bookings": bookings}), 200
    except Exception as e: 
        print(f"🚨 ADMIN CRASH: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@app.route('/api/book', methods=['POST'])
def book_turf():
    data = request.json
    userid = data['userid']
    turfid = data['turfid']
    bookingdate = data['bookingdate']
    timeslot = data.get('timeslot') 
    totalamount = data['totalamount']
    status = data.get('status', 'Confirmed')

    conn = get_db_connection()
    cur = conn.cursor()
    try:

        cur.execute(
            "SELECT * FROM booking WHERE turfid = %s AND bookingdate = %s AND timeslot = %s AND status = 'Confirmed'", 
            (turfid, bookingdate, timeslot)
        )
        if cur.fetchone():
            return jsonify({"error": "This slot is already booked!"}), 400

        cur.execute(
            "INSERT INTO booking (userid, turfid, bookingdate, timeslot, totalamount, status) VALUES (%s, %s, %s, %s, %s, %s)",
            (userid, turfid, bookingdate, timeslot, totalamount, status)
        )
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
    try:

        cur.execute("""
            SELECT booking.bookingid, Turf.turfname, booking.bookingdate, booking.timeslot, booking.status
            FROM booking
            JOIN Turf ON booking.turfid = Turf.turfid
            WHERE booking.userid = %s
            ORDER BY booking.bookingid DESC
        """, (user_id,))
        bookings = cur.fetchall()
        return jsonify(bookings), 200
    except Exception as e: 
        print(f"🚨 DATABASE CRASH: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()
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

        cur.execute("UPDATE booking SET status = 'Cancelled' WHERE bookingid = %s", (booking_id,))
        conn.commit()
        return jsonify({"status": "success"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 400
    finally:
        cur.close()
        conn.close() 
@app.route('/api/admin/turf/<int:turf_id>', methods=['DELETE'])
def delete_turf(turf_id):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM Bookings WHERE turfid = %s", (turf_id,))
        cur.execute("DELETE FROM Turf WHERE turfid = %s", (turf_id,))
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