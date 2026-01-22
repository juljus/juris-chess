import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { canPlayOnBoard } from "@/app/config/players";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

type ColorMode = "random" | "white" | "black";

interface ResetOptions {
  boardNumber: number;
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
  const email = session?.user?.email;

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { boardNumber, colorMode = "random", customFen }: ResetOptions = await request.json();

  if (!boardNumber || !canPlayOnBoard(email, boardNumber)) {
    return NextResponse.json({ error: "Not authorized for this board" }, { status: 403 });
  }
  const fen = customFen || STARTING_FEN;
  const newColor = getGrandfatherColor(colorMode);
  const game = await prisma.game.findUnique({ where: { boardNumber } });

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  await prisma.$transaction([
    // Clear move history
    prisma.move.deleteMany({ where: { gameId: game.id } }),
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

  return NextResponse.json({ success: true });
}
