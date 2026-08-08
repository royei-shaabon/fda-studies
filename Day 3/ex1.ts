interface Airport1 {
  code: string;
  name: string;
  passengers: number;
  delayRatePercent: number;
}

const airports: Airport1[] = [
  { code: "BOS", name: "Boston Logan", passengers: 12_500_000, delayRatePercent: 18 },
  { code: "PVD", name: "Providence", passengers: 2_100_000, delayRatePercent: 9 },
  { code: "BDL", name: "Bradley", passengers: 3_400_000, delayRatePercent: 12 },
  { code: "MHT", name: "Manchester-Boston", passengers: 1_800_000, delayRatePercent: 7 },
];

const airportName = airports.map((airport) => airport.name);

const bigDelay = airports.filter(
    (airport) => airport.delayRatePercent > 10
);

const busiAirport = [...airports].sort(
    (a,b) => b.passengers-a.passengers
);

const totalPassengers = airports.reduce((sum, airport) => {
    return sum + airport.passengers;
}, 0);

console.log(totalPassengers);