// src/app/lib/types.ts

import type { PhotoAIResult, BidAIResult } from "./aiSchemas";

export type ResultMeta = {
  id: string;
  createdAt: number; // Date.now()
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
