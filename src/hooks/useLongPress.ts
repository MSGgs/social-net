import { useRef } from 'react';

/** Долгое нажатие (тач) или правый клик (мышь) → контекстное меню */
export function useLongPress(onLongPress: () => void, onClick?: () => void, ms = 450) {
  const timer = useRef<number>(0);
  const fired = useRef(false);
  const start = useRef({ x: 0, y: 0 });

  const cancel = () => window.clearTimeout(timer.current);

  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      fired.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      timer.current = window.setTimeout(() => {
        fired.current = true;
        navigator.vibrate?.(15);
        onLongPress();
      }, ms);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (Math.abs(e.clientX - start.current.x) > 8 || Math.abs(e.clientY - start.current.y) > 8) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onClick: () => {
      if (!fired.current) onClick?.();
    },
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      cancel();
      fired.current = true;
      onLongPress();
    },
  };
}
