"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  TILE_SIZE,
  VIEW_W,
  VIEW_H,
  cameraOffset,
  facingTile,
  initialPlayerState,
  advanceMove,
  renderPosition,
  tryMove,
  type Direction,
  type PlayerState,
} from "./engine/game";
import { MAP_H, MAP_W, interactableAt, tileAt, type Interactable } from "./engine/map";
import { drawPlayer, drawTile, type TileChar } from "./engine/tiles";
import {
  CABINET_TEXT,
  DOOR_TEXT,
  INTRO_LINES,
  SIGN_TEXT,
} from "./engine/content";
import {
  hasVisitedThisSession,
  loadPosition,
  markVisitedThisSession,
  readOrCreateUserRef,
  savePosition,
} from "./engine/storage";
import { DialogBox, type DialogView, type WikiPageDetail, type WikiPageSummary } from "./DialogBox";
import { DPad } from "./DPad";

export const LOGICAL_W = VIEW_W * TILE_SIZE;
export const LOGICAL_H = VIEW_H * TILE_SIZE;

const KEY_TO_DIR: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  W: "up",
  S: "down",
  A: "left",
  D: "right",
};

type WikiListResponse = { pages?: WikiPageSummary[]; error?: string };
type WikiPageResponse = WikiPageDetail & { error?: string };
type EventsResponse = { events?: { text: string }[] };

function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarse(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return coarse;
}

