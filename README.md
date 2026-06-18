# Turf Arena

Turf Arena is a full-stack venue management and booking platform designed to streamline the connection between sports enthusiasts and turf owners. It eliminates scheduling conflicts, prevents double-bookings, and provides a centralized digital dashboard for turf managers to control their inventory in real-time.

## Key Features
* **Role-Based Access Control:** Distinct, secure routing and dashboards for Players and Turf Owners (Admins).
* **Dynamic Booking Engine:** A real-time slot selection system that actively prevents double-bookings by locking database records.
* **Admin Control Panel:** Empowers turf owners to manage their venues, dynamically edit pricing, and handle cancellations.
* **Digital Receipts:** Automated generation of stylized digital invoices and a dedicated booking ledger for users.

## Technical Stack
* **Frontend:** React.js (Vite), Custom CSS, Three.js/React Bits (for 3D visual environments)
* **Backend:** Python, Flask, flask-cors
* **Database:** PostgreSQL (with psycopg2 adapter)

## Local Setup Instructions

### 1. Backend Setup
Navigate to the root directory and activate the virtual environment:
```bash
.\venv\Scripts\activate
