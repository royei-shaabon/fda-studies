import { loadReferenceCache } from "./referenceCache";

import {
  getAirportMetric,
  rankAirports,
  runTool,
} from "./tools";


// Runs smoke tests for tool handlers and validation
async function main() {
  const cache = await loadReferenceCache();


  // Test a supported metric request
  const supportedMetricResult = getAirportMetric(cache, {
    airports: ["LAX"],
    metric: "long_haul_share",
  });

  console.log("Supported metric test:");
  console.log(supportedMetricResult);


  // Test an unsupported airport
  const unsupportedMetricResult = getAirportMetric(cache, {
    airports: ["XYZ"],
    metric: "delay_rate",
  });

  console.log("Unsupported airport test:");
  console.log(unsupportedMetricResult);


  // Test ranking by supported region
  const newEnglandResult = rankAirports(cache, {
    region: "New England",
  });

  console.log("New England ranking test:");
  console.log(newEnglandResult);


  // Test ranking by explicit airport list
  const airportRankingResult = rankAirports(cache, {
    airports: ["LAX", "SNA"],
  });

  console.log("Airport ranking test:");
  console.log(airportRankingResult);


  // Test an unsupported region
  const unsupportedRegionResult = rankAirports(cache, {
    region: "Pacific Northwest",
  });

  console.log("Unsupported region test:");
  console.log(unsupportedRegionResult);


  // Test invalid request with both input sources
  const invalidRequestResult = rankAirports(cache, {
    airports: ["LAX"],
    region: "New England",
  });

  console.log("Invalid request test:");
  console.log(invalidRequestResult);


  // Test malformed metric tool input
  const invalidMetricInput = runTool(
    cache,
    "get_airport_metric",
    {
      airports: ["LAX"],
      metric: "fake_metric",
    },
  );

  console.log("Invalid metric input test:");
  console.log(invalidMetricInput);


  // Test malformed ranking tool input
  const invalidRankingInput = runTool(
    cache,
    "rank_airports",
    {
      airports: "LAX",
    },
  );

  console.log("Invalid ranking input test:");
  console.log(invalidRankingInput);


  // Test Top 5 limit
  const topFiveResult = rankAirports(cache, {
    airports: [
      "ATL",
      "LAX",
      "ORD",
      "DFW",
      "DEN",
      "JFK",
      "SFO",
    ],
  });

  console.log("Top 5 test:");
  console.log(topFiveResult);
}


// Run all smoke tests
main().catch(console.error);