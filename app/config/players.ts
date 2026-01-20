// Configure the three players by their Google email addresses
// The grandfather can play on both boards
// The brother plays on board 1, the nephew plays on board 2

export const PLAYERS = {
  grandfather: {
    email: "mitselek@gmail.com",
    name: "Juris",
    turnText: "Jurise käik",
    boards: [1, 2], // Can play on both boards
  },
  brother: {
    email: "august.putrinsh@gmail.com",
    name: "August",
    turnText: "Augusti käik",
    boards: [1], // Can only play on board 1
  },
  nephew: {
    email: "juljus@gmail.com",
    name: "Salme",
    turnText: "Salme käik",
    boards: [2], // Can only play on board 2
  },
} as const;

export type PlayerRole = keyof typeof PLAYERS;

export function getPlayerByEmail(email: string): { role: PlayerRole; player: typeof PLAYERS[PlayerRole] } | null {
  for (const [role, player] of Object.entries(PLAYERS)) {
    if (player.email.toLowerCase() === email.toLowerCase()) {
      return { role: role as PlayerRole, player };
    }
  }
  return null;
}

export function canPlayOnBoard(email: string, boardNumber: number): boolean {
  const playerInfo = getPlayerByEmail(email);
  if (!playerInfo) return false;
  return (playerInfo.player.boards as readonly number[]).includes(boardNumber);
}

export function isGrandfather(email: string): boolean {
  const playerInfo = getPlayerByEmail(email);
  return playerInfo?.role === "grandfather";
}
