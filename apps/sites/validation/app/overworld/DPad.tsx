import type { Direction } from "./engine/game";

/** Mobile touch controls (Spec 0033 V0): a four-way d-pad plus a single
 * action button, both well over the 44px tap-target minimum. Keyboard
 * (arrows/WASD + Space) covers desktop; this is the parallel input path,
 * not a replacement. */
export function DPad({
  onDirStart,
  onDirEnd,
  onAction,
}: {
  onDirStart: (dir: Direction) => void;
  onDirEnd: (dir: Direction) => void;
  onAction: () => void;
}) {
  function dirProps(dir: Direction) {
    return {
      onPointerDown: (e: React.PointerEvent) => {
        e.preventDefault();
        onDirStart(dir);
      },
      onPointerUp: () => onDirEnd(dir),
      onPointerLeave: () => onDirEnd(dir),
      onPointerCancel: () => onDirEnd(dir),
    };
  }

  return (
    <div className="ow-controls" aria-hidden={false}>
      <div className="ow-dpad" role="group" aria-label="Move">
        <button type="button" className="ow-dpad-btn ow-dpad-up" aria-label="Move up" {...dirProps("up")}>
          ▲
        </button>
        <button
          type="button"
          className="ow-dpad-btn ow-dpad-left"
          aria-label="Move left"
          {...dirProps("left")}
        >
          ◀
        </button>
        <button
          type="button"
          className="ow-dpad-btn ow-dpad-right"
          aria-label="Move right"
          {...dirProps("right")}
        >
          ▶
        </button>
        <button
          type="button"
          className="ow-dpad-btn ow-dpad-down"
          aria-label="Move down"
          {...dirProps("down")}
        >
          ▼
        </button>
      </div>
      <button type="button" className="ow-action-btn" aria-label="Interact" onClick={onAction}>
        A
      </button>
    </div>
  );
}
