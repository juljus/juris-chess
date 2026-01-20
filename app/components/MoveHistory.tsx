"use client";

import { useState } from "react";

interface Move {
  id: number;
  moveNumber: number;
  color: string;
  san: string;
  fenAfter: string;
}

interface MoveHistoryProps {
  moves: Move[];
  canRevert: boolean;
  onHoverMove: (fen: string | null) => void;
  onRevert: (moveId: number) => void;
}

export function MoveHistory({ moves, canRevert, onHoverMove, onRevert }: MoveHistoryProps) {
  const [hoveredMoveId, setHoveredMoveId] = useState<number | null>(null);
  const [confirmMove, setConfirmMove] = useState<Move | null>(null);

  // Group moves by move number (white + black = 1 full move)
  const groupedMoves: { moveNumber: number; white?: Move; black?: Move }[] = [];

  for (const move of moves) {
    const existing = groupedMoves.find(g => g.moveNumber === move.moveNumber);
    if (existing) {
      if (move.color === "white") {
        existing.white = move;
      } else {
        existing.black = move;
      }
    } else {
      groupedMoves.push({
        moveNumber: move.moveNumber,
        white: move.color === "white" ? move : undefined,
        black: move.color === "black" ? move : undefined,
      });
    }
  }

  const handleMouseEnter = (move: Move) => {
    setHoveredMoveId(move.id);
    onHoverMove(move.fenAfter);
  };

  const handleMouseLeave = () => {
    setHoveredMoveId(null);
    onHoverMove(null);
  };

  const handleMoveClick = (move: Move) => {
    if (canRevert) {
      setConfirmMove(move);
    }
  };

  const handleConfirmRevert = () => {
    if (confirmMove) {
      onRevert(confirmMove.id);
      setConfirmMove(null);
    }
  };

  if (moves.length === 0) {
    return (
      <div className="mt-3 p-3 bg-white/50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <p className="text-sm text-neutral-400 dark:text-neutral-500 text-center">
          Veel käike pole
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-3 bg-white/50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <div className="max-h-40 overflow-y-auto">
          <table className="w-full text-sm">
            <tbody>
              {[...groupedMoves].reverse().map((group) => (
                <tr key={group.moveNumber} className="border-b border-neutral-100 dark:border-neutral-700/50 last:border-0">
                  <td className="px-2 py-1.5 text-neutral-400 dark:text-neutral-500 w-8 text-right font-mono">
                    {group.moveNumber}.
                  </td>
                  <td className="px-2 py-1.5 w-1/2">
                    {group.white && (
                      <span
                        onMouseEnter={() => handleMouseEnter(group.white!)}
                        onMouseLeave={handleMouseLeave}
                        onClick={() => handleMoveClick(group.white!)}
                        className={`
                          inline-block px-1.5 py-0.5 rounded transition-colors font-mono text-neutral-700 dark:text-neutral-200
                          ${canRevert ? "cursor-pointer" : "cursor-default"}
                          ${hoveredMoveId === group.white.id
                            ? "bg-emerald-100 dark:bg-emerald-900/50"
                            : canRevert ? "hover:bg-neutral-100 dark:hover:bg-neutral-700/50" : ""}
                        `}
                      >
                        {group.white.san}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 w-1/2">
                    {group.black && (
                      <span
                        onMouseEnter={() => handleMouseEnter(group.black!)}
                        onMouseLeave={handleMouseLeave}
                        onClick={() => handleMoveClick(group.black!)}
                        className={`
                          inline-block px-1.5 py-0.5 rounded transition-colors font-mono text-neutral-700 dark:text-neutral-200
                          ${canRevert ? "cursor-pointer" : "cursor-default"}
                          ${hoveredMoveId === group.black.id
                            ? "bg-emerald-100 dark:bg-emerald-900/50"
                            : canRevert ? "hover:bg-neutral-100 dark:hover:bg-neutral-700/50" : ""}
                        `}
                      >
                        {group.black.san}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revert confirmation popup */}
      {confirmMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmMove(null)} />
          <div className="relative bg-white dark:bg-neutral-800 rounded-xl shadow-2xl max-w-xs w-full p-5">
            <p className="text-neutral-900 dark:text-white text-center mb-4">
              Keera tagasi käigule <span className="font-mono font-semibold">{confirmMove.moveNumber}. {confirmMove.san}</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmMove(null)}
                className="flex-1 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors text-sm"
              >
                Tühista
              </button>
              <button
                onClick={handleConfirmRevert}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium"
              >
                Keera tagasi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
