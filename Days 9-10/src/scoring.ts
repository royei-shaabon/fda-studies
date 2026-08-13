import type { T100Record, OnTimeRecord } from "./data/index";

// Stores the raw calculated metrics for one airport
export interface AirportMetrics {
  airport: string;
  historicalGrowth: number;
  currentPassengerScale: number;
  delayCongestion: number;
  longHaulShare: number;
}

// Stores the normalized 0-100 scores for one airport
export interface NormalizedScore {
  airport: string;
  growth: number;
  scale: number;
  delay: number;
  longHaul: number;
}

// Stores the complete scoring result for one airport
export interface FinalScore {
  airport: string;
  finalScore: number;
  rawMetrics: AirportMetrics;
  normalizedScores: NormalizedScore;
}

// Stores each metric's weighted contribution
export interface WeightedContributions {
  growth: number;
  scale: number;
  delay: number;
  longHaul: number;
}

// Stores each metric's share of the final score
export interface WeightedContributionShares {
  growth: number;
  scale: number;
  delay: number;
  longHaul: number;
}

// Represents one raw metric value before normalization
interface MetricInput {
  airportId: string;
  value: number;
}

// Represents one metric after percentile normalization
interface NormalizedMetric {
  airportId: string;
  score: number;
}

// Converts raw values into percentile scores from 0 to 100
export function percentileRank(values: MetricInput[]): NormalizedMetric[] {
  // Sort without changing the original array
  const sortedValues = [...values].sort((a, b) => a.value - b.value);

  // Return an empty result for empty input
  if (sortedValues.length === 0) {
    return [];
  }

  // A single airport receives the maximum score
  if (sortedValues.length === 1) {
    return [
      {
        airportId: sortedValues[0].airportId,
        score: 100,
      },
    ];
  }

  // Calculate a percentile score for every airport
  const normalizedValues = sortedValues.map((item) => {
    // Find the first matching position
    const firstIndex = sortedValues.findIndex(
      (value) => value.value === item.value,
    );

    // Track the last matching position
    let lastIndex = firstIndex;

    // Move forward through tied values
    while (
      lastIndex + 1 < sortedValues.length &&
      sortedValues[lastIndex + 1].value === item.value
    ) {
      lastIndex++;
    }

    // Give tied values their average rank
    const averageIndex = (firstIndex + lastIndex) / 2;

    // Convert rank to a 0-100 score
    const score = (averageIndex / (sortedValues.length - 1)) * 100;

    return {
      airportId: item.airportId,
      score,
    };
  });

  return normalizedValues;
}

// Calculates average annual YoY passenger growth
export function calculateHistoricalGrowth(
  records: T100Record[],
  airport: string,
): number {
  // Keep outbound records only
  const outboundRecords = records.filter((record) => record.origin === airport);

  // Track available months by year
  const monthsByYear: Record<number, Set<number>> = {};

  for (const record of outboundRecords) {
    const year = record.year;

    if (!monthsByYear[year]) {
      monthsByYear[year] = new Set<number>();
    }

    monthsByYear[year].add(record.month);
  }

  // Store yearly passenger totals
  const passengersByYear: Record<number, number> = {};

  for (const record of outboundRecords) {
    const year = record.year;

    if (passengersByYear[year] === undefined) {
      passengersByYear[year] = 0;
    }

    passengersByYear[year] += record.passengers;
  }

  // Keep complete years only
  const years = Object.keys(passengersByYear)
    .map(Number)
    .filter((year) => monthsByYear[year].size === 12)
    .sort((a, b) => a - b);

  // Store annual growth rates
  const yearlyGrowthRates: number[] = [];

  for (let i = 1; i < years.length; i++) {
    const previousYear = years[i - 1];
    const currentYear = years[i];

    const previousPassengers = passengersByYear[previousYear];

    const currentPassengers = passengersByYear[currentYear];

    // Avoid division by zero
    if (previousPassengers === 0) {
      continue;
    }

    const growthRate =
      (currentPassengers - previousPassengers) / previousPassengers;

    yearlyGrowthRates.push(growthRate);
  }

  // Return zero when no comparison exists
  if (yearlyGrowthRates.length === 0) {
    return 0;
  }

  // Sum annual growth rates
  const totalGrowth = yearlyGrowthRates.reduce(
    (sum, growthRate) => sum + growthRate,
    0,
  );

  // Return average annual YoY growth
  return totalGrowth / yearlyGrowthRates.length;
}

// Calculates current outbound passenger scale
export function calculateCurrentPassengerScale(
  records: T100Record[],
  airport: string,
): number {
  // Keep outbound records only
  const outboundRecords = records.filter((record) => record.origin === airport);

  // Store passengers by month
  const passengersByMonth: Record<number, number> = {};

  for (const record of outboundRecords) {
    // Build a sortable YYYYMM key
    const monthKey = record.year * 100 + record.month;

    if (passengersByMonth[monthKey] === undefined) {
      passengersByMonth[monthKey] = 0;
    }

    passengersByMonth[monthKey] += record.passengers;
  }

  // Sort newest to oldest
  const months = Object.keys(passengersByMonth)
    .map(Number)
    .sort((a, b) => b - a);

  // Keep latest 12 months
  const latest12Months = months.slice(0, 12);

  let totalPassengers = 0;

  // Sum passengers across the selected months
  for (const month of latest12Months) {
    totalPassengers += passengersByMonth[month];
  }

  return totalPassengers;
}

