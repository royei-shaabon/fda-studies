interface Airport4 {
  code: string;
  name: string;
  passengers: number;
  delayRatePercent: number;
}

const airports4: Airport4[] = [
  { code: "BOS", name: "Boston Logan", passengers: 12_500_000, delayRatePercent: 18 },
  { code: "PVD", name: "Providence", passengers: 2_100_000, delayRatePercent: 9 },
  { code: "BDL", name: "Bradley", passengers: 3_400_000, delayRatePercent: 12 },
  { code: "MHT", name: "Manchester-Boston", passengers: 1_800_000, delayRatePercent: 7 },
];


function scorePassengerVolume4(airport: Airport4): number {
  return airport.passengers / 1_000_000;
}

function scoreDelayPenalty4(airport: Airport4): number {
  return airport.delayRatePercent;
}


function scoreAirport4(airport: Airport4, weights: { volume: number; delay: number }): number {
  return (
    scorePassengerVolume4(airport) * weights.volume -
    scoreDelayPenalty4(airport) * weights.delay
  );
}



const airportScore4 = airports4.map((airport) => {
    return {
        name: airport.name,
        scoreA: scoreAirport4(airport, { volume: 1, delay: 1 }),
        scoreB: scoreAirport4(airport, { volume: 1, delay: 3 }),
    };
});

const sortedAirportScoreA4 = [...airportScore4].sort(
    (a,b) => b.scoreA-a.scoreA
);
const sortedAirportScoreB4 = [...airportScore4].sort(
    (a,b) => b.scoreB-a.scoreB
);

console.log ("Sorted by first volume: ",sortedAirportScoreA4);
console.log ("Sorted by second volume: ",sortedAirportScoreB4);