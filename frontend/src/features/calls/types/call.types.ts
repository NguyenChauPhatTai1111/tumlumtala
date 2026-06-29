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

export const GROUP_CALL_MAX = 8;

export type CallParticipantStatus = "invited" | "joined" | "left" | "declined" | "missed";

export type CallParticipant = {
    user_id: number;
    fullname: string;
    avatar?: string;
    status: CallParticipantStatus;
    /** MediaStream from this participant's WebRTC peer connection */
    stream?: MediaStream;
    micOn?: boolean;
    cameraOn?: boolean;
};

export type CallSession = {
    id: string;
    conversation_id: number;
    caller_id: number;
    receiver_id: number;
    call_type: CallType;
    status: string;
    is_group?: boolean;
    max_participants?: number;
    participants?: CallParticipant[];
    started_at?: string;
    ended_at?: string;
    duration_seconds?: number;
    created_at?: string;
    updated_at?: string;
};

export type CallContext = {
    session: CallSession | null;
    conversation?: Conversation;
    /** For 1-on-1 calls */
    peer?: Participant;
    callType?: CallType;
    isCaller: boolean;
    /** For group calls – keyed by user_id */
    groupParticipants: Map<number, CallParticipant>;
};

export type CallSignalPayload = Partial<CallSession> & {
    call_id?: string;
    sdp?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
    sender_id?: number;
    participant_user_id?: number;
    target_user_id?: number;
    conversation_id?: number;
    call_type?: CallType;
    participants?: CallParticipant[];
};
