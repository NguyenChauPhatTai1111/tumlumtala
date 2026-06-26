import {
	createContext,
	type ReactNode,
	useContext,
} from "react";
import { useMessengerWebSocketConnection } from "@/hooks/messenger/useMessengerWebSocketConnection";
import type { MessengerWebSocketService } from "@/services/messengerWebSocketService";

const MessengerWebSocketContext = createContext<MessengerWebSocketService | null>(null);

/**
 * Provides a single shared WebSocket connection for the entire app.
 * All consumers (messenger page, call layer, mini-messenger, etc.) use
 * the same instance so they all receive the same events without creating
 * multiple redundant connections.
 */
export function MessengerWebSocketProvider({ children }: { children: ReactNode }) {
	const ws = useMessengerWebSocketConnection();
	return (
		<MessengerWebSocketContext.Provider value={ws}>
			{children}
		</MessengerWebSocketContext.Provider>
	);
}

export function useSharedMessengerWS(): MessengerWebSocketService | null {
	return useContext(MessengerWebSocketContext);
}
