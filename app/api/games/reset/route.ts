import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { getPlayerByEmail } from "@/app/config/players";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

type ColorMode = "random" | "white" | "black";

interface ResetOptions {
  boardNumber?: number;
  colorMode?: ColorMode;
  customFen?: string;
}

function getGrandfatherColor(colorMode: ColorMode): "white" | "black" {
  if (colorMode === "random") {
    return Math.random() < 0.5 ? "white" : "black";
  }
  return colorMode;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const playerInfo = session?.user?.email ? getPlayerByEmail(session.user.email) : null;

  if (!playerInfo) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (playerInfo.role !== "grandfather") {
    return NextResponse.json({ error: "Only grandfather can reset games" }, { status: 403 });
  }

  const { boardNumber, colorMode = "random", customFen }: ResetOptions = await request.json();
  const fen = customFen || STARTING_FEN;

  if (boardNumber && [1, 2].includes(boardNumber)) {
    const newColor = getGrandfatherColor(colorMode);
    const game = await prisma.game.findUnique({ where: { boardNumber } });

    await prisma.$transaction([
      // Clear move history
      prisma.move.deleteMany({ where: { gameId: game!.id } }),
      // Reset the game
      prisma.game.update({
        where: { boardNumber },
        data: {
          fen,
          grandfatherColor: newColor,
          status: "playing",
          winner: null,
        },
      }),
    ]);
  } else {
    const board1Color = getGrandfatherColor(colorMode);
    const board2Color = getGrandfatherColor(colorMode);

    const games = await prisma.game.findMany();
    const game1 = games.find(g => g.boardNumber === 1);
    const game2 = games.find(g => g.boardNumber === 2);

    await prisma.$transaction([
      // Clear move history for both games
      prisma.move.deleteMany({ where: { gameId: game1!.id } }),
      prisma.move.deleteMany({ where: { gameId: game2!.id } }),
      // Reset both games
      prisma.game.update({
        where: { boardNumber: 1 },
        data: {
          fen,
          grandfatherColor: board1Color,
          status: "playing",
          winner: null,
        },
      }),
      prisma.game.update({
        where: { boardNumber: 2 },
        data: {
          fen,
          grandfatherColor: board2Color,
          status: "playing",
          winner: null,
        },
      }),
    ]);
  }

  const games = await prisma.game.findMany({
    orderBy: { boardNumber: "asc" },
  });

  return NextResponse.json({ games });
}
