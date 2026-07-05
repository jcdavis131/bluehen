import type { Direction } from "./engine/game";

/** Mobile touch controls (Spec 0033 V0): fluid d-pad + action button.
 * Pointer capture keeps diagonals from dropping when the finger drifts. */
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
      onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        onDirStart(dir);
      },
      onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
        onDirEnd(dir);
      },
      onPointerCancel: (e: React.PointerEvent<HTMLButtonElement>) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
        onDirEnd(dir);
      },
      onLostPointerCapture: () => onDirEnd(dir),
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
      <button
        type="button"
        className="ow-action-btn"
        aria-label="Interact"
        onPointerDown={(e) => e.preventDefault()}
        onClick={onAction}
      >
        A
      </button>
    </div>
  );
}
