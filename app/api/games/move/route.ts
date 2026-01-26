import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { Chess } from "chess.js";
import { PLAYERS, getPlayerByEmail } from "@/app/config/players";
import { sendPushToEmails } from "@/app/lib/push";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const playerInfo = session?.user?.email ? getPlayerByEmail(session.user.email) : null;

  if (!playerInfo) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRole = playerInfo.role;
  const userBoards = PLAYERS[userRole].boards as readonly number[];

  const { boardNumber, from, to, promotion } = await request.json();

  if (![1, 2].includes(boardNumber)) {
    return NextResponse.json({ error: "Invalid board number" }, { status: 400 });
  }

  // Check if user can play on this board
  if (!userBoards.includes(boardNumber)) {
    return NextResponse.json({ error: "Not allowed to play on this board" }, { status: 403 });
  }

  const game = await prisma.game.findUnique({
    where: { boardNumber },
  });

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  if (game.status !== "playing") {
    return NextResponse.json({ error: "Game has ended" }, { status: 400 });
  }

  // Validate the move
  const chess = new Chess(game.fen);
  const currentTurn = chess.turn() === "w" ? "white" : "black";

  // Check if it's the user's turn
  const userIsGrandfather = userRole === "grandfather";
  const userColor = userIsGrandfather ? game.grandfatherColor : (game.grandfatherColor === "white" ? "black" : "white");

  if (currentTurn !== userColor) {
    return NextResponse.json({ error: "Not your turn" }, { status: 400 });
  }

  let move;
  try {
    move = chess.move({ from, to, promotion });
    if (!move) {
      return NextResponse.json({ error: "Invalid move" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid move" }, { status: 400 });
  }

  // Determine game status
  let status = "playing";
  let winner: string | null = null;

  if (chess.isCheckmate()) {
    status = "checkmate";
    winner = userIsGrandfather ? "grandfather" : "opponent";
  } else if (chess.isDraw()) {
    status = "draw";
  }

  // Calculate move number (full moves, not half moves)
  const moveCount = await prisma.move.count({ where: { gameId: game.id } });
  const moveNumber = Math.floor(moveCount / 2) + 1;

  // Update the game and create move record
  const [updatedGame] = await prisma.$transaction([
    prisma.game.update({
      where: { boardNumber },
      data: {
        fen: chess.fen(),
        status,
        winner,
      },
    }),
    prisma.move.create({
      data: {
        gameId: game.id,
        moveNumber,
        color: currentTurn,
        san: move.san,
        from: move.from,
        to: move.to,
        fenAfter: chess.fen(),
      },
    }),
  ]);

  // Send push notification to the player whose turn it is now
  if (status === "playing") {
    const nextTurn = chess.turn() === "w" ? "white" : "black";
    const isGrandfathersTurn = game.grandfatherColor === nextTurn;

    // Determine which player(s) should receive the notification
    let recipientEmails: string[];
    if (isGrandfathersTurn) {
      recipientEmails = [...PLAYERS.grandfather.emails];
    } else {
      // The opponent on this board
      const opponent = boardNumber === 1 ? PLAYERS.player1 : PLAYERS.player2;
      recipientEmails = [...opponent.emails];
    }

    // Get the name of the player who made the move
    const moverName = userRole === "grandfather"
      ? PLAYERS.grandfather.name
      : (boardNumber === 1 ? PLAYERS.player1.name : PLAYERS.player2.name);

    // Send notification (fire and forget)
    sendPushToEmails(recipientEmails, {
      title: "Jurise Male",
      body: `${moverName} tegi käigu ${move.san}. Sinu käik!`,
      tag: `board-${boardNumber}`,
      url: "/",
    }).catch(() => {
      // Ignore notification errors
    });
  }

  return NextResponse.json({ game: updatedGame });
}
