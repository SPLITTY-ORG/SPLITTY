import { useToaster, toast, resolveValue } from "react-hot-toast";
import { useRef } from "react";

/**
 * SwipeableToaster — replaces <Toaster> with swipe-to-dismiss on touch
 * and click-to-dismiss on desktop. Preserves all existing toast styling.
 */
export function SwipeableToaster() {
  const { toasts, handlers } = useToaster();
  const { startPause, endPause, calculateOffset, updateHeight } = handlers;

  return (
    <div
      style={{ position: "fixed", top: 16, right: 16, zIndex: 9999 }}
      onMouseEnter={startPause}
      onMouseLeave={endPause}
    >
      {toasts.map((t) => {
        const offset = calculateOffset(t, { reverseOrder: false, gutter: 8 });
        const ref = (el: HTMLDivElement | null) => {
          if (el && t.height !== el.getBoundingClientRect().height) {
            updateHeight(t.id, el.getBoundingClientRect().height);
          }
        };
        return (
          <ToastItem
            key={t.id}
            t={t}
            offset={offset}
            nodeRef={ref}
            onDismiss={() => toast.dismiss(t.id)}
          />
        );
      })}
    </div>
  );
}

interface ToastItemProps {
  t: ReturnType<typeof useToaster>["toasts"][number];
  offset: number;
  nodeRef: (el: HTMLDivElement | null) => void;
  onDismiss: () => void;
}

function ToastItem({ t, offset, nodeRef, onDismiss }: ToastItemProps) {
  const touchStartX = useRef<number | null>(null);
  const translateX = useRef(0);
  const el = useRef<HTMLDivElement | null>(null);

  const setRef = (node: HTMLDivElement | null) => {
    el.current = node;
    nodeRef(node);
  };

  const applyTranslate = (x: number, transition = false) => {
    if (!el.current) return;
    el.current.style.transition = transition ? "transform 0.2s ease, opacity 0.2s ease" : "none";
    el.current.style.transform = `translateX(${x}px)`;
    el.current.style.opacity = `${Math.max(0, 1 - Math.abs(x) / 120)}`;
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    translateX.current = 0;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    translateX.current = dx;
    applyTranslate(dx);
  };

  const onTouchEnd = () => {
    if (Math.abs(translateX.current) > 80) {
      // Swiped far enough — fly off and dismiss
      applyTranslate(translateX.current > 0 ? 300 : -300, true);
      setTimeout(onDismiss, 200);
    } else {
      // Snap back
      applyTranslate(0, true);
    }
    touchStartX.current = null;
  };

  const visible = t.visible;

  return (
    <div
      ref={setRef}
      onClick={onDismiss}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        position: "absolute",
        right: 0,
        transition: "top 0.3s ease, opacity 0.3s ease",
        top: offset,
        opacity: visible ? 1 : 0,
        cursor: "pointer",
        touchAction: "pan-y",
        userSelect: "none",
        maxWidth: "calc(100vw - 32px)",
        width: "max-content",
      }}
    >
      <div
        style={{
          background: "#1D1712",
          border: "1px solid rgba(242,177,52,0.2)",
          borderRadius: 8,
          padding: "10px 14px",
          color: "#EDE3D0",
          fontSize: 13,
          fontFamily: "monospace",
          boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          minWidth: 220,
        }}
      >
        {resolveValue(t.message, t)}
      </div>
    </div>
  );
}
