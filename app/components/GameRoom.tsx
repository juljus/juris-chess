"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { ChessBoard } from "./ChessBoard";
import { ResetModal } from "./ResetModal";
import { MoveHistory } from "./MoveHistory";
import { TestBoard } from "./TestBoard";
import { useEffect, useState, useRef } from "react";
import { PLAYERS, PlayerRole, getPlayerByEmail } from "@/app/config/players";
import { Chess } from "chess.js";

interface Move {
  id: number;
  moveNumber: number;
  color: string;
  san: string;
  fenAfter: string;
}

interface Game {
  id: number;
  boardNumber: number;
  fen: string;
  grandfatherColor: "white" | "black";
  status: string;
  winner: string | null;
  moves: Move[];
}

export function GameRoom() {
  const { data: session, status: authStatus } = useSession();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetBoardNumber, setResetBoardNumber] = useState<number | null>(null);
  const [previewFen1, setPreviewFen1] = useState<string | null>(null);
  const [previewFen2, setPreviewFen2] = useState<string | null>(null);
  const [lastMove1, setLastMove1] = useState<{ from: string; to: string } | null>(null);
  const [lastMove2, setLastMove2] = useState<{ from: string; to: string } | null>(null);
  const [optimisticFen1, setOptimisticFen1] = useState<string | null>(null);
  const [optimisticFen2, setOptimisticFen2] = useState<string | null>(null);

  const playerInfo = session?.user?.email ? getPlayerByEmail(session.user.email) : null;
  const userRole: PlayerRole | null = playerInfo?.role ?? null;
  const isPlayer = userRole !== null;
  const isSpectator = session?.user && !isPlayer;
  const userBoards = userRole ? PLAYERS[userRole].boards : [];
  const userName = userRole ? PLAYERS[userRole].name : session?.user?.name || "Külastaja";

  const fetchGames = async () => {
    try {
      const res = await fetch("/api/games");
      if (!res.ok) throw new Error("Failed to fetch games");
      const data = await res.json();

      const game1 = data.games.find((g: Game) => g.boardNumber === 1);
      const game2 = data.games.find((g: Game) => g.boardNumber === 2);

      // Only clear optimistic updates if server has caught up
      setOptimisticFen1((prev) => (prev && game1 && game1.fen === prev ? null : prev));
      setOptimisticFen2((prev) => (prev && game2 && game2.fen === prev ? null : prev));

      setGames(data.games);
      setError(null);
    } catch {
      setError("Failed to load games");
    } finally {
      setLoading(false);
    }
  };

  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (authStatus !== "authenticated" || hasStartedRef.current) return;
    hasStartedRef.current = true;

    fetchGames();
    const interval = setInterval(fetchGames, 2000);

    return () => {
      clearInterval(interval);
      hasStartedRef.current = false;
    };
  }, [authStatus]);

  const handleMove = async (boardNumber: number, from: string, to: string, promotion?: string) => {
    // Optimistically update the board
    const game = games.find((g) => g.boardNumber === boardNumber);
    if (game) {
      const chess = new Chess(game.fen);
      try {
        chess.move({ from, to, promotion });
        const newFen = chess.fen();

        if (boardNumber === 1) {
          setOptimisticFen1(newFen);
          setLastMove1({ from, to });
        } else {
          setOptimisticFen2(newFen);
          setLastMove2({ from, to });
        }
      } catch {
        // Invalid move, don't update optimistically
      }
    }

    try {
      const res = await fetch("/api/games/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardNumber, from, to, promotion }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to make move");
      }

      fetchGames();
    } catch {
      // Revert optimistic update on error
      if (boardNumber === 1) {
        setOptimisticFen1(null);
      } else {
        setOptimisticFen2(null);
      }
      fetchGames();
    }
  };

  const handleReset = async (boardNumber: number, colorMode: "random" | "white" | "black", customFen?: string) => {
    try {
      const res = await fetch("/api/games/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardNumber, colorMode, customFen }),
      });

      if (!res.ok) throw new Error("Failed to reset");
      fetchGames();
      setResetBoardNumber(null);
    } catch {
      // Reset failed silently
    }
  };

  const handleRevert = async (boardNumber: number, moveId: number) => {
    try {
      const res = await fetch("/api/games/revert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardNumber, moveId }),
      });

      if (!res.ok) throw new Error("Failed to revert");
      fetchGames();
    } catch {
      // Revert failed silently
    }
  };

  // Loading state
  if (authStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
        <div className="animate-pulse text-neutral-500">Laen...</div>
      </div>
    );
  }

  // Login screen
  if (authStatus !== "authenticated") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-linear-to-br from-emerald-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-950 p-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-4xl">♔</span>
            <h1 className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">Jurise Male</h1>
          </div>
          <p className="text-neutral-500 dark:text-neutral-400">Vanaisa vs lapselapsed</p>
        </div>

        <div className="flex flex-col items-center gap-4 w-full max-w-xs">
          <button
            onClick={() => signIn("google")}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white px-6 py-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors shadow-md"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Logi sisse Google&apos;iga
          </button>
        </div>
      </div>
    );
  }

  // Loading games
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
        <div className="animate-pulse text-neutral-500">Laen mänge...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-neutral-50 dark:bg-neutral-900">
        <p className="text-red-500">Mängude laadimine ebaõnnestus</p>
        <button onClick={fetchGames} className="text-emerald-600 hover:underline">
          Proovi uuesti
        </button>
      </div>
    );
  }

  const game1 = games.find((g) => g.boardNumber === 1);
  const game2 = games.find((g) => g.boardNumber === 2);

  const getPlayingAs = (game: Game): "white" | "black" | null => {
    if (!(userBoards as readonly number[]).includes(game.boardNumber)) return null;
    if (userRole === "grandfather") return game.grandfatherColor;
    return game.grandfatherColor === "white" ? "black" : "white";
  };

  const canMoveOnBoard = (game: Game): boolean => {
    if (!(userBoards as readonly number[]).includes(game.boardNumber)) return false;
    if (game.status !== "playing") return false;
    const playingAs = getPlayingAs(game);
    if (!playingAs) return false;
    const chess = new Chess(game.fen);
    const currentTurn = chess.turn() === "w" ? "white" : "black";
    return currentTurn === playingAs;
  };

  const getGameStatus = (game: Game) => {
    const chess = new Chess(game.fen);
    const currentTurnColor = chess.turn() === "w" ? "white" : "black";
    const playingAs = getPlayingAs(game);
    const isYourTurn = playingAs === currentTurnColor;

    // Determine whose turn it is
    const isGrandfathersTurn = game.grandfatherColor === currentTurnColor;
    const opponent = game.boardNumber === 1 ? PLAYERS.brother : PLAYERS.nephew;
    const turnText = isGrandfathersTurn ? PLAYERS.grandfather.turnText : opponent.turnText;

    if (game.status === "checkmate") {
      const winnerIsGrandfather = game.grandfatherColor !== currentTurnColor;
      const winner = winnerIsGrandfather ? PLAYERS.grandfather.name : opponent.name;
      return { text: `Matt! ${winner} võitis`, highlight: false };
    }
    if (game.status === "draw") {
      return { text: "Viik", highlight: false };
    }
    if (chess.isCheck()) {
      return { text: `${turnText} (šahh!)`, highlight: isYourTurn };
    }
    return { text: turnText, highlight: isYourTurn };
  };

  const getOpponentName = (boardNumber: number) => {
    return boardNumber === 1 ? PLAYERS.brother.name : PLAYERS.nephew.name;
  };

  const getPlayerNames = (game: Game, orientation: "white" | "black") => {
    const opponentName = getOpponentName(game.boardNumber);
    const grandfatherName = PLAYERS.grandfather.name;

    const whiteName = game.grandfatherColor === "white" ? grandfatherName : opponentName;
    const blackName = game.grandfatherColor === "black" ? grandfatherName : opponentName;

    // Top player is opposite of orientation
    return orientation === "white"
      ? { top: blackName, bottom: whiteName }
      : { top: whiteName, bottom: blackName };
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-neutral-100 via-neutral-50 to-neutral-100 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-linear-to-r from-emerald-600 to-emerald-700 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl">♔</span>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Jurise Male</h1>
              <p className="text-sm text-emerald-100">
                {isSpectator ? "Pealtvaataja" : `Mängija: ${userName}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 text-sm text-emerald-100 hover:text-white hover:bg-emerald-500/50 rounded-lg transition-colors"
          >
            Logi välja
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Test Board - only in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-8 pb-8 border-b border-neutral-200 dark:border-neutral-700">
            <TestBoard />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Board 1 */}
          {game1 && (() => {
            const isMyBoard = (userBoards as readonly number[]).includes(1);
            const status = getGameStatus(game1);
            const orientation = getPlayingAs(game1) || game1.grandfatherColor;
            const displayFen = optimisticFen1 || game1.fen;
            const playerNames = getPlayerNames(game1, orientation);
            return (
              <div className={`flex flex-col items-center transition-opacity ${isSpectator || !isMyBoard ? "opacity-50" : ""}`}>
                <div className="w-full max-w-[min(100%,400px)]">
                  {/* Header with title and turn indicator */}
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-medium text-neutral-900 dark:text-white">
                        {getOpponentName(1)}
                      </h2>
                      <p className={`text-sm ${status.highlight ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-neutral-500 dark:text-neutral-400"}`}>
                        {status.highlight ? "Sinu käik!" : status.text}
                      </p>
                    </div>
                    {userRole === "grandfather" && (
                      <button
                        onClick={() => setResetBoardNumber(1)}
                        className="text-xs px-2 py-1 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white border border-neutral-300 dark:border-neutral-600 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                      >
                        Uus mäng
                      </button>
                    )}
                  </div>

                  {/* Top player name */}
                  <div className="flex justify-end mb-1">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">{playerNames.top}</span>
                  </div>

                  <div className="relative">
                    <ChessBoard
                      fen={displayFen}
                      orientation={orientation}
                      canMove={canMoveOnBoard(game1) && !previewFen1}
                      onMove={(from, to, promotion) => handleMove(1, from, to, promotion)}
                      lastMove={lastMove1}
                    />
                    {previewFen1 && (
                      <div className="absolute inset-0 pointer-events-none">
                        <ChessBoard
                          fen={previewFen1}
                          orientation={orientation}
                          canMove={false}
                          onMove={() => {}}
                        />
                      </div>
                    )}
                  </div>

                  {/* Bottom player name */}
                  <div className="flex justify-start mt-1 mb-3">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">{playerNames.bottom}</span>
                  </div>

                  <MoveHistory
                    moves={game1.moves}
                    canRevert={userRole === "grandfather"}
                    onHoverMove={setPreviewFen1}
                    onRevert={(moveId) => handleRevert(1, moveId)}
                  />
                </div>
              </div>
            );
          })()}

          {/* Board 2 */}
          {game2 && (() => {
            const isMyBoard = (userBoards as readonly number[]).includes(2);
            const status = getGameStatus(game2);
            const orientation = getPlayingAs(game2) || game2.grandfatherColor;
            const displayFen = optimisticFen2 || game2.fen;
            const playerNames = getPlayerNames(game2, orientation);
            return (
              <div className={`flex flex-col items-center transition-opacity ${isSpectator || !isMyBoard ? "opacity-50" : ""}`}>
                <div className="w-full max-w-[min(100%,400px)]">
                  {/* Header with title and turn indicator */}
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-medium text-neutral-900 dark:text-white">
                        {getOpponentName(2)}
                      </h2>
                      <p className={`text-sm ${status.highlight ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-neutral-500 dark:text-neutral-400"}`}>
                        {status.highlight ? "Sinu käik!" : status.text}
                      </p>
                    </div>
                    {userRole === "grandfather" && (
                      <button
                        onClick={() => setResetBoardNumber(2)}
                        className="text-xs px-2 py-1 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white border border-neutral-300 dark:border-neutral-600 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                      >
                        Uus mäng
                      </button>
                    )}
                  </div>

                  {/* Top player name */}
                  <div className="flex justify-end mb-1">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">{playerNames.top}</span>
                  </div>

                  <div className="relative">
                    <ChessBoard
                      fen={displayFen}
                      orientation={orientation}
                      canMove={canMoveOnBoard(game2) && !previewFen2}
                      onMove={(from, to, promotion) => handleMove(2, from, to, promotion)}
                      lastMove={lastMove2}
                    />
                    {previewFen2 && (
                      <div className="absolute inset-0 pointer-events-none">
                        <ChessBoard
                          fen={previewFen2}
                          orientation={orientation}
                          canMove={false}
                          onMove={() => {}}
                        />
                      </div>
                    )}
                  </div>

                  {/* Bottom player name */}
                  <div className="flex justify-start mt-1 mb-3">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">{playerNames.bottom}</span>
                  </div>

                  <MoveHistory
                    moves={game2.moves}
                    canRevert={userRole === "grandfather"}
                    onHoverMove={setPreviewFen2}
                    onRevert={(moveId) => handleRevert(2, moveId)}
                  />
                </div>
              </div>
            );
          })()}
        </div>
      </main>

      <ResetModal
        isOpen={resetBoardNumber !== null}
        boardNumber={resetBoardNumber ?? 1}
        onClose={() => setResetBoardNumber(null)}
        onReset={(colorMode, customFen) => handleReset(resetBoardNumber!, colorMode, customFen)}
      />
    </div>
  );
}
