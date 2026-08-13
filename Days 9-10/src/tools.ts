import type { ReferenceCache } from "./referenceCache";

import {
  calculateWeightedContributions,
  calculateWeightedContributionShares,
} from "./scoring";


// Supported metric names
export type AirportMetricName =
  | "historical_growth"
  | "passenger_scale"
  | "delay_rate"
  | "long_haul_share"
  | "monthly_yoy";


// Supported metric values for runtime validation
const AIRPORT_METRICS: AirportMetricName[] = [
  "historical_growth",
  "passenger_scale",
  "delay_rate",
  "long_haul_share",
  "monthly_yoy",
];


// Input for the metric tool
export interface GetAirportMetricInput {
  airports: string[];
  metric: AirportMetricName;
}


// Result for one airport
export interface AirportMetricResult {
  airport: string;
  metric: AirportMetricName;
  rawValue: number;
  normalizedScore: number | null;
}


// Success or structured error output
export type GetAirportMetricOutput =
  | {
      ok: true;
      results: AirportMetricResult[];
    }
  | {
      ok: false;
      error: "unsupported_airport";
      airports: string[];
    };


// Validates metric tool input
function isGetAirportMetricInput(
  data: unknown,
): data is GetAirportMetricInput {

  if (typeof data !== "object" || data === null) {
    return false;
  }

  const input =
    data as Record<string, unknown>;


  if (
    !Array.isArray(input.airports) ||
    !input.airports.every(
      (airport) => typeof airport === "string",
    )
  ) {
    return false;
  }


  if (
    typeof input.metric !== "string" ||
    !AIRPORT_METRICS.includes(
      input.metric as AirportMetricName,
    )
  ) {
    return false;
  }


  return true;
}


// Returns one metric for one or more airports
export function getAirportMetric(
  cache: ReferenceCache,
  input: GetAirportMetricInput,
): GetAirportMetricOutput {

  // Find unsupported airports
  const unsupportedAirports =
    input.airports.filter(
      (airport) =>
        cache.airports[airport] === undefined,
    );


  // Return a clean error instead of crashing
  if (unsupportedAirports.length > 0) {
    return {
      ok: false,
      error: "unsupported_airport",
      airports: unsupportedAirports,
    };
  }


  // Build one result per airport
  const results: AirportMetricResult[] =
    input.airports.map((airport) => {

      const cachedAirport =
        cache.airports[airport];


      switch (input.metric) {

        case "historical_growth":
          return {
            airport,
            metric: input.metric,
            rawValue:
              cachedAirport.finalScore.rawMetrics
                .historicalGrowth,
            normalizedScore:
              cachedAirport.finalScore.normalizedScores
                .growth,
          };


        case "passenger_scale":
          return {
            airport,
            metric: input.metric,
            rawValue:
              cachedAirport.finalScore.rawMetrics
                .currentPassengerScale,
            normalizedScore:
              cachedAirport.finalScore.normalizedScores
                .scale,
          };


        case "delay_rate":
          return {
            airport,
            metric: input.metric,
            rawValue:
              cachedAirport.finalScore.rawMetrics
                .delayCongestion,
            normalizedScore:
              cachedAirport.finalScore.normalizedScores
                .delay,
          };


        case "long_haul_share":
          return {
            airport,
            metric: input.metric,
            rawValue:
              cachedAirport.finalScore.rawMetrics
                .longHaulShare,
            normalizedScore:
              cachedAirport.finalScore.normalizedScores
                .longHaul,
          };


        case "monthly_yoy":
          return {
            airport,
            metric: input.metric,
            rawValue:
              cachedAirport.monthlyYoY,
            normalizedScore: null,
          };
      }
    });


  return {
    ok: true,
    results,
  };
}


// Supported regions
const REGION_AIRPORTS: Record<string, string[]> = {
  new_england: [
    "BOS",
    "PVD",
    "BDL",
    "MHT",
  ],
};


// Input for the ranking tool
export interface RankAirportsInput {
  airports?: string[];
  region?: string;
}


// Validates ranking tool input
function isRankAirportsInput(
  data: unknown,
): data is RankAirportsInput {

  if (typeof data !== "object" || data === null) {
    return false;
  }

  const input =
    data as Record<string, unknown>;


  if (
    input.airports !== undefined &&
    (
      !Array.isArray(input.airports) ||
      !input.airports.every(
        (airport) => typeof airport === "string",
      )
    )
  ) {
    return false;
  }


  if (
    input.region !== undefined &&
    typeof input.region !== "string"
  ) {
    return false;
  }


  return true;
}


// Ranked result for one airport
export interface RankedAirportResult {
  airport: string;

  finalScore: number;

  rawMetrics: {
    historicalGrowth: number;
    currentPassengerScale: number;
    delayCongestion: number;
    longHaulShare: number;
  };

  normalizedScores: {
    growth: number;
    scale: number;
    delay: number;
    longHaul: number;
  };

  weightedContributions: {
    growth: number;
    scale: number;
    delay: number;
    longHaul: number;
  };

