import { useCallback, useEffect, useRef, useState } from "react";
import type { MessengerWebSocketService } from "@/services/messengerWebSocketService";
import type { IUser } from "@/types";
import type { Conversation, Participant } from "@/types/messenger";
import { WebRTCClient } from "../services/webRTCClient";
import { callRingtone } from "../services/callRingtone";
import type {
	CallContext,
	CallSession,
	CallSignalPayload,
	CallState,
	CallType,
} from "../types/call.types";
import { nextCallState } from "../utils/callStateMachine";

type UseCallOptions = {
	currentUser?: IUser;
	selectedConversation?: Conversation;
	ws?: MessengerWebSocketService | null;
};

const idleContext: CallContext = { session: null, isCaller: false };

export function useCall({
	currentUser,
	selectedConversation,
	ws,
}: UseCallOptions) {
	const currentUserId = Number(currentUser?.id ?? 0);
	const [state, setState] = useState<CallState>("idle");
	const [context, setContext] = useState<CallContext>(idleContext);
	const [localStream, setLocalStream] = useState<MediaStream | null>(null);
	const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
	const [error, setError] = useState("");
	const [micOn, setMicOn] = useState(true);
	const [cameraOn, setCameraOn] = useState(true);
	const clientRef = useRef<WebRTCClient | null>(null);
	const contextRef = useRef<CallContext>(idleContext);
	const activeCallIdRef = useRef("");

	useEffect(() => {
		contextRef.current = context;
	}, [context]);

	const setCallState = useCallback((next: CallState) => {
		setState((prev) => nextCallState(prev, next));
	}, []);

	const send = useCallback(
		(type: string, payload: unknown) => ws?.sendCall(type, payload),
		[ws],
	);

	// Attach session routing fields so the backend can relay without a DB lookup.
	const sendWithSession = useCallback(
		(type: string, extra: Record<string, unknown>) => {
			const session = contextRef.current.session;
			ws?.sendCall(type, {
				call_id: session?.id ?? activeCallIdRef.current,
				caller_id: session?.caller_id,
				receiver_id: session?.receiver_id,
				conversation_id: session?.conversation_id,
				...extra,
			});
		},
		[ws],
	);

	const cleanup = useCallback(() => {
		clientRef.current?.stop();
		clientRef.current = null;
		activeCallIdRef.current = "";
		setLocalStream(null);
		setRemoteStream(null);
		setMicOn(true);
		setCameraOn(true);
	}, []);

	const resetLater = useCallback(() => {
		window.setTimeout(() => {
			cleanup();
			setContext(idleContext);
			setState("idle");
			setError("");
		}, 1200);
	}, [cleanup]);

	const ensureClient = useCallback(
		() => {
			if (clientRef.current) return clientRef.current;
			clientRef.current = new WebRTCClient(
				(candidate) => {
					if (!activeCallIdRef.current) return;
					const session = contextRef.current.session;
					ws?.sendCall("call:ice-candidate", {
						call_id: activeCallIdRef.current,
						caller_id: session?.caller_id,
						receiver_id: session?.receiver_id,
						conversation_id: session?.conversation_id,
						candidate,
					});
				},
				(stream) => setRemoteStream(stream),
				(connectionState) => {
					if (connectionState === "connected") setCallState("connected");
					if (connectionState === "disconnected") {
						setCallState("reconnecting");
						if (activeCallIdRef.current) {
							const session = contextRef.current.session;
							ws?.sendCall("call:reconnect", {
								call_id: activeCallIdRef.current,
								caller_id: session?.caller_id,
								receiver_id: session?.receiver_id,
								conversation_id: session?.conversation_id,
							});
						}
					}
					if (connectionState === "failed") setCallState("failed");
				},
			);
			return clientRef.current;
		},
		[ws, setCallState],
	);

	const startCall = useCallback(
		async (callType: CallType, conversationOverride?: Conversation) => {
			const conversation = conversationOverride ?? selectedConversation;
			const peer = getPeer(conversation, currentUserId);
			console.log("[startCall] callType=", callType, "conversation=", conversation?.id, "peer=", peer?.id, "currentUserId=", currentUserId, "ws connected=", ws?.isConnected());
			if (!conversation || !peer || !currentUserId) return;
			if (conversation.is_group) {
				setError("Cuộc gọi nhóm chưa được hỗ trợ.");
				setCallState("failed");
				resetLater();
				return;
			}
			setError("");
			setCallState("permission_checking");
			try {
				const client = ensureClient();
				const stream = await client.prepare(callType);
				setLocalStream(stream);
				setContext({
					session: null,
					conversation,
					peer,
					isCaller: true,
				});
				send("call:initiate", {
					conversation_id: conversation.id,
					receiver_id: peer.id,
					call_type: callType,
				});
				callRingtone.playOutgoing();
				setCallState("calling");
			} catch {
				setError("Không thể truy cập camera/microphone.");
				setCallState("failed");
				cleanup();
			}
		},
		[
			cleanup,
			currentUserId,
			ensureClient,
			resetLater,
			selectedConversation,
			send,
			setCallState,
		],
	);

	const acceptCall = useCallback(async () => {
		const session = contextRef.current.session;
		if (!session) return;
		activeCallIdRef.current = session.id;
		setError("");
		setCallState("permission_checking");
		try {
			const client = ensureClient();
			const stream = await client.prepare(session.call_type);
			setLocalStream(stream);
			callRingtone.stop();
			sendWithSession("call:accept", {});
			setCallState("connecting");
		} catch {
			setError("Không thể truy cập camera/microphone.");
			sendWithSession("call:failed", {});
			setCallState("failed");
			cleanup();
		}
	}, [cleanup, ensureClient, sendWithSession, setCallState]);

	const rejectCall = useCallback(() => {
		const session = contextRef.current.session;
		if (!session) return;
		callRingtone.stop();
		sendWithSession("call:reject", {});
		setCallState("rejected");
		resetLater();
	}, [resetLater, send, sendWithSession, setCallState]);

	const cancelOrEndCall = useCallback(() => {
		// Use activeCallIdRef as fallback: contextRef.current.session is updated
		// via useEffect so may not reflect the latest value within the same tick.
		const callId = contextRef.current.session?.id || activeCallIdRef.current;
		if (!callId) {
			callRingtone.stop();
			cleanup();
			setCallState("ended");
			resetLater();
			return;
		}
		const eventType =
			state === "calling" || state === "ringing" || state === "permission_checking"
				? "call:cancel"
				: "call:end";
		callRingtone.stop();
		sendWithSession(eventType, {});
		setCallState(eventType === "call:cancel" ? "cancelled" : "ended");
		resetLater();
	}, [cleanup, resetLater, send, sendWithSession, setCallState, state]);

	const toggleMic = useCallback(() => {
		const enabled = clientRef.current?.toggleMic();
		if (typeof enabled === "boolean") setMicOn(enabled);
	}, []);

	const toggleCamera = useCallback(() => {
		const enabled = clientRef.current?.toggleCamera();
		if (typeof enabled === "boolean") setCameraOn(enabled);
	}, []);

	const switchCamera = useCallback(async () => {
		const stream = await clientRef.current?.switchCamera();
		if (stream) setLocalStream(stream);
	}, []);

	useEffect(() => {
		if (!ws) return;
		const handlers = {
			onCallIncoming: (raw: unknown) => {
				const session = normalizeSession(raw);
				console.log("[call:incoming] raw=", raw, "session=", session, "currentUserId=", currentUserId);
				if (!session) return;
				// Backend already routes call:incoming to the correct user channel.
				// Only skip if we KNOW our ID and it doesn't match (safety guard).
				if (currentUserId > 0 && session.receiver_id !== currentUserId) {
					console.log("[call:incoming] ignored — receiver_id mismatch", session.receiver_id, "!=", currentUserId);
					return;
				}
				// Don't show incoming popup if we're the caller.
				if (currentUserId > 0 && session.caller_id === currentUserId) {
					console.log("[call:incoming] ignored — we are the caller");
					return;
				}
				activeCallIdRef.current = session.id;
				const conversation =
					selectedConversation?.id === session.conversation_id
						? selectedConversation
						: undefined;
				setContext({
					session,
					conversation,
					peer:
						getPeerByID(conversation, session.caller_id) ??
						peerFromPayload(raw, session.caller_id),
					isCaller: false,
				});
				setError("");
				callRingtone.playIncoming();
				setCallState("ringing");
			},
			onCallRinging: (raw: unknown) => {
				const session = normalizeSession(raw);
				if (!session) return;
				activeCallIdRef.current = session.id;
				// Backend routes call:ringing to caller's channel only.
				// If we know our ID, verify we're the caller; otherwise trust routing.
				const isCaller = currentUserId <= 0 || session.caller_id === currentUserId;
				if (!isCaller) return;
				const conversation =
					selectedConversation?.id === session.conversation_id
						? selectedConversation
						: undefined;
				setContext({
					session,
					conversation,
					peer: getPeerByID(
						conversation,
						isCaller ? session.receiver_id : session.caller_id,
					),
					isCaller: true,
				});
				setCallState("calling");
			},
			onCallAccept: async (raw: unknown) => {
				const session = normalizeSession(raw);
				if (!session) return;
				activeCallIdRef.current = session.id;
				setContext((prev) => ({ ...prev, session }));
				callRingtone.stop();
				setCallState("connecting");
				// Use context ref (set in startCall/onCallRinging) to reliably identify caller.
				// Fall back to ID check only if context hasn't been set yet.
				const amCaller = contextRef.current.isCaller ||
					(currentUserId > 0 && session.caller_id === currentUserId);
				if (!amCaller) return;
				const client = ensureClient();
				const offer = await client.createOffer();
				ws?.sendCall("call:offer", {
					call_id: session.id,
					caller_id: session.caller_id,
					receiver_id: session.receiver_id,
					conversation_id: session.conversation_id,
					sdp: offer,
				});
			},
			onCallOffer: async (raw: unknown) => {
				const payload = raw as CallSignalPayload;
				const callID = payload.call_id || payload.id;
				if (!callID || !payload.sdp) return;
				activeCallIdRef.current = callID;
				const session = contextRef.current.session;
				const answer = await ensureClient().handleOffer(payload.sdp);
				ws?.sendCall("call:answer", {
					call_id: callID,
					caller_id: session?.caller_id ?? payload.caller_id,
					receiver_id: session?.receiver_id ?? payload.receiver_id,
					conversation_id: session?.conversation_id ?? payload.conversation_id,
					sdp: answer,
				});
			},
			onCallAnswer: async (raw: unknown) => {
				const payload = raw as CallSignalPayload;
				if (!payload.sdp) return;
				await clientRef.current?.handleAnswer(payload.sdp);
			},
			onCallIceCandidate: async (raw: unknown) => {
				const payload = raw as CallSignalPayload;
				if (!payload.candidate) return;
				await clientRef.current?.addIceCandidate(payload.candidate).catch(() => {});
			},
			onCallReject: () => {
				callRingtone.stop();
				setCallState("rejected");
				resetLater();
			},
			onCallCancel: () => {
				callRingtone.stop();
				setCallState("cancelled");
				resetLater();
			},
			onCallEnd: () => {
				callRingtone.stop();
				setCallState("ended");
				resetLater();
			},
			onCallBusy: (raw: unknown) => {
				const session = normalizeSession(raw);
				setContext((prev) => ({ ...prev, session: session ?? prev.session }));
				setCallState("busy");
				resetLater();
			},
			onCallFailed: (raw: unknown) => {
				const session = normalizeSession(raw);
				setContext((prev) => ({ ...prev, session: session ?? prev.session }));
				callRingtone.stop();
				setCallState(session?.status === "missed" ? "missed" : "failed");
				resetLater();
			},
			onCallMissed: (raw: unknown) => {
				const session = normalizeSession(raw);
				setContext((prev) => ({ ...prev, session: session ?? prev.session }));
				callRingtone.stop();
				setCallState("missed");
				resetLater();
			},
			onCallReconnect: () => setCallState("reconnecting"),
		};
		ws.addHandlers(handlers);
		return () => ws.removeHandlers(handlers);
	}, [
		currentUserId,
		ensureClient,
		resetLater,
		selectedConversation,
		send,
		setCallState,
		ws,
	]);

	useEffect(() => {
		const onUnload = () => {
			const session = contextRef.current.session;
			if (session) send("call:end", { call_id: session.id });
			cleanup();
		};
		window.addEventListener("beforeunload", onUnload);
		return () => {
			window.removeEventListener("beforeunload", onUnload);
			callRingtone.stop();
			cleanup();
		};
	}, [cleanup, send]);

	return {
		state,
		context,
		localStream,
		remoteStream,
		error,
		micOn,
		cameraOn,
		startCall,
		acceptCall,
		rejectCall,
		cancelOrEndCall,
		toggleMic,
		toggleCamera,
		switchCamera,
	};
}

