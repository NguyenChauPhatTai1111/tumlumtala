import type { Conversation, Participant } from "@/types/messenger";

export type CallType = "audio" | "video";

export type CallState =
	| "idle"
	| "permission_checking"
	| "calling"
	| "ringing"
	| "connecting"
	| "connected"
	| "reconnecting"
	| "ended"
	| "cancelled"
	| "rejected"
	| "missed"
	| "failed"
	| "busy";

export type CallSession = {
	id: string;
	conversation_id: number;
	caller_id: number;
	receiver_id: number;
	call_type: CallType;
	status: string;
	started_at?: string;
	ended_at?: string;
	duration_seconds?: number;
	created_at?: string;
	updated_at?: string;
};

export type CallContext = {
	session: CallSession | null;
	conversation?: Conversation;
	peer?: Participant;
	isCaller: boolean;
};

export type CallSignalPayload = Partial<CallSession> & {
	call_id?: string;
	sdp?: RTCSessionDescriptionInit;
	candidate?: RTCIceCandidateInit;
	sender_id?: number;
	conversation_id?: number;
	call_type?: CallType;
};
