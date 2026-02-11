// src/app/lib/types.ts
import type { PhotoAIResult, BidAIResult } from "./aiSchemas";

/**
 * IMPORTANT:
 * History uses createdAt as an ISO string so it sorts/prints cleanly
 * and survives JSON serialization.
 */
export type ResultMeta = {
  id: string;
  createdAt?: string; // ISO string (set by saveToHistory)
};

export type PhotoAnalysisResult = PhotoAIResult &
  ResultMeta & {
    kind: "photo";
  };

export type BidAnalysisResult = BidAIResult &
  ResultMeta & {
    kind: "bid";
  };

// Used by Ask/Question page to reference either result
export type AnyResult = PhotoAnalysisResult | BidAnalysisResult;
