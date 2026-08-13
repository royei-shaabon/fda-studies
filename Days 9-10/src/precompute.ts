import { loadT100Data, loadOnTimeData, type DataQuery } from "./data/index";

import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  calculateHistoricalGrowth,
  calculateCurrentPassengerScale,
  calculateDelayCongestion,
  calculateLongHaulShare,
  calculateLatestMonthlyYoY,
  percentileRank,
  calculateFinalScore,
  type AirportMetrics,
  type NormalizedScore,
  type FinalScore,
} from "./scoring";

// Stores the full cached result for one airport
interface CachedAirportResult {
  finalScore: FinalScore;
  monthlyYoY: number;
}

// Stores the complete precomputed reference cache
interface ReferenceCache {
  computedAt: string;
  airports: Record<string, CachedAirportResult>;
}

// Fixed reference population used for percentile normalization
const referenceAirports = [
  "ATL",
  "LAX",
  "ORD",
  "DFW",
  "DEN",
  "JFK",
  "SFO",
  "SEA",
  "LAS",
  "MCO",
  "EWR",
  "CLT",
  "PHX",
  "IAH",
  "MIA",
  "BOS",
  "MSP",
  "DTW",
  "PHL",
  "LGA",
  "BWI",
  "SLC",
  "SAN",
  "IAD",
  "DCA",
  "TPA",
  "PDX",
  "HNL",
  "ANC",
  "SNA",
  "PVD",
  "BDL",
  "MHT",
];

// Historical T100 window used for sustained passenger growth
const historicalQuery: DataQuery = {
  airports: referenceAirports,
  startYear: 2022,
  startMonth: 1,
  endYear: 2025,
  endMonth: 12,
};

// Latest 12 available T100 months used for scale and long-haul share
const currentT100Query: DataQuery = {
  airports: referenceAirports,
  startYear: 2025,
  startMonth: 5,
  endYear: 2026,
  endMonth: 4,
};

// Window containing the latest month and the same month one year earlier
const monthlyYoYQuery: DataQuery = {
  airports: referenceAirports,
  startYear: 2025,
  startMonth: 4,
  endYear: 2026,
  endMonth: 4,
};

// On-Time Performance window used for the departure delay metric
const onTimeQuery: DataQuery = {
  airports: referenceAirports,
  startYear: 2025,
  startMonth: 7,
  endYear: 2026,
  endMonth: 6,
};

async function main() {
  // Load historical passenger data
  const historicalData = await loadT100Data(historicalQuery);

  // Load current passenger data
  const currentT100Data = await loadT100Data(currentT100Query);

  // Load data required for the latest monthly YoY comparison
  const monthlyYoYData = await loadT100Data(monthlyYoYQuery);

  // Load flight-level data used for departure delay calculations
  const onTimeData = await loadOnTimeData(onTimeQuery);

  // Calculate the four raw scoring metrics for every reference airport
  const rawMetrics: AirportMetrics[] = referenceAirports.map((airport) => ({
    airport,

    historicalGrowth: calculateHistoricalGrowth(historicalData, airport),

    currentPassengerScale: calculateCurrentPassengerScale(
      currentT100Data,
      airport,
    ),

    delayCongestion: calculateDelayCongestion(onTimeData, airport),

    longHaulShare: calculateLongHaulShare(currentT100Data, airport),
  }));

  // Normalize historical growth across the full reference population
  const normalizedGrowth = percentileRank(
    rawMetrics.map((metric) => ({
      airportId: metric.airport,
      value: metric.historicalGrowth,
    })),
  );

  // Normalize passenger scale across the full reference population
  const normalizedScale = percentileRank(
    rawMetrics.map((metric) => ({
      airportId: metric.airport,
      value: metric.currentPassengerScale,
    })),
  );

  // Normalize delay rates across the full reference population
  const normalizedDelay = percentileRank(
    rawMetrics.map((metric) => ({
      airportId: metric.airport,
      value: metric.delayCongestion,
    })),
  );

  // Normalize long-haul passenger share across the full reference population
  const normalizedLongHaul = percentileRank(
    rawMetrics.map((metric) => ({
      airportId: metric.airport,
      value: metric.longHaulShare,
    })),
  );

  // Combine all normalized component scores for each airport
  const normalizedScores: NormalizedScore[] = rawMetrics.map((metric) => ({
    airport: metric.airport,

    growth: normalizedGrowth.find((item) => item.airportId === metric.airport)!
      .score,

    scale: normalizedScale.find((item) => item.airportId === metric.airport)!
      .score,

    delay: normalizedDelay.find((item) => item.airportId === metric.airport)!
      .score,

    longHaul: normalizedLongHaul.find(
      (item) => item.airportId === metric.airport,
    )!.score,
  }));

  // Calculate the final weighted score for every airport
  const finalScores = rawMetrics.map((metric) => {
    // Find the normalized scores belonging to this airport
    const normalized = normalizedScores.find(
      (score) => score.airport === metric.airport,
    )!;

    // Reuse the existing Phase 2 weighted scoring function
    return calculateFinalScore(metric, normalized);
  });

  // Calculate latest monthly YoY as supporting context only
  const monthlyYoY = referenceAirports.map((airport) => ({
    airport,
    value: calculateLatestMonthlyYoY(monthlyYoYData, airport),
  }));

  // Create the airport lookup object used inside the cache
  const airports: Record<string, CachedAirportResult> = {};

  // Combine each final score with its monthly YoY context
  for (const finalScore of finalScores) {
    const monthly = monthlyYoY.find(
      (item) => item.airport === finalScore.airport,
    )!;

    airports[finalScore.airport] = {
      finalScore,
      monthlyYoY: monthly.value,
    };
  }

  // Build the complete cache object
  const cache: ReferenceCache = {
    computedAt: new Date().toISOString(),
    airports,
  };

  // Define where the cache JSON file will be saved
  const cachePath = join(process.cwd(), "data", "reference-cache.json");

  // Convert the cache to JSON and write it to disk
  await writeFile(cachePath, JSON.stringify(cache, null, 2), "utf-8");

  // Confirm that the cache was successfully created
  console.log(`Reference cache written to ${cachePath}`);
}

// Run the one-time precompute process
main().catch(console.error);
