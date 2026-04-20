import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query, transaction } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      name,
      userType,
      mobileNo,
      address,
      gender,
      age,
      specialist,
      education,
      doctorRegistrationNumber,
      diagnosis,
      symptoms,
      currentMedications,
      upiId,
    } = body;

    // Validation
    if (!email || !password || !name || !userType || !gender || !age) {
      return NextResponse.json(
        { error: "Missing required fields (email, password, name, role, gender, age)" },
        { status: 400 },
      );
    }

    // Validate mobile number (example: 10 digits for Indian numbers)
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobileNo)) {
      return NextResponse.json(
        { error: "Invalid mobile number. Please enter a valid 10-digit number." },
        { status: 400 },
      );
    }

    // Check if user exists
    const existingUser = await query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 },
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await transaction(async (client) => {
      // Create user
      const userResult = await client.query(
        "INSERT INTO users (email, password, user_type, is_active) VALUES ($1, $2, $3, true) RETURNING id",
        [email, hashedPassword, userType],
      );

      const userId = userResult.rows[0].id;

      // Create role-specific record
      if (userType === "patient") {
        await client.query(
          "INSERT INTO patients (user_id, name, mobile_no, address, gender, age, diagnosis, symptoms, current_medications, upi_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
          [
            userId,
            name,
            mobileNo || "",
            address || "",
            gender,
            parseInt(age),
            diagnosis || "",
            symptoms || "",
            currentMedications || "",
            upiId || null,
          ],
        );
      } else if (userType === "doctor") {
        await client.query(
          "INSERT INTO doctors (user_id, name, specialist, contact, education, doctor_registration_number, address, gender, age, consultation_fee, available_days, available_time_start, available_time_end, is_available, approval_status, upi_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, 'pending', $14)",
          [
            userId,
            name,
            specialist || "General Physician",
            mobileNo || "",
            education || "MBBS",
            doctorRegistrationNumber || "",
            address || "",
            gender,
            parseInt(age),
            500,
            '["Monday","Tuesday","Wednesday","Thursday","Friday"]',
            "09:00:00",
            "17:00:00",
            upiId || null,
          ],
        );
      } else if (userType === "medicalist") {
        await client.query(
          "INSERT INTO medicalists (user_id, name, contact, department, approval_status, upi_id) VALUES ($1, $2, $3, $4, 'pending', $5)",
          [userId, name, mobileNo || "", specialist || "Pharmacy", upiId || null]
        );
      } else if (userType === "superadmin") {
        // superadmin only needs an entry in the users table (already created above)
        // no role-specific table is required
      }
      return userId;
    });

    return NextResponse.json({
      success: true,
      message: "User created successfully",
      userId: result,
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 },
    );
  }
}
