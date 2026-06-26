import { useEffect, useRef } from "react";

/**
 * On mobile browsers, a right-to-left swipe triggers the native "back" gesture
 * (popstate). When the user is viewing a chat thread we want that gesture to
 * return to the conversation list, not to leave the /messenger route entirely.
 *
 * Strategy:
 *  - When `active` becomes true  → push a sentinel state onto history.
 *  - When `active` becomes false → if the sentinel is on top, pop it silently.
 *  - On popstate while active    → call `onBack` and re-push the sentinel so the
 *    next swipe still works.
 */
export function useSwipeBackGuard(active: boolean, onBack: () => void) {
    const sentinelPushedRef = useRef(false);
    // Keep a stable ref to onBack so the effect doesn't re-run on every render
    const onBackRef = useRef(onBack);
    onBackRef.current = onBack;

    useEffect(() => {
        if (!active) {
            // If we had pushed a sentinel, pop it silently when leaving the chat view
            if (sentinelPushedRef.current) {
                sentinelPushedRef.current = false;
                // Replace the sentinel state with the current state so there is
                // nothing extra to pop — avoids an unintended real navigation.
                window.history.replaceState(null, "");
            }
            return;
        }

        // Push sentinel so there is something to "go back" to
        window.history.pushState({ messengerChatOpen: true }, "");
        sentinelPushedRef.current = true;

        const handlePopState = (e: PopStateEvent) => {
            // The user swiped / pressed back — intercept it
            if (e.state?.messengerChatOpen) return; // shouldn't happen, but guard

            // Re-push the sentinel immediately so the next swipe is also caught
            window.history.pushState({ messengerChatOpen: true }, "");
            sentinelPushedRef.current = true;

            onBackRef.current();
        };

        window.addEventListener("popstate", handlePopState);
        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
    }, [active]);
}
