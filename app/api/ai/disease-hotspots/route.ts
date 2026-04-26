import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAIReasoning } from "@/lib/gemini";

type FactorKey = "air" | "water" | "traffic" | "noise";

type HotspotRow = {
  area: string;
  disease: string;
  problem_summary: string | null;
  patient_count: string | number;
  symptom_evidence_count: string | number;
  sample_cases: Array<{ name: string; symptoms: string }> | null;
};

type EnvironmentalFactors = {
  traffic: string;
  airPollution: number;
  waterPollution: string;
  noisePollution: string;
  lastUpdated: string;
};

type AnalysisResult = {
  factors: EnvironmentalFactors;
  actualCause: string;
  recommendation: string;
  segments: string[];
};

const keywordSets = {
  respiratory: ["asthma", "respiratory", "bronchitis", "cough", "wheez", "shortness of breath", "breath"],
  waterborne: ["typhoid", "cholera", "diarrhea", "gastro", "hepatitis a", "vomit", "stomach infection"],
  vectorBorne: ["dengue", "malaria", "mosquito", "chikungunya", "fever with chills"],
  stressNoise: ["stress", "migraine", "headache", "anxiety", "insomnia", "sleep issue"],
  skinAllergy: ["allergy", "eczema", "skin", "rash", "itching", "dermatitis"],
  cardiac: ["hypertension", "cardiac", "chest pain", "heart", "bp high", "palpitation"],
  metabolic: ["diabetes", "obesity", "sugar", "insulin resistance"],
};

const factorLabels: Record<FactorKey, string> = {
  air: "air quality pressure",
  water: "water contamination risk",
  traffic: "traffic exposure",
  noise: "noise burden",
};

function hasAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function trafficLevel(score: number): string {
  if (score >= 120) return "Extreme";
  if (score >= 90) return "High";
  if (score >= 60) return "Medium";
  return "Low";
}

function waterLevel(score: number): string {
  if (score >= 105) return "Unsafe";
  if (score >= 75) return "Risky";
  return "Safe";
}

function noiseLevel(score: number): string {
  if (score >= 115) return "Extreme";
  if (score >= 80) return "High";
  return "Normal";
}

function buildRecommendation(primary: FactorKey): string {
  if (primary === "water") {
    return "Prioritize water testing, sanitation drive, and household purification support.";
  }
  if (primary === "air") {
    return "Run air-quality mitigation steps: dust control, emissions checks, and mask advisories.";
  }
  if (primary === "noise") {
    return "Introduce noise-reduction actions, quiet-hour enforcement, and stress-screening camps.";
  }
  return "Improve traffic control, reduce congestion exposure, and increase community health screening.";
}

