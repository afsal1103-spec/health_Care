import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { doctor_id, rating } = await request.json();

    if (!doctor_id || rating === undefined) {
      return NextResponse.json(
        { error: "Doctor ID and rating are required" },
        { status: 400 },
      );
    }

    // Update doctor rating (star_ratings)
    // In a real app, we'd average this with existing ratings. 
    // For this demo, we'll update it to the new rating and slightly weight it.
    
    await query(
      `UPDATE doctors 
       SET star_ratings = (COALESCE(star_ratings, 0) + $1) / 2.0 
       WHERE id = $2`,
      [rating, doctor_id]
    );

    return NextResponse.json({ success: true, message: "Rating submitted" });
  } catch (error) {
    console.error("Rating error:", error);
    return NextResponse.json(
      { error: "Failed to submit rating" },
      { status: 500 },
    );
  }
}
