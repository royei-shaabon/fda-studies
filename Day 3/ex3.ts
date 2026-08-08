interface Airport2 {
  code: string;
  name: string;
  passengers: number;
  delayRatePercent: number;
}

const airports2: Airport2[] = [
  { code: "BOS", name: "Boston Logan", passengers: 12_500_000, delayRatePercent: 18 },
  { code: "PVD", name: "Providence", passengers: 2_100_000, delayRatePercent: 9 },
  { code: "BDL", name: "Bradley", passengers: 3_400_000, delayRatePercent: 12 },
  { code: "MHT", name: "Manchester-Boston", passengers: 1_800_000, delayRatePercent: 7 },
];

function scoreCapacityUtilization(airport: Airport2): number {
  return airport.passengers / 1_000_000 - airport.delayRatePercent;
}

function scoreAirport(airport: Airport2): number {
  return scoreCapacityUtilization(airport);
}

const airportScore = airports2.map((airport) => {
    return {
        name: airport.name,
        score: scoreAirport(airport),
    };
});

console.log(airportScore);