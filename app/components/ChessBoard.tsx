"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Chess, Square } from "chess.js";
import { ChessPiece } from "./ChessPieces";

interface ChessBoardProps {
  fen: string;
  orientation: "white" | "black";
  canMove: boolean;
  onMove: (from: string, to: string, promotion?: string) => void;
  lastMove?: { from: string; to: string } | null;
}

const COLUMNS = ["a", "b", "c", "d", "e", "f", "g", "h"];
const ROWS = ["8", "7", "6", "5", "4", "3", "2", "1"];

// Chess piece sound effect - marble thunk
function playMoveSound() {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const currentTime = audioContext.currentTime;

    // Create impact noise with body
    const bufferSize = audioContext.sampleRate * 0.08; // 80ms of noise
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // More aggressive decay for percussive impact
      const decay = Math.pow(1 - i / bufferSize, 2.5);
      data[i] = (Math.random() * 2 - 1) * decay;
    }
    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;

    // Band-pass filter to shape the thunk (mid-range emphasis)
    const lowFilter = audioContext.createBiquadFilter();
    lowFilter.type = 'highpass';
    lowFilter.frequency.setValueAtTime(400, currentTime);
    lowFilter.Q.setValueAtTime(0.7, currentTime);

    const highFilter = audioContext.createBiquadFilter();
    highFilter.type = 'lowpass';
    highFilter.frequency.setValueAtTime(2500, currentTime);
    highFilter.Q.setValueAtTime(1, currentTime);

    // Resonant peak for the "marble" ring
    const peakFilter = audioContext.createBiquadFilter();
    peakFilter.type = 'peaking';
    peakFilter.frequency.setValueAtTime(1200, currentTime);
    peakFilter.Q.setValueAtTime(3, currentTime);
    peakFilter.gain.setValueAtTime(6, currentTime);

    const noiseGain = audioContext.createGain();

    // Connect chain: noise -> highpass -> lowpass -> peak -> gain -> output
    noise.connect(lowFilter);
    lowFilter.connect(highFilter);
    highFilter.connect(peakFilter);
    peakFilter.connect(noiseGain);
    noiseGain.connect(audioContext.destination);

    // Percussive envelope - sharp attack, medium decay
    noiseGain.gain.setValueAtTime(0.25, currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.06);

    noise.start(currentTime);
    noise.stop(currentTime + 0.08);
  } catch {
    // Audio not supported, fail silently
  }
}

function isDarkSquare(col: number, row: number): boolean {
  return (col + row) % 2 === 1;
}

export function ChessBoard({ fen, orientation, canMove, onMove, lastMove }: ChessBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const prevFenRef = useRef(fen);

  const game = useMemo(() => new Chess(fen), [fen]);

  // Play sound when FEN changes (a move was made)
  useEffect(() => {
    if (fen !== prevFenRef.current && lastMove?.to) {
      playMoveSound();
      prevFenRef.current = fen;
    }
  }, [fen, lastMove]);

  const board = useMemo(() => {
    const rows = orientation === "white" ? ROWS : [...ROWS].reverse();
    const cols = orientation === "white" ? COLUMNS : [...COLUMNS].reverse();
    return { rows, cols };
  }, [orientation]);

  const getPieceAt = (square: string): string | null => {
    const piece = game.get(square as Square);
    if (!piece) return null;
    const color = piece.color === "w" ? "w" : "b";
    const type = piece.type.toUpperCase();
    return `${color}${type}`;
  };

  const getLegalMovesFrom = (square: string): string[] => {
    const moves = game.moves({ square: square as Square, verbose: true });
    return moves.map(m => m.to);
  };

  const handleSquareClick = useCallback((square: string) => {
    if (!canMove) return;

    const piece = game.get(square as Square);
    const currentTurn = game.turn();

    // Clicking same square deselects
    if (selectedSquare === square) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    if (piece && piece.color === currentTurn) {
      setSelectedSquare(square);
      setLegalMoves(getLegalMovesFrom(square));
      return;
    }

    if (selectedSquare) {
      if (legalMoves.includes(square)) {
        const movingPiece = game.get(selectedSquare as Square);
        const isPromotion =
          movingPiece?.type === "p" &&
          ((movingPiece.color === "w" && square[1] === "8") ||
           (movingPiece.color === "b" && square[1] === "1"));

        onMove(selectedSquare, square, isPromotion ? "q" : undefined);
      }
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  }, [canMove, game, selectedSquare, legalMoves, onMove, getLegalMovesFrom]);

  const handleBoardClick = useCallback((e: React.MouseEvent) => {
    // If clicking the board container itself (not a square), deselect
    if (e.target === e.currentTarget) {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  }, []);

  return (
    <div className="w-full aspect-square max-w-[min(100%,400px)]" onClick={handleBoardClick}>
      {/* Outer frame with layered shadows */}
      <div className="relative w-full h-full p-2 bg-linear-to-br from-neutral-200 via-neutral-100 to-neutral-300 dark:from-neutral-700 dark:via-neutral-800 dark:to-neutral-700 rounded-sm shadow-[0_2px_4px_rgba(0,0,0,0.1),0_8px_16px_rgba(0,0,0,0.1),0_16px_32px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.5)] dark:shadow-[0_2px_4px_rgba(0,0,0,0.2),0_8px_16px_rgba(0,0,0,0.25),0_16px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]">
        {/* Inner border highlight */}
        <div className="absolute inset-2 rounded-sm ring-1 ring-black/10 dark:ring-white/5 pointer-events-none" />
        <div className="grid grid-cols-8 grid-rows-8 w-full h-full overflow-hidden rounded-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]">
        {board.rows.map((row, rowIdx) =>
          board.cols.map((col, colIdx) => {
            const square = `${col}${row}`;
            const isDark = isDarkSquare(colIdx, rowIdx);
            const piece = getPieceAt(square);
            const isSelected = selectedSquare === square;
            const isLegalMove = legalMoves.includes(square);
            const isCapture = isLegalMove && piece;

            return (
              <div
                key={square}
                onClick={() => handleSquareClick(square)}
                className={`
                  relative flex items-center justify-center cursor-pointer
                  transition-colors duration-150
                  ${isDark ? "bg-emerald-600" : "bg-emerald-100"}
                  ${isSelected ? "bg-amber-400!" : ""}
                  ${canMove ? "hover:brightness-110" : ""}
                `}
              >
                {/* Legal move indicator */}
                {isLegalMove && !isCapture && (
                  <div className="absolute w-[30%] h-[30%] rounded-full bg-black/20" />
                )}
                {isLegalMove && isCapture && (
                  <div className="absolute inset-1 rounded-full border-4 border-black/20" />
                )}

                {/* Piece */}
                {piece && <ChessPiece piece={piece} />}
              </div>
            );
          })
        )}
        </div>
      </div>
    </div>
  );
}
