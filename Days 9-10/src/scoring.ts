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


// Converts raw metric values into relative percentile scores from 0 to 100
export function percentileRank(
    values: MetricInput[]
): NormalizedMetric[] {

    // Sort values from lowest to highest without changing the original array
    const sortedValues = [...values].sort(
        (a, b) => a.value - b.value
    );

    // Return an empty result if no values were provided
    if (sortedValues.length === 0) {
        return [];
    }

    // A single airport receives the maximum score
    if (sortedValues.length === 1) {
        return [{
            airportId: sortedValues[0].airportId,
            score: 100,
        }];
    }

    // Calculate the percentile score for every airport
    const normalizedValues = sortedValues.map((item) => {

        // Find the first position of this value
        const firstIndex = sortedValues.findIndex(
            value => value.value === item.value
        );

        // Start by assuming this is also the last position
        let lastIndex = firstIndex;

        // Move forward while additional airports have the same value
        while (
            lastIndex + 1 < sortedValues.length &&
            sortedValues[lastIndex + 1].value === item.value
        ) {
            lastIndex++;
        }

        // Use the average position so tied values receive the same score
        const averageIndex = (firstIndex + lastIndex) / 2;

        // Convert the position into a score between 0 and 100
        const score =
            (averageIndex / (sortedValues.length - 1)) * 100;

        return {
            airportId: item.airportId,
            score,
        };
    });

    return normalizedValues;
}


// Calculates average annual YoY passenger growth using full years only
export function calculateHistoricalGrowth(
    records: T100Record[],
    airport: string
): number {

    // Keep only outbound records from the selected airport
    const outboundRecords = records.filter(
        record => record.origin === airport
    );

    // Track which months exist for each year
    const monthsByYear: Record<number, Set<number>> = {};

    for (const record of outboundRecords) {
        const year = record.year;

        // Create a month set when the year is first seen
        if (!monthsByYear[year]) {
            monthsByYear[year] = new Set<number>();
        }

        // Add the current month to the year
        monthsByYear[year].add(record.month);
    }

    // Store total outbound passengers for each year
    const passengersByYear: Record<number, number> = {};

    for (const record of outboundRecords) {
        const year = record.year;

        // Initialize the yearly passenger total
        if (passengersByYear[year] === undefined) {
            passengersByYear[year] = 0;
        }

        // Add this record's passengers to the yearly total
        passengersByYear[year] += record.passengers;
    }

    // Keep only complete years with all 12 months and sort chronologically
    const years = Object.keys(passengersByYear)
        .map(Number)
        .filter(year => monthsByYear[year].size === 12)
        .sort((a, b) => a - b);

    // Store each annual YoY growth rate
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

        // Calculate YoY passenger growth
        const growthRate =
            (currentPassengers - previousPassengers) /
            previousPassengers;

        yearlyGrowthRates.push(growthRate);
    }

    // Return zero when no valid YoY comparison exists
    if (yearlyGrowthRates.length === 0) {
        return 0;
    }

    // Sum all annual growth rates
    const totalGrowth = yearlyGrowthRates.reduce(
        (sum, growthRate) => sum + growthRate,
        0
    );

    // Return the average annual YoY growth rate
    const averageGrowth =
        totalGrowth / yearlyGrowthRates.length;

    return averageGrowth;
}


// Calculates outbound passenger volume over the latest 12 available months
export function calculateCurrentPassengerScale(
    records: T100Record[],
    airport: string
): number {

    // Keep only outbound records from the selected airport
    const outboundRecords = records.filter(
        record => record.origin === airport
    );

    // Store total passengers for each year-month
    const passengersByMonth: Record<number, number> = {};

    for (const record of outboundRecords) {

        // Create a sortable YYYYMM key, for example 202604
        const monthKey = record.year * 100 + record.month;

        // Initialize the monthly passenger total
        if (passengersByMonth[monthKey] === undefined) {
            passengersByMonth[monthKey] = 0;
        }

        // Add this record's passengers to the monthly total
        passengersByMonth[monthKey] += record.passengers;
    }

    // Sort months from newest to oldest
    const months = Object.keys(passengersByMonth)
        .map(Number)
        .sort((a, b) => b - a);

    // Keep only the latest 12 available months
    const latest12Months = months.slice(0, 12);

    // Sum passengers across the selected 12 months
    let totalPassengers = 0;

    for (const month of latest12Months) {
        totalPassengers += passengersByMonth[month];
    }

    return totalPassengers;
}