function extractJsonObject(text: string): string | null {
  const cleaned = text.replace(/```json|```/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return cleaned.slice(start, end + 1);
}

function analyzeDiseaseAndProblem(
  disease: string,
  problemSummary: string | null,
  patientCount: number,
  sampleCases: Array<{ name: string; symptoms: string }> | null,
): AnalysisResult {
  const caseSymptoms = (sampleCases || [])
    .map((c) => c?.symptoms || "")
    .filter(Boolean)
    .join(" ");
  const text = `${disease} ${problemSummary || ""} ${caseSymptoms}`.toLowerCase();

  const scores: Record<FactorKey, number> = {
    air: 45,
    water: 45,
    traffic: 45,
    noise: 45,
  };
  const segments: string[] = [];

  if (hasAny(text, keywordSets.respiratory)) {
    scores.air += 60;
    scores.traffic += 30;
    scores.noise += 10;
    segments.push("Respiratory Cluster");
  }
  if (hasAny(text, keywordSets.waterborne)) {
    scores.water += 70;
    scores.air += 10;
    segments.push("Water-Borne Cluster");
  }
  if (hasAny(text, keywordSets.vectorBorne)) {
    scores.water += 50;
    scores.noise += 10;
    segments.push("Vector-Borne Cluster");
  }
  if (hasAny(text, keywordSets.stressNoise)) {
    scores.noise += 55;
    scores.traffic += 35;
    segments.push("Stress/Neuro Cluster");
  }
  if (hasAny(text, keywordSets.skinAllergy)) {
    scores.air += 35;
    scores.water += 30;
    segments.push("Skin/Allergy Cluster");
  }
  if (hasAny(text, keywordSets.cardiac)) {
    scores.traffic += 40;
    scores.air += 25;
    scores.noise += 20;
    segments.push("Cardio-Risk Cluster");
  }
  if (hasAny(text, keywordSets.metabolic)) {
    scores.traffic += 15;
    scores.noise += 15;
    segments.push("Metabolic Risk Cluster");
  }

  if (segments.length === 0) {
    segments.push("General Morbidity Cluster");
  }

  const crowdingBoost = clamp(patientCount * 4, 0, 35);
  scores.air += Math.round(crowdingBoost * 0.35);
  scores.water += Math.round(crowdingBoost * 0.35);
  scores.traffic += Math.round(crowdingBoost * 0.5);
  scores.noise += Math.round(crowdingBoost * 0.4);

  const sortedFactors = (Object.entries(scores) as Array<[FactorKey, number]>).sort(
    (a, b) => b[1] - a[1],
  );
  const [primary, secondary] = sortedFactors;

  const factors: EnvironmentalFactors = {
    traffic: trafficLevel(scores.traffic),
    airPollution: clamp(Math.round(35 + scores.air * 2.1), 40, 420),
    waterPollution: waterLevel(scores.water),
    noisePollution: noiseLevel(scores.noise),
    lastUpdated: new Date().toISOString(),
  };

  const actualCause = `Dominant drivers are ${factorLabels[primary[0]]} and ${factorLabels[secondary[0]]} for this disease/problem pattern.`;
  const recommendation = buildRecommendation(primary[0]);

  return { factors, actualCause, recommendation, segments };
}

async function analyzeWithGemini(
  area: string,
  disease: string,
  problemSummary: string | null,
  patientCount: number,
  sampleCases: Array<{ name: string; symptoms: string }> | null,
  fallback: AnalysisResult,
): Promise<AnalysisResult> {
  const validCases = (sampleCases || []).slice(0, 10).map((c) => ({
    name: c?.name || "Unknown",
    symptoms: (c?.symptoms || "").trim() || "Not reported",
  }));

  const prompt = `
You are a strict epidemiology reasoning assistant.
Use ONLY the provided cluster evidence. Do not invent causes.
If evidence is weak, say "Insufficient local evidence".

Area: ${area}
Disease/Condition: ${disease}
Cluster Size: ${patientCount}
Symptoms Summary: ${problemSummary || "Not specified"}
Sample Cases (same area + same disease): ${JSON.stringify(validCases, null, 2)}

Return ONLY valid JSON:
{
  "factors": {
    "traffic": "Low|Medium|High|Extreme",
    "airPollution": 50,
    "waterPollution": "Safe|Risky|Unsafe",
    "noisePollution": "Normal|High|Extreme"
  },
  "actualCause": "string",
  "recommendation": "string",
  "segments": ["string", "string"]
}`;

  const aiResult = await getAIReasoning(prompt);
  if (!aiResult) return fallback;

  try {
    const jsonStr = extractJsonObject(aiResult);
    if (!jsonStr) return fallback;
    const parsed = JSON.parse(jsonStr) as {
      factors?: Partial<EnvironmentalFactors>;
      actualCause?: string;
      recommendation?: string;
      segments?: string[];
    };

    const aiFactors = parsed.factors || {};
    const actualCause = parsed.actualCause?.trim() || "";
    const recommendation = parsed.recommendation?.trim() || "";
    const segments = Array.isArray(parsed.segments) ? parsed.segments.slice(0, 2) : [];
    const traffic = String(aiFactors.traffic || "");
    const water = String(aiFactors.waterPollution || "");
    const noise = String(aiFactors.noisePollution || "");
    const air =
      typeof aiFactors.airPollution === "number"
        ? clamp(Math.round(aiFactors.airPollution), 40, 420)
        : NaN;

    const isInsufficient =
      /insufficient local evidence/i.test(actualCause) ||
      /insufficient local evidence/i.test(recommendation);

    const validFactors =
      ["Low", "Medium", "High", "Extreme"].includes(traffic) &&
      ["Safe", "Risky", "Unsafe"].includes(water) &&
      ["Normal", "High", "Extreme"].includes(noise) &&
      Number.isFinite(air);

    if (
      isInsufficient ||
      !validFactors ||
      actualCause.length < 24 ||
      recommendation.length < 24 ||
      segments.length === 0
    ) {
      return {
        ...fallback,
        actualCause:
          fallback.actualCause +
          " Symptom evidence is limited in current records for this cluster.",
        recommendation:
          "Capture structured symptoms for each patient in this area cluster and re-run AI reasoning for higher confidence.",
      };
    }

    return {
      factors: {
        traffic,
        airPollution: air,
        waterPollution: water,
        noisePollution: noise,
        lastUpdated: new Date().toISOString(),
      },
      actualCause,
      recommendation,
      segments,
    };
  } catch (e) {
    console.error("Failed to parse Gemini response:", e);
    return fallback;
  }
}

export async function GET() {
  try {
    const sql = `
      WITH latest_condition AS (
        SELECT
          p.id AS patient_id,
          p.name AS patient_name,
          TRIM(p.address) AS area,
          COALESCE(NULLIF(TRIM(c.diagnosis), ''), NULLIF(TRIM(p.diagnosis), ''), 'General') AS disease,
          COALESCE(NULLIF(TRIM(c.symptoms_observed), ''), NULLIF(TRIM(p.symptoms), ''), '') AS problem
        FROM patients p
        LEFT JOIN LATERAL (
          SELECT diagnosis, symptoms_observed
          FROM consultations c
          WHERE c.patient_id = p.id
          ORDER BY c.consultation_date DESC, c.created_at DESC
          LIMIT 1
        ) c ON TRUE
        WHERE p.address IS NOT NULL
          AND TRIM(p.address) <> ''
      ), ranked AS (
        SELECT *,
          ROW_NUMBER() OVER (PARTITION BY area, disease ORDER BY patient_id DESC) AS rn
        FROM latest_condition
      )
      SELECT
        area,
        disease,
        NULLIF(STRING_AGG(DISTINCT NULLIF(problem, ''), ' | '), '') AS problem_summary,
        COUNT(*) AS patient_count,
        COUNT(NULLIF(problem, '')) AS symptom_evidence_count,
        COALESCE(
          JSON_AGG(JSON_BUILD_OBJECT('name', patient_name, 'symptoms', NULLIF(problem, '')) ORDER BY rn)
          FILTER (WHERE rn <= 5 AND NULLIF(problem, '') IS NOT NULL),
          '[]'::json
        ) AS sample_cases
      FROM ranked
      GROUP BY area, disease
      HAVING COUNT(*) >= 3
      ORDER BY patient_count DESC, area ASC
      LIMIT 10
    `;

    const res = await query(sql);
    const rows = (res.rows || []) as HotspotRow[];

    const hotspots = await Promise.all(
      rows.map(async (row) => {
        const count = Number(row.patient_count);
        const baseAnalysis = analyzeDiseaseAndProblem(
          row.disease,
          row.problem_summary,
          count,
          row.sample_cases,
        );

        // Gemini reasons from real same-area, same-disease patient rows from DB.
        const groundedAnalysis = await analyzeWithGemini(
          row.area,
          row.disease,
          row.problem_summary,
          count,
          row.sample_cases,
          baseAnalysis,
        );

        return {
          area: row.area,
          disease: row.disease,
          problemSummary: row.problem_summary || "Not specified",
          patient_count: count,
          symptomEvidenceCount: Number(row.symptom_evidence_count || 0),
          sampleCases: (row.sample_cases || []).slice(0, 3),
          environmentalFactors: groundedAnalysis.factors,
          actualCause: groundedAnalysis.actualCause,
          recommendation: groundedAnalysis.recommendation,
          segments: groundedAnalysis.segments,
          methodology: "Gemini reasoning on DB disease clusters with evidence fallback",
        };
      }),
    );

    return NextResponse.json({
      success: true,
      data: hotspots,
      summary: {
        totalHotspots: hotspots.length,
        mostAffectedArea: hotspots[0]?.area || "N/A",
        mostCommonDisease: hotspots[0]?.disease || "N/A",
      },
    });
  } catch (error) {
    console.error("Error in disease-hotspots API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
