# Setup Instructions for Your Friend

## Problem Summary
The account creation is failing because the database tables don't exist in your PostgreSQL. The project only has sample data, not the table structure.

## Step-by-Step Setup Guide

### Step 1: Install Node.js Dependencies
First, make sure you have Node.js installed, then run:
```bash
npm install
```

### Step 2: Configure Database Connection
Edit the `.env.local` file in the project root with YOUR PostgreSQL credentials:

```env
DB_HOST=localhost
DB_PORT=5432                    # Change to your PostgreSQL port (default is 5432)
DB_NAME=healthcare_system       # Name of database you created
DB_USER=postgres                # Your PostgreSQL username (usually 'postgres')
DB_PASSWORD=your_password_here  # YOUR actual PostgreSQL password
```

**Important:** 
- Find your PostgreSQL port (check pgAdmin or when you installed PostgreSQL)
- Create a database named `healthcare_system` or change the name in `.env.local`
- Use your actual PostgreSQL password (not the one in this file)

### Step 3: Create Database Tables
1. Open pgAdmin, DBeaver, or psql command line
2. Connect to your PostgreSQL server
3. Select the `healthcare_system` database
4. Run the entire `database-schema.sql` file to create all tables

**Using psql command line:**
```bash
psql -U postgres -p 5433 -d healthcare_system -f database-schema.sql
```
*(Replace 5433 with your actual port if different)*

### Step 4: Update Existing Tables (Optional)
If you need to update existing tables to the latest version, run:
```bash
node scripts/migrate.js
```

### Step 4: Verify Tables Were Created
Run this query to check if all tables exist:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see these tables:
- users
- patients
- doctors
- receptionists
- medicalists
- appointments
- consultations
- prescriptions
- transactions
- medical_records
- inventory

### Step 5: (Optional) Add Sample Data
If you want sample users and data, run:
```bash
node scripts/seed.js
```

This will create sample accounts:
- **Patient**: jane.patient@example.com / Patient@123
- **Doctor**: dr.arun@example.com / Doctor@123
- **Receptionist**: reception.anu@example.com / Reception@123
- **Medicalist**: pharma.raj@example.com / Medical@123

### Step 6: Start the Application
```bash
npm run dev
```

Open http://localhost:3000 in your browser.

### Step 7: Create Your Account
Now you can create an account by clicking "Sign Up" and filling in the form!

## Common Issues & Solutions

### Issue 1: "Connection refused" error
**Solution:** Check if PostgreSQL is running and verify the port number in `.env.local`

### Issue 2: "Database does not exist" error
**Solution:** Create the database first:
```sql
CREATE DATABASE healthcare_system;
```

### Issue 3: "Password authentication failed" error
**Solution:** Update `DB_PASSWORD` in `.env.local` with correct password

### Issue 4: "relation already exists" error
**Solution:** Tables already exist! Skip to Step 5 or drop them first:
```sql
DROP TABLE IF EXISTS inventory, medical_records, transactions, prescriptions, consultations, appointments, medicalists, receptionists, doctors, patients, users CASCADE;
```

### Issue 5: Port 5432 vs 5433
**Solution:** Check what port your PostgreSQL uses:
- Default PostgreSQL port is **5432**
- Some installations use **5433**
- Update `DB_PORT` in `.env.local` to match

## Need Help?
Check the PostgreSQL connection by running:
```bash
psql -U postgres -h localhost -p 5432
```
(Replace with your actual port number)

If this connects successfully, your PostgreSQL is working correctly!