  weightedContributionShares: {
    growth: number;
    scale: number;
    delay: number;
    longHaul: number;
  };

  monthlyYoY: number;
}


// Success or structured error output
export type RankAirportsOutput =
  | {
      ok: true;
      results: RankedAirportResult[];
    }
  | {
      ok: false;
      error:
        | "invalid_request"
        | "unsupported_region"
        | "unsupported_airport";
      details?: string[];
    };


// Returns ranked airports from the precomputed cache
export function rankAirports(
  cache: ReferenceCache,
  input: RankAirportsInput,
): RankAirportsOutput {

  // Require exactly one input source
  const hasAirports =
    input.airports !== undefined;

  const hasRegion =
    input.region !== undefined;


  if (hasAirports === hasRegion) {
    return {
      ok: false,
      error: "invalid_request",
    };
  }


  // Resolve the requested airport list
  let requestedAirports: string[];


  if (input.region !== undefined) {

    const regionKey = input.region
      .toLowerCase()
      .replace(/\s+/g, "_");


    const regionAirports =
      REGION_AIRPORTS[regionKey];


    if (!regionAirports) {
      return {
        ok: false,
        error: "unsupported_region",
        details: [input.region],
      };
    }


    requestedAirports = regionAirports;

  } else {

    requestedAirports = input.airports!;
  }


  // Find airports missing from the cache
  const unsupportedAirports =
    requestedAirports.filter(
      (airport) =>
        cache.airports[airport] === undefined,
    );


  if (unsupportedAirports.length > 0) {
    return {
      ok: false,
      error: "unsupported_airport",
      details: unsupportedAirports,
    };
  }


  // Build results from cached values
  const results: RankedAirportResult[] =
    requestedAirports.map((airport) => {

      const cachedAirport =
        cache.airports[airport];


      return {
        airport,

        finalScore:
          cachedAirport.finalScore.finalScore,

        rawMetrics:
          cachedAirport.finalScore.rawMetrics,

        normalizedScores:
          cachedAirport.finalScore.normalizedScores,

        weightedContributions:
          calculateWeightedContributions(
            cachedAirport.finalScore.normalizedScores,
          ),

        weightedContributionShares:
          calculateWeightedContributionShares(
            cachedAirport.finalScore.normalizedScores,
          ),

        monthlyYoY:
          cachedAirport.monthlyYoY,
      };
    });


  // Rank from highest to lowest score
  results.sort(
    (a, b) => b.finalScore - a.finalScore,
  );


  // Return up to the top five airports
  return {
    ok: true,
    results: results.slice(0, 5),
  };
}


// Metric-specific tool schema
export const getAirportMetricTool = {
  name: "get_airport_metric",

  description:
    "Use this tool whenever the user asks about one specific airport metric, including comparisons across multiple airports. Questions about congestion, delays, or congestion levels MUST use this tool with metric='delay_rate'. Also use it for historical passenger growth, passenger scale, long-haul passenger share, or monthly YoY. Do not use the ranking tool for a single-metric question.",

  input_schema: {
    type: "object",

    properties: {
      airports: {
        type: "array",

        items: {
          type: "string",
        },

        description:
          "Airport IATA codes such as LAX, SNA, ANC, or SFO.",
      },

      metric: {
        type: "string",

        enum: [
          "historical_growth",
          "passenger_scale",
          "delay_rate",
          "long_haul_share",
          "monthly_yoy",
        ],

        description:
          "The specific deterministic metric to return.",
      },
    },

    required: [
      "airports",
      "metric",
    ],
  },
};


// Overall ranking tool schema
export const rankAirportsTool = {
  name: "rank_airports",

  description:
    "Use this tool only for overall Terminal Demand Pressure, airport ranking, terminal expansion candidacy, or identifying stronger investment/expansion candidates. Do NOT use this tool for questions asking only about congestion, delays, growth, passenger scale, long-haul share, or monthly YoY. For congestion or delay comparisons, use get_airport_metric with metric='delay_rate'.",

  input_schema: {
    type: "object",

    properties: {
      airports: {
        type: "array",

        items: {
          type: "string",
        },

        description:
          "Specific airport IATA codes to rank, such as LAX, SNA, ANC, or SFO.",
      },

      region: {
        type: "string",

        description:
          "A supported region name. Currently supported: New England.",
      },
    },
  },
};


// Runs the requested tool handler
export function runTool(
  cache: ReferenceCache,
  toolName: string,
  input: unknown,
) {

  switch (toolName) {

    case "get_airport_metric":

      // Validate external tool input
      if (!isGetAirportMetricInput(input)) {
        return {
          ok: false,
          error: "invalid_input",
        };
      }

      return getAirportMetric(
        cache,
        input,
      );


    case "rank_airports":

      // Validate external tool input
      if (!isRankAirportsInput(input)) {
        return {
          ok: false,
          error: "invalid_input",
        };
      }

      return rankAirports(
        cache,
        input,
      );


    default:
      return {
        ok: false,
        error: "unknown_tool",
      };
  }
}