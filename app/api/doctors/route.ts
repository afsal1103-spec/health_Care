import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function parseAvailableDays(val: unknown): string[] {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val as string);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
  }
  return [];
}

function formatTimeStr(val: unknown): string {
  if (!val) return "09:00:00";
  if (typeof val === "string") return val;
  return String(val);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const specialty = (searchParams.get("specialty") || "").trim();
    const symptom = (searchParams.get("symptom") || "").trim();

    const params: (string | number)[] = [];
    const where = "WHERE d.is_available = true AND u.is_active = true";

    const sql = `
      SELECT
        d.id,
        d.name,
        d.specialist,
        d.education,
        COALESCE(d.experience_years, 0)   AS experience_years,
        COALESCE(d.consultation_fee, 500) AS consultation_fee,
        d.rating,
        d.available_days,
        d.available_time_start,
        d.available_time_end,
        u.email
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      ${where}
      ORDER BY d.name ASC
    `;

    const result = await query(sql, params);
    const rows = result.rows || [];

    // Map rows manually — do NOT use toCamelCase on the whole object because
    // it recurses into JSONB arrays and can break them.
    const doctors = rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      name: r.name as string,
      specialist: (r.specialist as string) || "General Physician",
      education: (r.education as string) || "",
      experienceYears: parseInt(String(r.experience_years ?? 0), 10),
      consultationFee: parseFloat(String(r.consultation_fee ?? 500)),
      rating: r.rating != null ? parseFloat(String(r.rating)) : null,
      availableDays: parseAvailableDays(r.available_days),
      availableTimeStart: formatTimeStr(r.available_time_start),
      availableTimeEnd: formatTimeStr(r.available_time_end),
      email: (r.email as string) || "",
    }));

    // Sort by symptom/category relevance
    // Combine specialty (disease category) + symptom for matching
    const combinedSearch = [specialty, symptom].filter(Boolean).join(" ");
    if (combinedSearch) {
      const symptomMap: Record<string, string[]> = {
        // Disease category keywords (from the book-appointment dropdown)
        cardiology: ["Cardiologist", "Cardiology"],
        dermatology: ["Dermatologist", "Dermatology"],
        neurology: ["Neurologist", "Neurology"],
        orthopedic: ["Orthopedic", "Orthopedics"],
        orthopedics: ["Orthopedic", "Orthopedics"],
        pediatric: ["Pediatrician", "Pediatrics"],
        pediatrics: ["Pediatrician", "Pediatrics"],
        ophthalmology: ["Ophthalmologist", "Ophthalmology"],
        psychiatry: ["Psychiatrist", "Psychiatry"],
        gastroenterology: ["Gastroenterologist", "Gastroenterology"],
        pulmonology: ["Pulmonologist", "Pulmonology"],
        nephrology: ["Nephrologist", "Nephrology"],
        urology: ["Urologist", "Urology"],
        endocrinology: ["Endocrinologist", "Diabetology"],
        gynecology: ["Gynecologist", "Gynecology"],
        obstetrics: ["Obstetrician", "Obstetrics"],
        oncology: ["Oncologist", "Oncology"],
        rheumatology: ["Rheumatologist", "Rheumatology"],
        hypertension: ["Cardiologist", "General Physician"],
        general: ["General Physician", "General"],
        checkup: ["General Physician", "General"],
        // Symptom keywords
        heart: ["Cardiologist", "Cardiology"],
        "chest pain": ["Cardiologist", "Cardiology"],
        cardiac: ["Cardiologist", "Cardiology"],
        skin: ["Dermatologist", "Dermatology"],
        rash: ["Dermatologist", "Dermatology"],
        acne: ["Dermatologist", "Dermatology"],
        brain: ["Neurologist", "Neurology"],
        headache: ["Neurologist", "Neurology"],
        migraine: ["Neurologist", "Neurology"],
        nerve: ["Neurologist", "Neurology"],
        child: ["Pediatrician", "Pediatrics"],
        children: ["Pediatrician", "Pediatrics"],
        baby: ["Pediatrician", "Pediatrics"],
        bone: ["Orthopedic", "Orthopedics"],
        joint: ["Orthopedic", "Orthopedics"],
        fracture: ["Orthopedic", "Orthopedics"],
        eye: ["Ophthalmologist", "Ophthalmology"],
        vision: ["Ophthalmologist", "Ophthalmology"],
        sight: ["Ophthalmologist", "Ophthalmology"],
        ear: ["ENT Specialist", "ENT", "Otolaryngology"],
        nose: ["ENT Specialist", "ENT", "Otolaryngology"],
        throat: ["ENT Specialist", "ENT", "Otolaryngology"],
        tooth: ["Dentist", "Dental"],
        teeth: ["Dentist", "Dental"],
        dental: ["Dentist", "Dental"],
        mental: ["Psychiatrist", "Psychiatry", "Psychologist"],
        anxiety: ["Psychiatrist", "Psychiatry"],
        depression: ["Psychiatrist", "Psychiatry"],
        diabetes: ["Endocrinologist", "Diabetologist", "General Physician"],
        sugar: ["Endocrinologist", "Diabetologist"],
        fever: ["General Physician", "General"],
        cough: ["General Physician", "Pulmonologist"],
        breathing: ["Pulmonologist", "General Physician"],
        stomach: ["Gastroenterologist", "General Physician"],
        digestion: ["Gastroenterologist", "General Physician"],
        kidney: ["Nephrologist", "Urologist"],
        urine: ["Nephrologist", "Urologist"],
        pregnancy: ["Gynecologist", "Obstetrician"],
        women: ["Gynecologist", "Obstetrician"],
        cancer: ["Oncologist"],
        tumor: ["Oncologist"],
        blood: ["Hematologist", "General Physician"],
        allergy: ["Allergist", "Immunologist", "General Physician"],
        newborn: ["Neonatologist", "Pediatrician"],
        infant: ["Neonatologist", "Pediatrician"],
      };

      const symptomLower = combinedSearch.toLowerCase();
      let relatedSpecialties: string[] = [];

      for (const [key, specs] of Object.entries(symptomMap)) {
        if (symptomLower.includes(key)) {
          relatedSpecialties = [...relatedSpecialties, ...specs];
        }
      }

      if (relatedSpecialties.length > 0) {
        doctors.sort((a, b) => {
          const aMatch = relatedSpecialties.some((s) =>
            a.specialist.toLowerCase().includes(s.toLowerCase()),
          )
            ? 1
            : 0;
          const bMatch = relatedSpecialties.some((s) =>
            b.specialist.toLowerCase().includes(s.toLowerCase()),
          )
            ? 1
            : 0;
          return bMatch - aMatch;
        });
      }
    }

    return NextResponse.json(doctors);
  } catch (error) {
    console.error("Error fetching doctors:", error);
    return NextResponse.json(
      { error: "Failed to fetch doctors" },
      { status: 500 },
    );
  }
}
