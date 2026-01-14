// src/app/lib/aiSchemas.ts
import { z } from "zod";

/** PHOTO RESULT */
export const PhotoResultSchema = z.object({
  id: z.string(),
  kind: z.literal("photo"),
  identified: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
  looksGood: z.array(z.string()).default([]),
  issues: z.array(z.string()).default([]),
  typicalFixCost: z.object({
    minor: z.string(),
    moderate: z.string(),
    major: z.string(),
  }),
  suggestedQuestions: z.array(z.string()).default([]),
});

export type PhotoAIResult = z.infer<typeof PhotoResultSchema>;

/** BID RESULT */
export const BidResultSchema = z.object({
  id: z.string(),
  kind: z.literal("bid"),
  included: z.array(z.string()).default([]),
  missing: z.array(z.string()).default([]),
  redFlags: z.array(z.string()).default([]),
  typicalRange: z.object({
    low: z.string(),
    mid: z.string(),
    high: z.string(),
  }),
  questionsToAsk: z.array(z.string()).default([]),
});

export type BidAIResult = z.infer<typeof BidResultSchema>;

/** ASK RESULT */
export const AskResultSchema = z.object({
  answer: z.string(),
});

export type AskAIResult = z.infer<typeof AskResultSchema>;
