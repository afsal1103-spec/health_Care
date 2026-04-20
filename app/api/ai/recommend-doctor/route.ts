import { NextRequest, NextResponse } from "next/server";
import { query, toCamelCase } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { symptoms, diagnosis } = await request.json();

    if (!symptoms && !diagnosis) {
      return NextResponse.json(
        { error: "Symptoms or diagnosis required for recommendation" },
        { status: 400 },
      );
    }

    // This is where RAG logic would go. 
    // For now, we'll perform a semantic-like search using PostgreSQL ILIKE
    // matching symptoms/diagnosis with doctor specialties.
    
    const searchText = `${symptoms} ${diagnosis}`.toLowerCase();
    
    // Simple keyword mapping for demo purposes
    const keywords: Record<string, string[]> = {
      "heart": ["Cardiologist"],
      "chest pain": ["Cardiologist"],
      "skin": ["Dermatologist"],
      "rash": ["Dermatologist"],
      "brain": ["Neurologist"],
      "headache": ["Neurologist"],
      "bone": ["Orthopedic Surgeon"],
      "fracture": ["Orthopedic Surgeon"],
      "child": ["Pediatrician"],
      "baby": ["Pediatrician"],
      "fever": ["General Physician", "Pediatrician"],
      "cough": ["General Physician", "Pulmonologist"],
      "stomach": ["Gastroenterologist"],
      "eye": ["Ophthalmologist"],
      "teeth": ["Dentist"],
      "mental": ["Psychiatrist", "Psychologist"],
      "anxiety": ["Psychiatrist", "Psychologist"]
    };

    let matchedSpecialties: string[] = [];
    for (const [key, specialties] of Object.entries(keywords)) {
      if (searchText.includes(key)) {
        matchedSpecialties.push(...specialties);
      }
    }

    // Unique specialties
    matchedSpecialties = [...new Set(matchedSpecialties)];

    // 2. Dynamic AI Analysis (Simulating deep clinical knowledge base)
    let aiInsight = "Analyzing symptoms...";
    let potentialCondition = "General Health Consultation";
    let preventionTips: string[] = [];

    if (searchText.includes("heart") || searchText.includes("chest pain") || searchText.includes("shortness of breath")) {
      potentialCondition = "Cardiovascular Concern";
      aiInsight = "Your symptoms of chest discomfort or heart palpitations can sometimes be linked to cardiovascular strain. While it could be stress-related, a professional check-up is vital.";
      preventionTips = ["Reduce sodium intake", "Monitor blood pressure daily", "Avoid strenuous activity until cleared"];
    } else if (searchText.includes("fever") || searchText.includes("cough") || searchText.includes("throat")) {
      potentialCondition = "Acute Respiratory Infection / Flu";
      aiInsight = "Seasonal flu or bacterial infections often present with these symptoms. If your fever persists above 102°F, immediate attention is needed.";
      preventionTips = ["Stay hydrated with electrolytes", "Gargle with warm salt water", "Ensure 8-10 hours of sleep"];
    } else if (searchText.includes("headache") || searchText.includes("migraine") || searchText.includes("dizzy")) {
      potentialCondition = "Neurological / Tension Migraine";
      aiInsight = "Chronic headaches can be triggered by stress, dehydration, or neurological factors. Identifying triggers is the first step to management.";
      preventionTips = ["Limit screen time and blue light", "Maintain a consistent sleep cycle", "Increase magnesium-rich foods"];
    } else if (searchText.includes("skin") || searchText.includes("rash") || searchText.includes("itch")) {
      potentialCondition = "Dermatological Reaction";
      aiInsight = "Skin irritations can range from simple allergies to more complex inflammatory conditions. Avoid scratching to prevent secondary infections.";
      preventionTips = ["Use hypoallergenic soaps", "Keep the area moisturized and cool", "Track any new foods or products used"];
    } else {
      aiInsight = "Based on your description, a general physical examination is the best starting point to rule out common underlying causes.";
      preventionTips = ["Keep a log of when symptoms occur", "Monitor your temperature", "Rest and stay hydrated"];
    }

    // 3. Find Matching Doctors
    let sql = `
      SELECT d.*, u.email, COALESCE(d.star_ratings, 0) as rating
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      WHERE d.approval_status = 'approved' AND d.is_available = true
    `;

    const params: any[] = [];
    if (matchedSpecialties.length > 0) {
      sql += ` AND d.specialist = ANY($1)`;
      params.push(matchedSpecialties);
    }

    // Prioritize high ratings
    sql += ` ORDER BY COALESCE(d.star_ratings, 0) DESC LIMIT 5`;

    const result = await query(sql, params);
    
    return NextResponse.json({
      recommendations: toCamelCase(result.rows.length > 0 ? result.rows : (await query(`SELECT d.*, u.email, COALESCE(d.star_ratings, 0) as rating FROM doctors d JOIN users u ON d.user_id = u.id WHERE d.approval_status = 'approved' AND d.is_available = true ORDER BY d.star_ratings DESC LIMIT 5`)).rows),
      ai_analysis: {
        condition: potentialCondition,
        insight: aiInsight,
        prevention: preventionTips
      }
    });
  } catch (error) {
    console.error("AI Recommendation error:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 },
    );
  }
}
