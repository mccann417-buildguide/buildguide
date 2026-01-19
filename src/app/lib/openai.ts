// src/app/lib/openai.ts
import OpenAI from "openai";

export function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

/**
 * IMPORTANT:
 * - Never create OpenAI client at module scope in route files.
 * - Always create it inside the handler (POST/GET), so builds don’t crash.
 */
export function getOpenAI() {
  const apiKey = requireEnv("OPENAI_API_KEY");
  return new OpenAI({ apiKey });
}
