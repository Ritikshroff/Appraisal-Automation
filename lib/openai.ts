import OpenAI from "openai";

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

const MODEL = process.env.OPENAI_MODEL || "gpt-5.2";

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

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
    source: "openai",
  };
}

export async function generatePerformanceAnalysis(input: AnalysisInput): Promise<PerformanceAnalysis> {
  const fallback = buildFallbackAnalysis(input);

  if (!client) {
    return fallback;
  }

  try {
    const response = await client.responses.create({
      model: MODEL,
      instructions:
        "You are an enterprise HR appraisal analyst. Review the complete appraisal form and return a concise executive summary, sentiment, strengths, weaknesses, and risk signals as strict JSON.",
      input: JSON.stringify(input),
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "enterprise_appraisal_analysis",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              performanceSummary: {
                type: "string",
                description: "A concise 2-3 sentence summary of the full appraisal.",
              },
              sentimentLabel: {
                type: "string",
                enum: ["POSITIVE", "NEUTRAL", "MIXED", "CONCERNING"],
              },
              sentimentScore: {
                type: "number",
                minimum: 0,
                maximum: 1,
              },
              strengths: {
                type: "array",
                items: { type: "string" },
                minItems: 1,
                maxItems: 4,
              },
              weaknesses: {
                type: "array",
                items: { type: "string" },
                minItems: 1,
                maxItems: 4,
              },
              riskSignals: {
                type: "array",
                items: { type: "string" },
                minItems: 1,
                maxItems: 4,
              },
            },
            required: [
              "performanceSummary",
              "sentimentLabel",
              "sentimentScore",
              "strengths",
              "weaknesses",
              "riskSignals",
            ],
          },
        },
      },
    });

    const parsed = JSON.parse(response.output_text) as Partial<PerformanceAnalysis>;

    return normalizeModelOutput(parsed, fallback);
  } catch (error) {
    console.error("OpenAI enterprise appraisal analysis failed. Falling back to deterministic analysis.", error);
    return fallback;
  }
}
