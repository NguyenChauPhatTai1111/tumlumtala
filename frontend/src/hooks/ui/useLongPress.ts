import { useCallback, useEffect, useRef } from "react";

const LONG_PRESS_DELAY_MS = 500;
// How long to suppress the synthetic click that browsers fire after touchend
const SUPPRESS_CLICK_AFTER_LONG_PRESS_MS = 600;

interface LongPressOptions {
    onLongPress: (event: React.TouchEvent | React.PointerEvent) => void;
    onClick?: (event: React.TouchEvent) => void;
    delay?: number;
}

export function useLongPress({ onLongPress, onClick, delay = LONG_PRESS_DELAY_MS }: LongPressOptions) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLongPressRef = useRef(false);
    const startPositionRef = useRef<{ x: number; y: number } | null>(null);
    const suppressClickUntilRef = useRef<number>(0);

    const clear = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    // Capture-phase click suppressor: blocks the synthetic click that browsers
    // generate from touchend after a long-press, which would otherwise close
    // any menu/popover that was just opened.
    useEffect(() => {
        const suppress = (e: MouseEvent) => {
            if (Date.now() < suppressClickUntilRef.current) {
                e.stopPropagation();
                e.preventDefault();
            }
        };
        document.addEventListener("click", suppress, true);
        return () => document.removeEventListener("click", suppress, true);
    }, []);

    const onTouchStart = useCallback(
        (event: React.TouchEvent) => {
            isLongPressRef.current = false;
            const touch = event.touches[0];
            startPositionRef.current = { x: touch.clientX, y: touch.clientY };
            timerRef.current = setTimeout(() => {
                isLongPressRef.current = true;
                // Suppress native text selection / iOS callout
                window.getSelection()?.removeAllRanges();
                // Block the upcoming synthetic click for a short window
                suppressClickUntilRef.current = Date.now() + SUPPRESS_CLICK_AFTER_LONG_PRESS_MS;
                onLongPress(event);
                timerRef.current = null;
            }, delay);
        },
        [onLongPress, delay],
    );

    const onTouchMove = useCallback(
        (event: React.TouchEvent) => {
            if (!startPositionRef.current) return;
            const touch = event.touches[0];
            const dx = Math.abs(touch.clientX - startPositionRef.current.x);
            const dy = Math.abs(touch.clientY - startPositionRef.current.y);
            if (dx > 8 || dy > 8) {
                clear();
            }
        },
        [clear],
    );

    const onTouchEnd = useCallback(
        (event: React.TouchEvent) => {
            clear();
            if (isLongPressRef.current) {
                event.preventDefault();
            } else {
                onClick?.(event);
            }
            isLongPressRef.current = false;
        },
        [clear, onClick],
    );

    return { onTouchStart, onTouchMove, onTouchEnd };
}
