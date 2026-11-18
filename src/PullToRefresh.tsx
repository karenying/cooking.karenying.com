import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowDown, RefreshCw } from "lucide-react";

const threshold = 72;

/** The mobile content pane owns scrolling, including in iOS Home Screen mode. */
export function PullToRefresh({ children, disabled, route }: {
  children: ReactNode;
  disabled: boolean;
  route: string;
}) {
  const pane = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const element = pane.current;
    if (!element) return;
    let start: { x: number; y: number } | null = null;
    let pulling = false;
    let pull = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reset = () => {
      start = null;
      pulling = false;
      pull = 0;
      setDistance(0);
    };
    reset();
    setRefreshing(false);
    const allowed = () => !disabled && window.matchMedia("(max-width: 899px)").matches
      && element.scrollTop <= 0 && !document.querySelector("dialog[open]");
    function onStart(event: TouchEvent) {
      reset();
      if (!allowed() || event.touches.length !== 1) return;
      const target = event.target;
      if (!(target instanceof Element)
        || target.closest("a, button, input, textarea, select, [contenteditable], dialog")) return;
      // Leave nested scrolling regions (including the analytics table) alone.
      for (let node: Element | null = target; node && node !== element; node = node.parentElement) {
        const style = getComputedStyle(node);
        if ((/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight)
          || (/(auto|scroll)/.test(style.overflowX) && node.scrollWidth > node.clientWidth)) return;
      }
      start = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }
    function onMove(event: TouchEvent) {
      if (!start) return;
      if (!allowed() || event.touches.length !== 1 || !event.cancelable) { reset(); return; }
      const dx = Math.abs(event.touches[0].clientX - start.x);
      const dy = event.touches[0].clientY - start.y;
      if (!pulling) {
        if (Math.max(dx, Math.abs(dy)) < 8) return;
        if (dy <= 0 || dx >= dy) { reset(); return; }
        pulling = true;
      }
      event.preventDefault();
      pull = Math.min(96, Math.max(0, dy * 0.5));
      setDistance(pull);
    }
    function onEnd() {
      const shouldRefresh = pulling && pull >= threshold && allowed();
      reset();
      if (shouldRefresh) {
        setRefreshing(true);
        // Let the refresh status paint before navigating; the hash keeps this page.
        timer = setTimeout(() => window.location.reload(), 150);
      }
    }
    element.addEventListener("touchstart", onStart, { passive: true });
    element.addEventListener("touchmove", onMove, { passive: false });
    element.addEventListener("touchend", onEnd);
    element.addEventListener("touchcancel", reset);
    return () => {
      clearTimeout(timer);
      element.removeEventListener("touchstart", onStart);
      element.removeEventListener("touchmove", onMove);
      element.removeEventListener("touchend", onEnd);
      element.removeEventListener("touchcancel", reset);
    };
  }, [disabled, route]);

  const ready = distance >= threshold;
  return <div className="workspace" ref={pane}>
    <div className="pull-refresh-anchor" role="status" aria-live="polite">
      {(distance > 0 || refreshing) && <div className="pull-refresh-indicator">
        {refreshing ? <RefreshCw size={16} className="pull-refresh-spinner" aria-hidden="true" />
          : <ArrowDown size={16} style={{ transform: ready ? "rotate(180deg)" : undefined }} aria-hidden="true" />}
        <span>{refreshing ? "Refreshing…" : ready ? "Release to refresh" : "Pull to refresh"}</span>
      </div>}
    </div>
    {children}
  </div>;
}
