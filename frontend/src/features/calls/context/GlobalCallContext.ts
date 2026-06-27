import { createContext, useContext } from "react";
import type { Conversation } from "@/types/messenger";
import type { CallState, CallType } from "../types/call.types";

export type GlobalCallContextValue = {
	callState: CallState;
	startConversationCall: (
		conversation: Conversation,
		callType: CallType,
	) => void;
};

export const GlobalCallContext =
	createContext<GlobalCallContextValue | null>(null);

export function useGlobalCall() {
	const context = useContext(GlobalCallContext);
	if (!context) {
		throw new Error("useGlobalCall must be used inside GlobalCallProvider");
	}
	return context;
}
