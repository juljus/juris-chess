"use client";

import { useState, useCallback } from "react";
import { Chess } from "chess.js";
import { ChessBoard } from "./ChessBoard";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function TestBoard() {
  const [fen, setFen] = useState(STARTING_FEN);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [orientation, setOrientation] = useState<"white" | "black">("white");

  const handleMove = useCallback((from: string, to: string, promotion?: string) => {
    try {
      const game = new Chess(fen);
      game.move({ from, to, promotion });
      setFen(game.fen());
      setLastMove({ from, to });
    } catch {
      // Invalid move, ignore
    }
  }, [fen]);

  const handleReset = () => {
    setFen(STARTING_FEN);
    setLastMove(null);
  };

  const flipBoard = () => {
    setOrientation(o => o === "white" ? "black" : "white");
  };

  const game = new Chess(fen);
  const status = game.isCheckmate()
    ? "Matt!"
    : game.isDraw()
      ? "Viik"
      : game.isCheck()
        ? `${game.turn() === "w" ? "Valge" : "Must"} käik (šahh!)`
        : `${game.turn() === "w" ? "Valge" : "Must"} käik`;

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-[min(100%,400px)]">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-medium text-neutral-900 dark:text-white">
              Test Laud
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {status}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={flipBoard}
              className="text-xs px-2 py-1 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white border border-neutral-300 dark:border-neutral-600 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              title="Pööra lauda"
            >
              ⟲
            </button>
            <button
              onClick={handleReset}
              className="text-xs px-2 py-1 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white border border-neutral-300 dark:border-neutral-600 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        <ChessBoard
          fen={fen}
          orientation={orientation}
          canMove={true}
          onMove={handleMove}
          lastMove={lastMove}
        />

        <p className="mt-2 text-xs text-center text-neutral-400 dark:text-neutral-500">
          Vaba mäng UI testimiseks
        </p>
      </div>
    </div>
  );
}
