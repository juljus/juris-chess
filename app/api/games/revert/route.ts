import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { getPlayerByEmail } from "@/app/config/players";

interface RevertOptions {
  boardNumber: number;
  moveId: number;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const playerInfo = session?.user?.email ? getPlayerByEmail(session.user.email) : null;

  if (!playerInfo) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (playerInfo.role !== "grandfather") {
    return NextResponse.json({ error: "Only grandfather can revert moves" }, { status: 403 });
  }

  const { boardNumber, moveId }: RevertOptions = await request.json();

  if (![1, 2].includes(boardNumber)) {
    return NextResponse.json({ error: "Invalid board number" }, { status: 400 });
  }

  const game = await prisma.game.findUnique({
    where: { boardNumber },
    include: { moves: { orderBy: { id: "asc" } } },
  });

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const targetMove = game.moves.find(m => m.id === moveId);

  if (!targetMove) {
    return NextResponse.json({ error: "Move not found" }, { status: 404 });
  }

  // Delete all moves after this one and update game state
  await prisma.$transaction([
    prisma.move.deleteMany({
      where: {
        gameId: game.id,
        id: { gt: moveId },
      },
    }),
    prisma.game.update({
      where: { boardNumber },
      data: {
        fen: targetMove.fenAfter,
        status: "playing",
        winner: null,
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}
