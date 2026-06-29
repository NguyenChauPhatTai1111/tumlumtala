import { createContext, useContext } from "react";
import type { Conversation } from "@/types/messenger";
import type { CallParticipant, CallSession, CallState, CallType } from "../types/call.types";

export type ActiveGroupCallInfo = {
    callId: string;
    conversationId: number;
    callType: CallType;
    callerName?: string;
    callerId: number;
    participantCount: number;
    participants: CallParticipant[];
};

export type GlobalCallContextValue = {
    callState: CallState;
    startConversationCall: (
        conversation: Conversation,
        callType: CallType,
    ) => void;
    /** Non-null when there is an ongoing group call in any conversation */
    activeGroupCalls: Map<number, ActiveGroupCallInfo>;
    joinGroupCall: (conversation: Conversation) => void;
    currentSession: CallSession | null;
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
