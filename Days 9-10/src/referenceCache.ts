import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { FinalScore } from "./scoring";


// Stores the cached result for one airport
export interface CachedAirportResult {
  finalScore: FinalScore;
  monthlyYoY: number;
}


// Stores the complete reference cache
export interface ReferenceCache {
  computedAt: string;
  airports: Record<string, CachedAirportResult>;
}


// Defines the path to the precomputed cache file
const CACHE_PATH = join(
  process.cwd(),
  "data",
  "reference-cache.json"
);


// Validates the cached structure of one airport
function isCachedAirportResult(
  data: unknown
): data is CachedAirportResult {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const result = data as Record<string, unknown>;

  // FinalScore must exist as an object
  if (
    typeof result.finalScore !== "object" ||
    result.finalScore === null
  ) {
    return false;
  }

  // Monthly YoY must be a numeric value
  if (typeof result.monthlyYoY !== "number") {
    return false;
  }

  return true;
}


// Validates the overall reference cache structure
function isReferenceCache(
  data: unknown
): data is ReferenceCache {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const cache = data as Record<string, unknown>;

  // The cache must contain a creation timestamp
  if (typeof cache.computedAt !== "string") {
    return false;
  }

  // The airports field must be an object
  if (
    typeof cache.airports !== "object" ||
    cache.airports === null
  ) {
    return false;
  }

  const airports =
    cache.airports as Record<string, unknown>;

  // Every airport entry must match CachedAirportResult
  if (
    !Object.values(airports).every(
      isCachedAirportResult
    )
  ) {
    return false;
  }

  return true;
}


// Loads, parses and validates the precomputed reference cache
export async function loadReferenceCache(): Promise<ReferenceCache> {

  // Read the JSON cache file as text
  const content = await readFile(
    CACHE_PATH,
    "utf-8"
  );

  // Treat parsed JSON as unknown until it is validated
  const parsed: unknown = JSON.parse(content);

  // Reject invalid or outdated cache structures
  if (!isReferenceCache(parsed)) {
    throw new Error("Invalid reference cache");
  }

  // TypeScript now knows parsed is a valid ReferenceCache
  return parsed;
}