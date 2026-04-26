-- Database Schema for Telemedicine

-- 1. Users table (Base table for all roles)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    user_type TEXT NOT NULL CHECK (user_type IN ('patient', 'doctor', 'medicalist', 'superadmin')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Patients table
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mobile_no TEXT,
    address TEXT,
    diagnosis TEXT,
    symptoms TEXT,
    current_medications TEXT,
    prescription_upload TEXT,
    upi_id TEXT,
    account_details JSONB,
    gender TEXT,
    age INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Doctors table
CREATE TABLE IF NOT EXISTS doctors (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    specialist TEXT,
    contact TEXT,
    education TEXT,
    consultation_fee INTEGER DEFAULT 500,
    available_days JSONB DEFAULT '["Monday","Tuesday","Wednesday","Thursday","Friday"]',
    available_time_start TIME DEFAULT '09:00:00',
    available_time_end TIME DEFAULT '17:00:00',
    is_available BOOLEAN DEFAULT TRUE,
    doctor_registration_number TEXT,
    star_ratings DECIMAL(3,2) DEFAULT 0,
    approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    address TEXT,
    upi_id TEXT,
    account_details JSONB,
    gender TEXT,
    age INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Medicalists table
CREATE TABLE IF NOT EXISTS medicalists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact TEXT,
    department TEXT,
    approval_status TEXT DEFAULT 'pending',
    medical_id INTEGER, -- REFERENCES medicals(id) after medicals table is created
    upi_id TEXT,
    account_details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Medicals table (Managed by superadmin)
CREATE TABLE IF NOT EXISTS medicals (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    contact TEXT,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_approved BOOLEAN DEFAULT FALSE,
    upi_id TEXT,
    account_details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    appointment_code TEXT UNIQUE,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
    booked_by TEXT,
    booked_by_user_id INTEGER REFERENCES users(id),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    symptoms TEXT,
    disease_category TEXT,
    priority TEXT DEFAULT 'medium',
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'completed', 'altered', 'confirmed')),
    is_video_consultation BOOLEAN DEFAULT FALSE,
    meeting_link TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Consultations table
CREATE TABLE IF NOT EXISTS consultations (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
    consultation_date DATE DEFAULT CURRENT_DATE,
    diagnosis TEXT NOT NULL DEFAULT 'Not specified',
    symptoms_observed TEXT,
    blood_pressure TEXT,
    heart_rate INTEGER,
    temperature DECIMAL(5,2),
    weight DECIMAL(5,2),
    diabetes_reading DECIMAL(5,2),
    notes TEXT,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
    id SERIAL PRIMARY KEY,
    consultation_id INTEGER REFERENCES consultations(id) ON DELETE CASCADE,
    prescription_code TEXT UNIQUE,
    medication_name TEXT NOT NULL,
    dosage TEXT,
    duration TEXT,
    instructions TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    transaction_code TEXT UNIQUE,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
    consultation_id INTEGER REFERENCES consultations(id) ON DELETE SET NULL,
    medical_id INTEGER REFERENCES medicals(id) ON DELETE SET NULL,
    type TEXT DEFAULT 'consultation',
    amount DECIMAL(10,2) NOT NULL,
    payment_status TEXT DEFAULT 'pending',
    payment_method TEXT,
    description TEXT,
    manual_utr TEXT,
    payment_proof_url TEXT,
    metadata JSONB,
    transaction_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Pharmacy Flow Tables
CREATE TABLE IF NOT EXISTS medical_inventory (
    id SERIAL PRIMARY KEY,
    medical_id INTEGER NOT NULL REFERENCES medicals(id) ON DELETE CASCADE,
    medicine_name TEXT NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 10,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (medical_id, medicine_name)
);

CREATE TABLE IF NOT EXISTS medical_transaction_items (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    medicine_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    line_total NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
