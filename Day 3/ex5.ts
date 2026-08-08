interface AirportCandidate {
  code: string;
  name: string;
  region: string;
  passengers: number;
  delayRatePercent: number;
  longHaulFlightPercent: number;
}

const candidates: AirportCandidate[] = [
  { code: "BOS", name: "Boston Logan", region: "Northeast", passengers: 12_500_000, delayRatePercent: 18, longHaulFlightPercent: 22 },
  { code: "PVD", name: "Providence", region: "Northeast", passengers: 2_100_000, delayRatePercent: 9, longHaulFlightPercent: 4 },
  { code: "BDL", name: "Bradley", region: "Northeast", passengers: 3_400_000, delayRatePercent: 12, longHaulFlightPercent: 8 },
  { code: "MHT", name: "Manchester-Boston", region: "Northeast", passengers: 1_800_000, delayRatePercent: 7, longHaulFlightPercent: 2 },
];

function scorePassengerVolume(candidate: AirportCandidate): number {
  return candidate.passengers / 1_000_000;
}
function scoreDelayRatePercent(candidate: AirportCandidate): number {
  return candidate.delayRatePercent;
}
function scoreLongHaulFlightPercent(candidate: AirportCandidate): number {
  return candidate.longHaulFlightPercent;
}


function scoreCandidate(candidate: AirportCandidate, weights: { volume: number; delay: number; longHaul:number; }): number {
  return (
    scorePassengerVolume(candidate) * weights.volume +
    scoreDelayRatePercent(candidate) * weights.delay +
    scoreLongHaulFlightPercent(candidate) * weights.longHaul
  );
}

const weights = {
  volume: 1,
  delay: 1,
  longHaul: 1,
};

const scoreCandidateMap = candidates.map((candidate) => {
    return {
        candidate,
        score: scoreCandidate(candidate, weights),
    };
});

const sortedCandidates = [...scoreCandidateMap].sort(
    (a,b) => b.score-a.score
);

const cleanRanking = sortedCandidates.map((item) => {
  return {
    name: item.candidate.name,
    score: item.score,
  };
});

const winner = sortedCandidates[0];

if (!winner) {
  throw new Error("No airport candidates available");
}

const highestPassengerVolume = Math.max(
  ...candidates.map((candidate) => candidate.passengers)
);

const highestLongHaulPercent = Math.max(
  ...candidates.map((candidate) => candidate.longHaulFlightPercent)
);

const totalDelayRate = candidates.reduce((sum, candidate) => {
  return sum + candidate.delayRatePercent;
}, 0);

const averageDelayRate = totalDelayRate / candidates.length;

const hasHighestPassengerVolume =
  winner.candidate.passengers === highestPassengerVolume;

const hasHighestLongHaulPercent =
  winner.candidate.longHaulFlightPercent === highestLongHaulPercent;

const delayComparison =
  winner.candidate.delayRatePercent > averageDelayRate
    ? `an above-average delay rate of ${winner.candidate.delayRatePercent}% compared with the group average of ${averageDelayRate.toFixed(1)}%, indicating stronger congestion pressure`
    : `a below-average delay rate of ${winner.candidate.delayRatePercent}% compared with the group average of ${averageDelayRate.toFixed(1)}%`;

const explanation =
  `${winner.candidate.name} ranks highest with a score of ${winner.score}. ` +
  `${hasHighestPassengerVolume ? "It has the highest passenger volume among the candidates" : "It has strong passenger volume"} ` +
  `at ${winner.candidate.passengers / 1_000_000}M passengers, ` +
  `${hasHighestLongHaulPercent ? "the highest long-haul flight share in the group" : "a strong long-haul flight share"} ` +
  `at ${winner.candidate.longHaulFlightPercent}%, and ${delayComparison}.`;

console.log("Ranked candidates:", cleanRanking);
console.log("Explanation:", explanation);