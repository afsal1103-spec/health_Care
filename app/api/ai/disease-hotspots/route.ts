import { NextResponse } from "next/server";
import { query } from "@/lib/db";

type FactorKey = "air" | "water" | "traffic" | "noise";

type HotspotRow = {
  area: string;
  disease: string;
  problem_summary: string | null;
  patient_count: string | number;
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

function analyzeDiseaseAndProblem(
  disease: string,
  problemSummary: string | null,
  patientCount: number,
): AnalysisResult {
  const text = `${disease} ${problemSummary || ""}`.toLowerCase();

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

export async function GET() {
  try {
    const sql = `
      WITH latest_condition AS (
        SELECT
          p.id AS patient_id,
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
      )
      SELECT
        area,
        disease,
        NULLIF(STRING_AGG(DISTINCT NULLIF(problem, ''), ' | '), '') AS problem_summary,
        COUNT(*) AS patient_count
      FROM latest_condition
      GROUP BY area, disease
      HAVING COUNT(*) >= 2
      ORDER BY patient_count DESC, area ASC
      LIMIT 50
    `;

    const res = await query(sql);
    const hotspots = (res.rows || []) as HotspotRow[];

    const enrichedHotspots = hotspots.map((hotspot) => {
      const patientCount = Number(hotspot.patient_count || 0);
      const analysis = analyzeDiseaseAndProblem(
        hotspot.disease,
        hotspot.problem_summary,
        patientCount,
      );

      return {
        area: hotspot.area,
        disease: hotspot.disease,
        problemSummary: hotspot.problem_summary || "Not specified",
        patient_count: patientCount,
        environmentalFactors: analysis.factors,
        actualCause: analysis.actualCause,
        recommendation: analysis.recommendation,
        segments: analysis.segments,
        methodology: "Dynamic disease/problem correlation model",
      };
    });

    return NextResponse.json({
      success: true,
      data: enrichedHotspots,
      summary: {
        totalHotspots: enrichedHotspots.length,
        mostAffectedArea: enrichedHotspots[0]?.area || "N/A",
        mostCommonDisease: enrichedHotspots[0]?.disease || "N/A",
      },
    });
  } catch (error) {
    console.error("Error in disease-hotspots API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

