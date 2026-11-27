import type { SafetyFlag } from "@/contracts";

export const EMERGENCY_FIXED_REPLY =
  "If this is urgent, call 112 or go to the nearest hospital.";

const EMERGENCY_PATTERNS: RegExp[] = [
  /\bchest\s*pain\b/i,
  /\btrouble\s*breathing\b/i,
  /\bcan'?t\s*breathe\b/i,
  /\bcannot\s*breathe\b/i,
  /\bdifficulty\s*breathing\b/i,
  /\bshortness\s*of\s*breath\b/i,
  /\bsevere\s*wheez/i,
  /\bfaint(ing|ed)?\b/i,
  /\bblue\s*lips\b/i,
  /\bsuffocat/i,
];

const SYMPTOM_PATTERNS: RegExp[] = [
  /\bcough(ing)?\b/i,
  /\bwheez(e|ing)\b/i,
  /\bsore\s*throat\b/i,
  /\bthroat\s*irritation\b/i,
  /\bheadache\b/i,
  /\basthma\b/i,
  /\ballerg(y|ies)\b/i,
  /\bsinus\b/i,
  /\bburning\s*eyes\b/i,
  /\bitchy\s*eyes\b/i,
  /\bbreathless\b/i,
  /\bsymptom(s)?\b/i,
  /\bfeel(ing)?\s*sick\b/i,
];

/**
 * Deterministic rule-based safety classifier (zero Gemini calls).
 */
export function classifySafety(message: string): SafetyFlag {
  for (const re of EMERGENCY_PATTERNS) {
    if (re.test(message)) return "emergency";
  }
  for (const re of SYMPTOM_PATTERNS) {
    if (re.test(message)) return "health_symptom";
  }
  return "none";
}
