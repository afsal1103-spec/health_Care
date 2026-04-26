import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { getAIReasoning } from "@/lib/gemini";

type UserSector = "patient" | "doctor" | "medicalist" | "superadmin";

function extractJsonObject(text: string): string | null {
  const cleaned = text.replace(/```json|```/gi, "").trim();
  const s = cleaned.indexOf("{");
  const e = cleaned.lastIndexOf("}");
  if (s < 0 || e < 0 || e <= s) return null;
  return cleaned.slice(s, e + 1);
}

async function getSectorContext(userId: number, sector: UserSector) {
  if (sector === "patient") {
    const p = await query("SELECT id, name, address, diagnosis, symptoms, age, gender FROM patients WHERE user_id = $1 LIMIT 1", [userId]);
    if (!p.rows[0]) return null;
    const h = await query("SELECT consultation_date, diagnosis, symptoms_observed FROM consultations WHERE patient_id = $1 ORDER BY consultation_date DESC LIMIT 5", [p.rows[0].id]);
    return { profile: p.rows[0], history: h.rows };
  }
  if (sector === "doctor") {
    const d = await query("SELECT id, name, specialist, consultation_fee, is_available FROM doctors WHERE user_id = $1 LIMIT 1", [userId]);
    if (!d.rows[0]) return null;
    const a = await query("SELECT COUNT(*)::int AS today_appointments FROM appointments WHERE doctor_id = $1 AND appointment_date = CURRENT_DATE", [d.rows[0].id]);
    return { profile: d.rows[0], workload: a.rows[0] };
  }
  if (sector === "medicalist") {
    const m = await query("SELECT m.id, m.name, m.medical_id, med.name AS medical_name FROM medicalists m LEFT JOIN medicals med ON med.id=m.medical_id WHERE m.user_id = $1 LIMIT 1", [userId]);
    if (!m.rows[0]) return null;
    const low = await query("SELECT medicine_name, quantity, low_stock_threshold FROM medical_inventory WHERE medical_id = $1 AND quantity <= low_stock_threshold ORDER BY quantity ASC LIMIT 5", [m.rows[0].medical_id]);
    return { profile: m.rows[0], lowStock: low.rows };
  }
  const stats = await query("SELECT (SELECT COUNT(*)::int FROM patients) AS patients, (SELECT COUNT(*)::int FROM doctors) AS doctors, (SELECT COUNT(*)::int FROM medicalists) AS medicalists");
  const hs = await query("SELECT TRIM(address) AS area, COALESCE(NULLIF(TRIM(diagnosis),''),'General') AS disease, COUNT(*)::int AS patient_count FROM patients WHERE address IS NOT NULL AND TRIM(address)<>'' GROUP BY TRIM(address), COALESCE(NULLIF(TRIM(diagnosis),''),'General') HAVING COUNT(*)>=3 ORDER BY patient_count DESC LIMIT 3");
  return { stats: stats.rows[0], hotspots: hs.rows };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body?.patient) {
      const consultations = Array.isArray(body.consultations) ? body.consultations : [];
      const history = consultations.map((c: any) => ({ date: c.consultationDate, diagnosis: c.diagnosis, symptoms: c.symptomsObserved || c.symptoms_observed }));
      const prompt = `Analyze this patient and return only JSON with keys summary, risks, advice. Patient: ${JSON.stringify(body.patient)}. History: ${JSON.stringify(history)}.`;
      const aiResult = await getAIReasoning(prompt);
      if (!aiResult) return NextResponse.json({ error: "AI reasoning failed" }, { status: 500 });
      const parsed = JSON.parse(extractJsonObject(aiResult) || "{}");
      return NextResponse.json({ success: true, data: { summary: parsed.summary || "Not enough data.", risks: Array.isArray(parsed.risks) ? parsed.risks : [], advice: Array.isArray(parsed.advice) ? parsed.advice : [] } });
    }

    const message = String(body?.message || "").trim();
    if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });

    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.userType) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sector = (body?.sector || session.user.userType) as UserSector;
    const context = await getSectorContext(Number(session.user.id), sector);

    const prompt = `You are a healthcare assistant for ${sector} sector. Use context and answer user's question.
Context: ${JSON.stringify(context || {})}
Question: ${message}
Return only JSON: {"reply":"string","suggestions":["string"],"alerts":["string"]}`;

    const aiResult = await getAIReasoning(prompt);
    if (!aiResult) {
      return NextResponse.json({ success: true, data: { reply: "AI is temporarily unavailable. Please try again.", suggestions: [], alerts: [] } });
    }

    const parsed = JSON.parse(extractJsonObject(aiResult) || "{}");
    return NextResponse.json({
      success: true,
      data: {
        reply: parsed.reply || "I analyzed your request. Please refine your question for a more precise response.",
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : [],
        alerts: Array.isArray(parsed.alerts) ? parsed.alerts.slice(0, 3) : [],
        sector,
      },
    });
  } catch (error) {
    console.error("AI reasoning error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