// Calculates the share of outbound flights delayed by 15 minutes or more
export function calculateDelayCongestion(
    records: OnTimeRecord[],
    airport: string
): number {

    // Keep outbound flights with a valid DepDel15 value
    const departureRecords = records.filter(
        record =>
            record.origin === airport &&
            record.depDelayed15 !== null
    );

    // Keep only flights delayed by at least 15 minutes
    const delayedDepartures = departureRecords.filter(
        record => record.depDelayed15 === 1
    );

    // Avoid division by zero when no valid departures exist
    if (departureRecords.length === 0) {
        return 0;
    }

    // Calculate delayed departures as a share of valid departures
    const delayRate =
        delayedDepartures.length / departureRecords.length;

    return delayRate;
}


// Calculates the share of outbound passengers traveling on long-haul segments
export function calculateLongHaulShare(
    records: T100Record[],
    airport: string
): number {

    // Keep only outbound records from the selected airport
    const outboundRecords = records.filter(
        record => record.origin === airport
    );

    // Calculate total outbound passengers
    let totalPassengers = 0;

    for (const record of outboundRecords) {
        totalPassengers += record.passengers;
    }

    // Calculate passengers traveling more than 1,864 miles (~3,000 km)
    let longHaulPassengers = 0;

    for (const record of outboundRecords) {
        if (record.distanceMiles > 1864) {
            longHaulPassengers += record.passengers;
        }
    }

    // Avoid division by zero
    if (totalPassengers === 0) {
        return 0;
    }

    // Calculate long-haul passengers as a share of all outbound passengers
    const longHaulShare =
        longHaulPassengers / totalPassengers;

    return longHaulShare;
}


// Calculates passenger YoY growth for the latest available month
export function calculateLatestMonthlyYoY(
    records: T100Record[],
    airport: string
): number {

    // Keep only outbound records from the selected airport
    const outboundRecords = records.filter(
        record => record.origin === airport
    );

    // Store total passengers for each year-month
    const passengersByMonth: Record<number, number> = {};

    for (const record of outboundRecords) {

        // Create a sortable YYYYMM key
        const monthKey = record.year * 100 + record.month;

        // Initialize the monthly passenger total
        if (passengersByMonth[monthKey] === undefined) {
            passengersByMonth[monthKey] = 0;
        }

        // Add this record's passengers to the monthly total
        passengersByMonth[monthKey] += record.passengers;
    }

    // Sort months from newest to oldest
    const months = Object.keys(passengersByMonth)
        .map(Number)
        .sort((a, b) => b - a);

    // Return zero if the airport has no monthly passenger data
    if (months.length === 0) {
        return 0;
    }

    // Select the most recent available month
    const latestMonth = months[0];

    // Find the same calendar month one year earlier
    const previousYearMonth = latestMonth - 100;

    // Return zero if the previous year's matching month is unavailable
    if (passengersByMonth[previousYearMonth] === undefined) {
        return 0;
    }

    const currentPassengers =
        passengersByMonth[latestMonth];

    const previousPassengers =
        passengersByMonth[previousYearMonth];

    // Avoid division by zero
    if (previousPassengers === 0) {
        return 0;
    }

    // Calculate same-month Year-over-Year passenger growth
    return (
        currentPassengers - previousPassengers
    ) / previousPassengers;
}


// Defines the final scoring weight of each normalized metric
const WEIGHTS = {
    growth: 0.4125,
    scale: 0.3375,
    delay: 0.1625,
    longHaul: 0.0875,
};


// Combines normalized metric scores into one weighted final score
export function calculateFinalScore(
    rawMetrics: AirportMetrics,
    normalizedScores: NormalizedScore
): FinalScore {

    // Apply the predefined weight to each normalized score
    const finalScore =
        normalizedScores.growth * WEIGHTS.growth +
        normalizedScores.scale * WEIGHTS.scale +
        normalizedScores.delay * WEIGHTS.delay +
        normalizedScores.longHaul * WEIGHTS.longHaul;

    // Return the score together with its explainable breakdown
    return {
        airport: rawMetrics.airport,
        finalScore,
        rawMetrics,
        normalizedScores,
    };
}