// Calculates the outbound departure delay rate
export function calculateDelayCongestion(
  records: OnTimeRecord[],
  airport: string,
): number {
  // Keep valid outbound delay records
  const departureRecords = records.filter(
    (record) => record.origin === airport && record.depDelayed15 !== null,
  );

  // Keep departures delayed by 15+ minutes
  const delayedDepartures = departureRecords.filter(
    (record) => record.depDelayed15 === 1,
  );

  // Avoid division by zero
  if (departureRecords.length === 0) {
    return 0;
  }

  return delayedDepartures.length / departureRecords.length;
}

// Calculates outbound long-haul passenger share
export function calculateLongHaulShare(
  records: T100Record[],
  airport: string,
): number {
  // Keep outbound records only
  const outboundRecords = records.filter((record) => record.origin === airport);

  let totalPassengers = 0;

  // Sum all outbound passengers
  for (const record of outboundRecords) {
    totalPassengers += record.passengers;
  }

  let longHaulPassengers = 0;

  // Sum passengers on segments over 1,864 miles
  for (const record of outboundRecords) {
    if (record.distanceMiles > 1864) {
      longHaulPassengers += record.passengers;
    }
  }

  // Avoid division by zero
  if (totalPassengers === 0) {
    return 0;
  }

  return longHaulPassengers / totalPassengers;
}

// Calculates latest same-month YoY passenger growth
export function calculateLatestMonthlyYoY(
  records: T100Record[],
  airport: string,
): number {
  // Keep outbound records only
  const outboundRecords = records.filter((record) => record.origin === airport);

  // Store passengers by month
  const passengersByMonth: Record<number, number> = {};

  for (const record of outboundRecords) {
    // Build a sortable YYYYMM key
    const monthKey = record.year * 100 + record.month;

    if (passengersByMonth[monthKey] === undefined) {
      passengersByMonth[monthKey] = 0;
    }

    passengersByMonth[monthKey] += record.passengers;
  }

  // Sort newest to oldest
  const months = Object.keys(passengersByMonth)
    .map(Number)
    .sort((a, b) => b - a);

  // Return zero if no monthly data exists
  if (months.length === 0) {
    return 0;
  }

  // Select the latest month
  const latestMonth = months[0];

  // Find the same month one year earlier
  const previousYearMonth = latestMonth - 100;

  // Return zero if comparison month is missing
  if (passengersByMonth[previousYearMonth] === undefined) {
    return 0;
  }

  const currentPassengers = passengersByMonth[latestMonth];

  const previousPassengers = passengersByMonth[previousYearMonth];

  // Avoid division by zero
  if (previousPassengers === 0) {
    return 0;
  }

  return (currentPassengers - previousPassengers) / previousPassengers;
}

// Defines the final scoring weights
const WEIGHTS = {
  growth: 0.4125,
  scale: 0.3375,
  delay: 0.1625,
  longHaul: 0.0875,
};

// Calculates each metric's contribution to the final score
export function calculateWeightedContributions(
  normalizedScores: NormalizedScore,
): WeightedContributions {
  return {
    growth: normalizedScores.growth * WEIGHTS.growth,

    scale: normalizedScores.scale * WEIGHTS.scale,

    delay: normalizedScores.delay * WEIGHTS.delay,

    longHaul: normalizedScores.longHaul * WEIGHTS.longHaul,
  };
}

// Calculates each metric's percentage of the final score
export function calculateWeightedContributionShares(
  normalizedScores: NormalizedScore
): WeightedContributionShares {

  const contributions =
    calculateWeightedContributions(normalizedScores);

  const total =
    contributions.growth +
    contributions.scale +
    contributions.delay +
    contributions.longHaul;

  // Avoid division by zero
  if (total === 0) {
    return {
      growth: 0,
      scale: 0,
      delay: 0,
      longHaul: 0,
    };
  }

  return {
    growth: (contributions.growth / total) * 100,
    scale: (contributions.scale / total) * 100,
    delay: (contributions.delay / total) * 100,
    longHaul: (contributions.longHaul / total) * 100,
  };
}

// Combines normalized metrics into one final score
export function calculateFinalScore(
  rawMetrics: AirportMetrics,
  normalizedScores: NormalizedScore,
): FinalScore {
  // Calculate deterministic weighted contributions
  const contributions = calculateWeightedContributions(normalizedScores);

  // Sum all weighted contributions
  const finalScore =
    contributions.growth +
    contributions.scale +
    contributions.delay +
    contributions.longHaul;

  // Return the explainable scoring result
  return {
    airport: rawMetrics.airport,
    finalScore,
    rawMetrics,
    normalizedScores,
  };
}