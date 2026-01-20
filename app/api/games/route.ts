import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export async function GET() {
  const session = await getServerSession(authOptions);

  // Any authenticated user can view games (including spectators)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get or create both games with their move history
  let games = await prisma.game.findMany({
    orderBy: { boardNumber: "asc" },
    include: {
      moves: {
        orderBy: { id: "asc" },
      },
    },
  });

  // Initialize games if they don't exist
  if (games.length === 0) {
    const board1Color = Math.random() < 0.5 ? "white" : "black";
    const board2Color = Math.random() < 0.5 ? "white" : "black";

    await prisma.game.createMany({
      data: [
        { boardNumber: 1, grandfatherColor: board1Color, fen: STARTING_FEN },
        { boardNumber: 2, grandfatherColor: board2Color, fen: STARTING_FEN },
      ],
    });

    games = await prisma.game.findMany({
      orderBy: { boardNumber: "asc" },
      include: {
        moves: {
          orderBy: { id: "asc" },
        },
      },
    });
  }

  return NextResponse.json({ games });
}
