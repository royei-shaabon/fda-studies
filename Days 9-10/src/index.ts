import {
    loadT100Data,
    loadOnTimeData,
    type DataQuery,
} from "./data/index";

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
} from "./scoring";


async function main() {

    // Defines the airports used in the current integration test
    const airports = ["LAX", "SNA"];


    // Defines the historical T100 period used for annual passenger growth
    // Starts in 2022 to avoid COVID recovery years distorting the trend
    const historicalQuery: DataQuery = {
        airports,
        startYear: 2022,
        startMonth: 1,
        endYear: 2025,
        endMonth: 12,
    };


    // Defines the latest 12 available T100 months
    // Used for passenger scale and long-haul passenger share
    const currentT100Query: DataQuery = {
        airports,
        startYear: 2025,
        startMonth: 5,
        endYear: 2026,
        endMonth: 4,
    };


    // Includes the latest available month and the same month one year earlier
    // Used only for the latest monthly Year-over-Year passenger trend
    const monthlyYoYQuery: DataQuery = {
        airports,
        startYear: 2025,
        startMonth: 4,
        endYear: 2026,
        endMonth: 4,
    };


    // Defines the available On-Time Performance period
    // Used for outbound departure delay calculations
    const onTimeQuery: DataQuery = {
        airports,
        startYear: 2025,
        startMonth: 7,
        endYear: 2026,
        endMonth: 6,
    };


    // Loads historical passenger data for the annual growth metric
    const historicalT100Data =
        await loadT100Data(historicalQuery);


    // Loads the latest 12 months of passenger data
    const currentT100Data =
        await loadT100Data(currentT100Query);


    // Loads the data required for latest-month YoY comparison
    const monthlyYoYT100Data =
        await loadT100Data(monthlyYoYQuery);


    // Loads flight-level On-Time Performance data for the delay metric
    const onTimeData =
        await loadOnTimeData(onTimeQuery);


    // Calculates the four raw scoring metrics for each airport
    const rawMetrics: AirportMetrics[] = airports.map(airport => ({
        airport,

        // Average annual passenger growth across complete historical years
        historicalGrowth:
            calculateHistoricalGrowth(
                historicalT100Data,
                airport
            ),

        // Total outbound passengers across the latest 12 available months
        currentPassengerScale:
            calculateCurrentPassengerScale(
                currentT100Data,
                airport
            ),

        // Share of outbound departures delayed by 15 minutes or more
        delayCongestion:
            calculateDelayCongestion(
                onTimeData,
                airport
            ),

        // Share of outbound passengers traveling more than 1,864 miles
        longHaulShare:
            calculateLongHaulShare(
                currentT100Data,
                airport
            ),
    }));


    // Calculates latest monthly YoY passenger growth as context only
    // This metric does not participate in the final weighted score
    const monthlyYoY = airports.map(airport => ({
        airport,
        monthlyYoY:
            calculateLatestMonthlyYoY(
                monthlyYoYT100Data,
                airport
            ),
    }));


    // Normalizes historical growth values into relative 0-100 scores
    const normalizedGrowth = percentileRank(
        rawMetrics.map(metric => ({
            airportId: metric.airport,
            value: metric.historicalGrowth,
        }))
    );


    // Normalizes passenger scale values into relative 0-100 scores
    const normalizedScale = percentileRank(
        rawMetrics.map(metric => ({
            airportId: metric.airport,
            value: metric.currentPassengerScale,
        }))
    );


    // Normalizes departure delay rates into relative 0-100 scores
    const normalizedDelay = percentileRank(
        rawMetrics.map(metric => ({
            airportId: metric.airport,
            value: metric.delayCongestion,
        }))
    );


    // Normalizes long-haul passenger shares into relative 0-100 scores
    const normalizedLongHaul = percentileRank(
        rawMetrics.map(metric => ({
            airportId: metric.airport,
            value: metric.longHaulShare,
        }))
    );


    // Combines the four normalized metric scores for each airport
    const normalizedScores: NormalizedScore[] =
        rawMetrics.map(metric => ({
            airport: metric.airport,

            // Finds the normalized growth score for this airport
            growth:
                normalizedGrowth.find(
                    item => item.airportId === metric.airport
                )!.score,

            // Finds the normalized passenger scale score for this airport
            scale:
                normalizedScale.find(
                    item => item.airportId === metric.airport
                )!.score,

            // Finds the normalized delay score for this airport
            delay:
                normalizedDelay.find(
                    item => item.airportId === metric.airport
                )!.score,

            // Finds the normalized long-haul score for this airport
            longHaul:
                normalizedLongHaul.find(
                    item => item.airportId === metric.airport
                )!.score,
        }));


    // Applies the metric weights and creates the final explainable score
    const finalScores = rawMetrics.map(metric => {

        // Finds the normalized scores that belong to this airport
        const normalized = normalizedScores.find(
            score => score.airport === metric.airport
        )!;

        // Combines raw metrics and normalized scores into the final result
        return calculateFinalScore(
            metric,
            normalized
        );
    });


    // Displays raw business metrics before normalization
    console.log("Raw Metrics:", rawMetrics);

    // Displays the latest monthly YoY trend as supporting context
    console.log("Latest Monthly YoY:", monthlyYoY);

    // Displays the final weighted scores and their full breakdown
    console.log("Final Scores:", finalScores);
}


// Runs the integration flow and prints any unexpected error
main().catch(console.error);