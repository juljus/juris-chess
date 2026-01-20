"use client";

import { useState } from "react";
import { Chess, Square } from "chess.js";

interface ResetModalProps {
  isOpen: boolean;
  boardNumber: number;
  onClose: () => void;
  onReset: (colorMode: "random" | "white" | "black", customFen?: string) => void;
}

const COLUMNS = ["a", "b", "c", "d", "e", "f", "g", "h"];
const ROWS = ["8", "7", "6", "5", "4", "3", "2", "1"];

const PIECE_SYMBOLS: Record<string, string> = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟",
};

const PIECES = [
  { key: "wK", label: "White King" },
  { key: "wQ", label: "White Queen" },
  { key: "wR", label: "White Rook" },
  { key: "wB", label: "White Bishop" },
  { key: "wN", label: "White Knight" },
  { key: "wP", label: "White Pawn" },
  { key: "bK", label: "Black King" },
  { key: "bQ", label: "Black Queen" },
  { key: "bR", label: "Black Rook" },
  { key: "bB", label: "Black Bishop" },
  { key: "bN", label: "Black Knight" },
  { key: "bP", label: "Black Pawn" },
  { key: "clear", label: "Clear Square" },
];

function isDarkSquare(col: number, row: number): boolean {
  return (col + row) % 2 === 1;
}

function boardToFen(board: Record<string, string | null>): string {
  let fen = "";
  for (const row of ROWS) {
    let emptyCount = 0;
    for (const col of COLUMNS) {
      const square = `${col}${row}`;
      const piece = board[square];
      if (piece) {
        if (emptyCount > 0) {
          fen += emptyCount;
          emptyCount = 0;
        }
        const color = piece[0];
        const type = piece[1].toLowerCase();
        fen += color === "w" ? type.toUpperCase() : type;
      } else {
        emptyCount++;
      }
    }
    if (emptyCount > 0) fen += emptyCount;
    if (row !== "1") fen += "/";
  }
  return fen + " w KQkq - 0 1";
}

export function ResetModal({ isOpen, boardNumber, onClose, onReset }: ResetModalProps) {
  const [mode, setMode] = useState<"options" | "custom">("options");
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  const [customBoard, setCustomBoard] = useState<Record<string, string | null>>(() => {
    const board: Record<string, string | null> = {};
    for (const row of ROWS) {
      for (const col of COLUMNS) {
        board[`${col}${row}`] = null;
      }
    }
    return board;
  });
  const [customColor, setCustomColor] = useState<"white" | "black">("white");

  const resetCustomBoard = () => {
    const board: Record<string, string | null> = {};
    for (const row of ROWS) {
      for (const col of COLUMNS) {
        board[`${col}${row}`] = null;
      }
    }
    setCustomBoard(board);
  };

  const loadStartingPosition = () => {
    const game = new Chess();
    const board: Record<string, string | null> = {};
    for (const row of ROWS) {
      for (const col of COLUMNS) {
        const square = `${col}${row}` as Square;
        const piece = game.get(square);
        if (piece) {
          board[square] = `${piece.color}${piece.type.toUpperCase()}`;
        } else {
          board[square] = null;
        }
      }
    }
    setCustomBoard(board);
  };

  const handleSquareClick = (square: string) => {
    if (!selectedPiece) return;

    setCustomBoard(prev => ({
      ...prev,
      [square]: selectedPiece === "clear" ? null : selectedPiece,
    }));
  };

  const handleStartCustomGame = () => {
    const fen = boardToFen(customBoard);
    onReset(customColor, fen);
    setMode("options");
    resetCustomBoard();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-neutral-800 rounded-xl shadow-2xl max-w-sm w-full max-h-[90vh] overflow-auto">
        {mode === "options" ? (
          <>
            <div className="p-5 space-y-2">
              <button
                onClick={() => { onReset("random"); onClose(); }}
                className="w-full p-3 text-left rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors font-medium text-neutral-900 dark:text-white"
              >
                Suvaline
              </button>

              <button
                onClick={() => { onReset("white"); onClose(); }}
                className="w-full p-3 text-left rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors font-medium text-neutral-900 dark:text-white flex items-center gap-2"
              >
                <span className="text-xl">♔</span> Valge
              </button>

              <button
                onClick={() => { onReset("black"); onClose(); }}
                className="w-full p-3 text-left rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors font-medium text-neutral-900 dark:text-white flex items-center gap-2"
              >
                <span className="text-xl">♚</span> Must
              </button>

              <button
                onClick={() => setMode("custom")}
                className="w-full p-3 text-left rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors font-medium text-neutral-900 dark:text-white"
              >
                Vaba asetus
              </button>
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={onClose}
                className="w-full py-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors text-sm"
              >
                Tühista
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMode("options")}
                  className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors"
                >
                  <svg className="w-5 h-5 text-neutral-600 dark:text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Vaba asetus</h2>
              </div>
            </div>

            <div className="p-6">
              {/* Piece palette */}
              <div className="flex flex-wrap gap-1 mb-4">
                {PIECES.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSelectedPiece(key)}
                    title={label}
                    className={`
                      w-10 h-10 flex items-center justify-center rounded border transition-colors
                      ${selectedPiece === key
                        ? "bg-emerald-100 dark:bg-emerald-900 border-emerald-500"
                        : "border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700"}
                    `}
                  >
                    {key === "clear" ? (
                      <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <span className={`text-2xl ${key.startsWith("w") ? "text-neutral-200 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" : "text-neutral-900"}`}>
                        {PIECE_SYMBOLS[key]}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Mini board */}
              <div className="aspect-square w-full max-w-[300px] mx-auto mb-4">
                <div className="grid grid-cols-8 grid-rows-8 w-full h-full rounded overflow-hidden border border-neutral-300 dark:border-neutral-600">
                  {ROWS.map((row, rowIdx) =>
                    COLUMNS.map((col, colIdx) => {
                      const square = `${col}${row}`;
                      const isDark = isDarkSquare(colIdx, rowIdx);
                      const piece = customBoard[square];

                      return (
                        <div
                          key={square}
                          onClick={() => handleSquareClick(square)}
                          className={`
                            flex items-center justify-center cursor-pointer transition-colors
                            ${isDark ? "bg-emerald-600" : "bg-emerald-100"}
                            hover:brightness-110
                          `}
                        >
                          {piece && (
                            <span className={`text-xl select-none ${piece.startsWith("w") ? "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" : "text-neutral-900"}`}>
                              {PIECE_SYMBOLS[piece]}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={loadStartingPosition}
                  className="flex-1 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors text-neutral-700 dark:text-neutral-300"
                >
                  Algpositsioon
                </button>
                <button
                  onClick={resetCustomBoard}
                  className="flex-1 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors text-neutral-700 dark:text-neutral-300"
                >
                  Tühjenda
                </button>
              </div>

              {/* Color choice */}
              <div className="mb-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setCustomColor("white")}
                    className={`flex-1 py-2 rounded-lg border transition-colors ${
                      customColor === "white"
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    Valge
                  </button>
                  <button
                    onClick={() => setCustomColor("black")}
                    className={`flex-1 py-2 rounded-lg border transition-colors ${
                      customColor === "black"
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    Must
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 flex gap-3">
              <button
                onClick={() => { setMode("options"); resetCustomBoard(); }}
                className="flex-1 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors text-sm"
              >
                Tühista
              </button>
              <button
                onClick={handleStartCustomGame}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium"
              >
                Alusta
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
