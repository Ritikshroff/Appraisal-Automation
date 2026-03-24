import { GoogleGenerativeAI } from "@google/generative-ai";

import { buildFallbackAnalysis, getSentimentLabel, normalizeSentimentScore } from "@/lib/appraisal";
import type { PerformanceAnalysis } from "@/lib/types";

type AnalysisInput = {
  employeeName: string;
  designation: string;
  teamName: string;
  appraisalType: string;
  appraisalPeriod: string;
  fullText: string;
  managerOverallRating: number | null;
  finalRating: number | null;
};

const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const API_KEY = process.env.GOOGLE_API_KEY || "";

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

function normalizeModelOutput(input: Partial<PerformanceAnalysis>, fallback: PerformanceAnalysis): PerformanceAnalysis {
  const sentimentScore = normalizeSentimentScore(
    typeof input.sentimentScore === "number" ? input.sentimentScore : fallback.sentimentScore,
  );

  return {
    performanceSummary: input.performanceSummary?.trim() || fallback.performanceSummary,
    sentimentLabel: input.sentimentLabel ?? getSentimentLabel(sentimentScore),
    sentimentScore,
    strengths: Array.isArray(input.strengths) && input.strengths.length ? input.strengths.slice(0, 4) : fallback.strengths,
    weaknesses:
      Array.isArray(input.weaknesses) && input.weaknesses.length ? input.weaknesses.slice(0, 4) : fallback.weaknesses,
    riskSignals:
      Array.isArray(input.riskSignals) && input.riskSignals.length
        ? input.riskSignals.slice(0, 4)
        : fallback.riskSignals,
    source: "gemini",
  };
}

/**
 * Enterprise Performance Analysis Prompt.
 * Designed to be UNBIASED and CONSISTENT across all evaluations.
 */
const SYSTEM_INSTRUCTIONS = `
You are a high-level Enterprise HR Analyst specializing in Objective Performance Calibration.
Your mission is to generate a Performance DNA summary that is entirely UNBIASED and uses the exact same criteria for everyone.

CRITICAL RUBRIC:
1. FOCUS ONLY on EVIDENCE: Base your analysis only on the achievements, metrics, and behaviors explicitly written in the provided text.
2. DISREGARD UNRELATED FACTORS: Ignore tenure, personal context, or characteristics like gender/ethnicity.
3. BEHAVIORAL CONSISTENCY: Map adjectives (like 'strong', 'consistent', 'exceptional') to documented outcomes.
4. CALIBRATE: Compare the Manager's rating with the textual evidence. Highlight if the rating is higher or lower than what the evidence suggests.
5. JSON OUTPUT: You must respond ONLY with a JSON object following the schema provided.

RATING SCALE (Sentiment Score):
0.0 - 0.35: CONCERNING (Major performance gaps documented)
0.36 - 0.57: MIXED (Some goals met, but with significant blockers or missed targets)
0.58 - 0.77: NEUTRAL (Met all standard expectations, reliable delivery)
0.78 - 0.89: POSITIVE (Exceeded expectations in scope or impact)
0.90 - 1.00: EXCEPTIONAL (Consistently outperformed and drove cross-team value)
`;

export async function generatePerformanceAnalysis(input: AnalysisInput): Promise<PerformanceAnalysis> {
  const fallback = buildFallbackAnalysis(input);

  if (!genAI) {
    return fallback;
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: MODEL,
      systemInstruction: SYSTEM_INSTRUCTIONS,
    });

    const prompt = `Analyze this performance appraisal data and output JSON.
    Data:
    Employee: ${input.employeeName}
    Role: ${input.designation} in ${input.teamName}
    Appraisal Type: ${input.appraisalType} (${input.appraisalPeriod})
    Manager Rating: ${input.managerOverallRating ?? 'N/A'}
    Narrative Evidence: ${input.fullText}
    
    Return strict JSON with fields: performanceSummary, sentimentLabel, sentimentScore, strengths, weaknesses, riskSignals.
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const responseText = result.response.text();
    const parsed = JSON.parse(responseText) as Partial<PerformanceAnalysis>;

    return normalizeModelOutput(parsed, fallback);
  } catch (error) {
    console.error("Gemini enterprise appraisal analysis failed. Falling back to deterministic analysis.", error);
    return fallback;
  }
}
