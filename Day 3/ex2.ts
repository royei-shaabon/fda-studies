interface AirportWithRegion {
  code: string;
  region: string;
  passengers: number;
}

const data: AirportWithRegion[] = [
  { code: "BOS", region: "Northeast", passengers: 12_500_000 },
  { code: "PVD", region: "Northeast", passengers: 2_100_000 },
  { code: "LAX", region: "West", passengers: 30_000_000 },
  { code: "SNA", region: "West", passengers: 5_000_000 },
];

const grouped = data.reduce((acc, airport) => {
  if (!acc[airport.region]) {
    acc[airport.region] = 0;
  }

  acc[airport.region] += airport.passengers;

  return acc;
}, {} as Record<string, number>);

console.log(grouped);