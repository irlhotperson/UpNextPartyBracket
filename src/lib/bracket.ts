// Single-elimination bracket generation with byes

export interface BracketMatch {
  round: number;
  bracket_position: number;
  player_a_id: string | null;
  player_b_id: string | null;
  // If a player has a bye, they auto-win
  is_bye: boolean;
}

function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

export function generateSingleElimBracket(
  playerIds: string[]
): BracketMatch[] {
  const n = playerIds.length;
  if (n < 2) return [];

  const bracketSize = nextPowerOf2(n);
  const numByes = bracketSize - n;
  const totalRounds = Math.log2(bracketSize);

  // Shuffle players for random seeding
  const shuffled = [...playerIds].sort(() => Math.random() - 0.5);

  // Build round 1 matches
  const round1Matches: BracketMatch[] = [];
  const firstRoundMatchCount = bracketSize / 2;

  // Place byes: top seeds get byes
  // Distribute byes evenly
  const byePositions = new Set<number>();
  for (let i = 0; i < numByes; i++) {
    byePositions.add(i);
  }

  let playerIndex = 0;
  for (let pos = 0; pos < firstRoundMatchCount; pos++) {
    if (byePositions.has(pos)) {
      // Bye match: player auto-advances
      round1Matches.push({
        round: 1,
        bracket_position: pos,
        player_a_id: shuffled[playerIndex++],
        player_b_id: null,
        is_bye: true,
      });
    } else {
      round1Matches.push({
        round: 1,
        bracket_position: pos,
        player_a_id: shuffled[playerIndex++],
        player_b_id: shuffled[playerIndex++],
        is_bye: false,
      });
    }
  }

  // Build subsequent round matches (empty, waiting for winners)
  const allMatches = [...round1Matches];
  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round);
    for (let pos = 0; pos < matchesInRound; pos++) {
      allMatches.push({
        round,
        bracket_position: pos,
        player_a_id: null,
        player_b_id: null,
        is_bye: false,
      });
    }
  }

  return allMatches;
}

// Determine which match a winner should advance to
export function getNextMatch(
  round: number,
  bracketPosition: number
): { round: number; bracket_position: number; slot: "a" | "b" } {
  return {
    round: round + 1,
    bracket_position: Math.floor(bracketPosition / 2),
    slot: bracketPosition % 2 === 0 ? "a" : "b",
  };
}