function normalizeSession(raw: unknown): CallSession | null {
	if (!raw || typeof raw !== "object") return null;
	const obj = raw as Record<string, unknown>;
	const id = String(obj.id ?? obj.call_id ?? obj.callId ?? "");
	if (!id) return null;
	return {
		id,
		conversation_id: Number(obj.conversation_id ?? obj.conversationId ?? 0),
		caller_id: Number(obj.caller_id ?? obj.callerId ?? 0),
		receiver_id: Number(obj.receiver_id ?? obj.receiverId ?? 0),
		call_type: obj.call_type === "audio" || obj.callType === "audio" ? "audio" : "video",
		status: String(obj.status ?? ""),
		started_at: stringOrUndefined(obj.started_at ?? obj.startedAt),
		ended_at: stringOrUndefined(obj.ended_at ?? obj.endedAt),
		duration_seconds: Number(obj.duration_seconds ?? obj.durationSeconds ?? 0),
		created_at: stringOrUndefined(obj.created_at ?? obj.createdAt),
		updated_at: stringOrUndefined(obj.updated_at ?? obj.updatedAt),
	};
}

function getPeer(conversation: Conversation | undefined, currentUserId: number) {
	if (!conversation || conversation.is_group) return undefined;
	return conversation.participants.find(
		(participant) => Number(participant.id) !== currentUserId,
	);
}

function getPeerByID(conversation: Conversation | undefined, userID: number) {
	return conversation?.participants.find(
		(participant) => Number(participant.id) === userID,
	);
}

function peerFromPayload(raw: unknown, userID: number): Participant {
	const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
	const fullname =
		stringOrUndefined(obj.caller_name ?? obj.callerName) ??
		stringOrUndefined(obj.sender_name ?? obj.senderName) ??
		"Người gọi";
	return {
		id: userID,
		fullname,
		email: "",
		avatar: stringOrUndefined(obj.caller_avatar ?? obj.callerAvatar),
	};
}

function stringOrUndefined(value: unknown) {
	return typeof value === "string" ? value : undefined;
}