export function OverworldClient() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const coarsePointer = useCoarsePointer();

  const playerRef = useRef<PlayerState>(initialPlayerState(19, 10, "down"));
  const heldDirs = useRef<Direction[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const clockRef = useRef(0);

  const [dialogView, setDialogView] = useState<DialogView | null>(null);
  const dialogOpenRef = useRef(false);
  const lastWikiPagesRef = useRef<WikiPageSummary[]>([]);
  const userRefRef = useRef("");

  useEffect(() => {
    dialogOpenRef.current = dialogView !== null;
  }, [dialogView]);

  useEffect(() => {
    const saved = loadPosition();
    playerRef.current = initialPlayerState(saved.x, saved.y, saved.facing);
    userRefRef.current = readOrCreateUserRef();
    setDialogView({ kind: "intro", body: INTRO_LINES.join("\n\n") });
  }, []);

  const postVisit = useCallback(async () => {
    if (hasVisitedThisSession()) return;
    markVisitedThisSession();
    try {
      await fetch("/api/overworld/visit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userRef: userRefRef.current, player: "human" }),
      });
    } catch {
      // Best-effort exhaust — a failed visit ping never blocks play.
    }
  }, []);

  const openWikiList = useCallback(async () => {
    setDialogView({ kind: "wiki-list", loading: true, error: null, pages: [] });
    try {
      const res = await fetch("/api/overworld/wiki");
      const data = (await res.json()) as WikiListResponse;
      if (!res.ok) throw new Error(data.error ?? `wiki failed (${res.status})`);
      const pages = data.pages ?? [];
      lastWikiPagesRef.current = pages;
      setDialogView({ kind: "wiki-list", loading: false, error: null, pages });
    } catch (e) {
      setDialogView({
        kind: "wiki-list",
        loading: false,
        error: e instanceof Error ? e.message : String(e),
        pages: [],
      });
    }
  }, []);

  const openWikiPage = useCallback(async (slug: string) => {
    setDialogView({ kind: "wiki-page", loading: true, error: null, page: null });
    try {
      const res = await fetch(`/api/overworld/wiki?slug=${encodeURIComponent(slug)}`);
      const data = (await res.json()) as WikiPageResponse;
      if (!res.ok) throw new Error(data.error ?? `wiki page failed (${res.status})`);
      setDialogView({ kind: "wiki-page", loading: false, error: null, page: data });
    } catch (e) {
      setDialogView({
        kind: "wiki-page",
        loading: false,
        error: e instanceof Error ? e.message : String(e),
        page: null,
      });
    }
  }, []);

  const openBoard = useCallback(async () => {
    setDialogView({ kind: "board", loading: true, error: null, lines: [] });
    try {
      const res = await fetch("/api/overworld/events");
      const data = (await res.json()) as EventsResponse;
      if (!res.ok) throw new Error(`events failed (${res.status})`);
      setDialogView({ kind: "board", loading: false, error: null, lines: (data.events ?? []).map((e) => e.text) });
    } catch (e) {
      setDialogView({
        kind: "board",
        loading: false,
        error: e instanceof Error ? e.message : String(e),
        lines: [],
      });
    }
  }, []);

  const openInteractable = useCallback(
    (it: Interactable) => {
      if (it.kind === "sign") {
        const text = SIGN_TEXT[it.id];
        if (text) setDialogView({ kind: "text", title: text.title, body: text.body });
        return;
      }
      if (it.kind === "door") {
        if (it.id === "door-courthouse") {
          setDialogView({ kind: "courthouse" });
          return;
        }
        const text = DOOR_TEXT[it.id];
        if (text) setDialogView({ kind: "text", title: text.title, body: text.body });
        return;
      }
      if (it.kind === "cabinet") {
        const data = CABINET_TEXT[it.id];
        if (data) setDialogView({ kind: "cabinet", data });
        return;
      }
      if (it.kind === "kiosk") {
        void openWikiList();
        return;
      }
      if (it.kind === "board") {
        void openBoard();
      }
    },
    [openBoard, openWikiList],
  );

  const closeDialog = useCallback(() => {
    const wasIntro = dialogView?.kind === "intro";
    setDialogView(null);
    if (wasIntro) void postVisit();
  }, [dialogView, postVisit]);

  const handleAction = useCallback(() => {
    if (dialogView) {
      closeDialog();
      return;
    }
    const player = playerRef.current;
    if (player.moving) return;
    const { x, y } = facingTile(player);
    const it = interactableAt(x, y);
    if (it) openInteractable(it);
  }, [dialogView, closeDialog, openInteractable]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Space") {
        e.preventDefault();
        handleAction();
        return;
      }
      const dir = KEY_TO_DIR[e.key];
      if (!dir) return;
      e.preventDefault();
      if (dialogOpenRef.current) return;
      if (!heldDirs.current.includes(dir)) heldDirs.current.push(dir);
    }
    function onKeyUp(e: KeyboardEvent) {
      const dir = KEY_TO_DIR[e.key];
      if (!dir) return;
      heldDirs.current = heldDirs.current.filter((d) => d !== dir);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [handleAction]);

  useEffect(() => {
    function loop(ts: number) {
      const last = lastTsRef.current ?? ts;
      const dt = ts - last;
      lastTsRef.current = ts;
      clockRef.current += dt;

      let player = playerRef.current;
      if (!dialogOpenRef.current) {
        if (player.moving) {
          const before = player.moving;
          player = advanceMove(player, dt);
          if (before && !player.moving) savePosition({ x: player.x, y: player.y, facing: player.facing });
        } else if (heldDirs.current.length > 0) {
          player = tryMove(player, heldDirs.current[heldDirs.current.length - 1]);
        }
        playerRef.current = player;
      }

      draw(ts);
      rafRef.current = requestAnimationFrame(loop);
    }

    function draw(ts: number) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;

      const player = playerRef.current;
      const { rx, ry } = renderPosition(player);
      const { camX, camY } = cameraOffset(rx, ry);
      const frame: 0 | 1 = Math.floor(ts / 480) % 2 === 0 ? 0 : 1;

      const startX = Math.max(0, Math.floor(camX) - 1);
      const startY = Math.max(0, Math.floor(camY) - 1);
      const endX = Math.min(MAP_W - 1, Math.floor(camX) + VIEW_W + 1);
      const endY = Math.min(MAP_H - 1, Math.floor(camY) + VIEW_H + 1);
      const camPxX = camX * TILE_SIZE;
      const camPxY = camY * TILE_SIZE;

      ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);
      for (let ty = startY; ty <= endY; ty++) {
        for (let tx = startX; tx <= endX; tx++) {
          const ch = tileAt(tx, ty) as TileChar;
          drawTile(ctx, ch, tx * TILE_SIZE - camPxX, ty * TILE_SIZE - camPxY, tx, ty, frame);
        }
      }
      drawPlayer(ctx, rx * TILE_SIZE - camPxX, ry * TILE_SIZE - camPxY, player.facing, player.walkFrame);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function onDirStart(dir: Direction) {
    if (dialogOpenRef.current) return;
    if (!heldDirs.current.includes(dir)) heldDirs.current.push(dir);
  }
  function onDirEnd(dir: Direction) {
    heldDirs.current = heldDirs.current.filter((d) => d !== dir);
  }

  return (
    <div className="ow-play-shell">
      <div className="ow-stage">
        <div className="ow-screen">
          <canvas
            ref={canvasRef}
            width={LOGICAL_W}
            height={LOGICAL_H}
            className="ow-canvas"
            aria-label="Overworld map viewport"
          />
          {dialogView && (
            <DialogBox
              view={dialogView}
              onClose={closeDialog}
              onSelectWikiPage={(slug) => void openWikiPage(slug)}
              onBackToWikiList={() =>
                setDialogView({ kind: "wiki-list", loading: false, error: null, pages: lastWikiPagesRef.current })
              }
            />
          )}
        </div>
      </div>

      <div className="ow-play-bar">
        <DPad onDirStart={onDirStart} onDirEnd={onDirEnd} onAction={handleAction} />
        <p className="ow-hint bh-muted">
          {coarsePointer
            ? "D-pad to walk · A to interact with signs, terminals, and doors."
            : "Arrows / WASD to walk · Space or A to interact."}
        </p>
      </div>
    </div>
  );
}
