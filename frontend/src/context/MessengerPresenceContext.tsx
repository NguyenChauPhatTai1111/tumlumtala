/* eslint-disable react-refresh/only-export-components */
import { createContext, type ReactNode, useContext } from "react";
import { usePresence } from "@/hooks/messenger/usePresence";
import { useSharedMessengerWS } from "@/context/MessengerWebSocketContext";

const MessengerPresenceContext = createContext<Set<number>>(new Set());

export function MessengerPresenceProvider({
	children,
}: {
	children: ReactNode;
}) {
	const ws = useSharedMessengerWS();
	const onlineUserIds = usePresence(ws);

	return (
		<MessengerPresenceContext.Provider value={onlineUserIds}>
			{children}
		</MessengerPresenceContext.Provider>
	);
}

export function useMessengerPresence() {
	return useContext(MessengerPresenceContext);
}
