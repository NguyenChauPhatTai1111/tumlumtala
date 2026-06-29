import { useCallback, useEffect, useRef, useState } from "react";
import type { MessengerWebSocketService } from "@/services/messengerWebSocketService";
import type { IUser } from "@/types";
import type { Conversation, Participant } from "@/types/messenger";
import { MeshWebRTCManager, WebRTCClient } from "../services/webRTCClient";
import { callRingtone } from "../services/callRingtone";
import type {
    CallContext,
    CallParticipant,
    CallSession,
    CallSignalPayload,
    CallState,
    CallType,
} from "../types/call.types";
import { GROUP_CALL_MAX } from "../types/call.types";
import { nextCallState } from "../utils/callStateMachine";

type UseCallOptions = {
    currentUser?: IUser;
    selectedConversation?: Conversation;
    ws?: MessengerWebSocketService | null;
};

const idleContext: CallContext = {
    session: null,
    isCaller: false,
    groupParticipants: new Map(),
};

export function useCall({ currentUser, selectedConversation, ws }: UseCallOptions) {
    const currentUserId = Number(currentUser?.id ?? 0);
    const [state, setState] = useState<CallState>("idle");
    const [context, setContext] = useState<CallContext>(idleContext);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState("");
    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(true);

    // 1-on-1 client
    const clientRef = useRef<WebRTCClient | null>(null);
    // Group call mesh manager
    const meshRef = useRef<MeshWebRTCManager | null>(null);

    const contextRef = useRef<CallContext>(idleContext);
    const activeCallIdRef = useRef("");
    // Keep ws in a ref so mesh callbacks always use the latest instance
    const wsRef = useRef(ws);
    useEffect(() => {
        wsRef.current = ws;
    }, [ws]);

    useEffect(() => {
        contextRef.current = context;
    }, [context]);

    const setCallState = useCallback((next: CallState) => {
        setState((prev) => nextCallState(prev, next));
    }, []);

    const send = useCallback((type: string, payload: unknown) => ws?.sendCall(type, payload), [ws]);
    const broadcastMediaState = useCallback(
        (nextMicOn: boolean, nextCameraOn: boolean) => {
            const session = contextRef.current.session;
            if (!session) return;
            ws?.sendCall("call:media-state", {
                call_id: session.id,
                mic_on: nextMicOn,
                camera_on: nextCameraOn,
            });
        },
        [ws],
    );

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
        meshRef.current?.stop();
        meshRef.current = null;
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

    // -------------------------------------------------------------------------
    // Group participant management
    // -------------------------------------------------------------------------

    const updateGroupParticipant = useCallback(
        (userId: number, patch: Partial<CallParticipant>) => {
            setContext((prev) => {
                const map = new Map(prev.groupParticipants);
                const existing = map.get(userId) ?? {
                    user_id: userId,
                    fullname: "",
                    status: "invited" as const,
                };
                map.set(userId, { ...existing, ...patch });
                const next = { ...prev, groupParticipants: map };
                contextRef.current = next;
                return next;
            });
        },
        [],
    );

    const removeGroupParticipant = useCallback((userId: number) => {
        setContext((prev) => {
            const map = new Map(prev.groupParticipants);
            map.delete(userId);
            meshRef.current?.removePeer(userId);
            const next = { ...prev, groupParticipants: map };
            contextRef.current = next;
            return next;
        });
    }, []);

    // -------------------------------------------------------------------------
    // 1-on-1 WebRTC setup
    // -------------------------------------------------------------------------

    const ensureClient = useCallback(() => {
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
    }, [ws, setCallState]);

    // -------------------------------------------------------------------------
    // Group call mesh WebRTC setup
    // -------------------------------------------------------------------------

    const ensureMesh = useCallback(() => {
        if (meshRef.current) return meshRef.current;
        meshRef.current = new MeshWebRTCManager({
            onIceCandidate: (candidate, remoteUserId) => {
                wsRef.current?.sendCall("call:ice-candidate", {
                    call_id: activeCallIdRef.current,
                    conversation_id: contextRef.current.session?.conversation_id,
                    target_user_id: remoteUserId,
                    candidate,
                });
            },
            onRemoteStream: (stream, remoteUserId) => {
                updateGroupParticipant(remoteUserId, { stream, status: "joined" });
            },
            onConnectionState: (connState, remoteUserId) => {
                if (connState === "failed" || connState === "disconnected") {
                    updateGroupParticipant(remoteUserId, { stream: undefined });
                }
            },
        });
        return meshRef.current;
    }, [updateGroupParticipant]);

    // -------------------------------------------------------------------------
    // Start call
    // -------------------------------------------------------------------------

    const startCall = useCallback(
        async (callType: CallType, conversationOverride?: Conversation) => {
            const conversation = conversationOverride ?? selectedConversation;
            if (!conversation || !currentUserId) return;

            setError("");
            setCallState("permission_checking");

            if (conversation.is_group) {
                // Group call
                try {
                    const mesh = ensureMesh();
                    const stream = await mesh.prepare(callType);
                    setLocalStream(stream);
                    setCameraOn(callType === "video");
                    setContext({
                        session: null,
                        conversation,
                        callType,
                        isCaller: true,
                        groupParticipants: new Map([
                            [
                                currentUserId,
                                {
                                    user_id: currentUserId,
                                    fullname: currentUser?.fullname ?? "",
                                    avatar: currentUser?.avatar,
                                    status: "joined",
                                    stream,
                                    micOn: true,
                                    cameraOn: callType === "video",
                                },
                            ],
                        ]),
                    });
                    send("call:initiate", {
                        conversation_id: conversation.id,
                        call_type: callType,
                        is_group: true,
                    });
                    callRingtone.playOutgoing();
                    setCallState("calling");
                } catch {
                    setError(
                        callType === "audio"
                            ? "Không thể truy cập microphone."
                            : "Không thể truy cập camera/microphone.",
                    );
                    setCallState("failed");
                    cleanup();
                }
                return;
            }

            // 1-on-1 call
            const peer = getPeer(conversation, currentUserId);
            if (!peer) return;

            setContext({
                session: null,
                conversation,
                peer,
                callType,
                isCaller: true,
                groupParticipants: new Map(),
            });
            try {
                const client = ensureClient();
                const stream = await client.prepare(callType);
                setLocalStream(stream);
                setCameraOn(callType === "video");
                send("call:initiate", {
                    conversation_id: conversation.id,
                    receiver_id: peer.id,
                    call_type: callType,
                    is_group: false,
                });
                callRingtone.playOutgoing();
                setCallState("calling");
            } catch {
                setError(
                    callType === "audio"
                        ? "Không thể truy cập microphone."
                        : "Không thể truy cập camera/microphone.",
                );
                setCallState("failed");
                cleanup();
            }
        },
        [
            cleanup,
            currentUser,
            currentUserId,
            ensureClient,
            ensureMesh,
            selectedConversation,
            send,
            setCallState,
        ],
    );

    // -------------------------------------------------------------------------
    // Accept call (1-on-1) or join group call
    // -------------------------------------------------------------------------

    const joinGroupCall = useCallback(
        async (
            session: CallSession,
            conversation?: Conversation,
            participants?: CallParticipant[],
        ) => {
            activeCallIdRef.current = session.id;
            setError("");
            setCallState("permission_checking");
            const groupParticipants = new Map(
                (participants ?? session.participants ?? []).map((participant) => [
                    participant.user_id,
                    participant,
                ]),
            );
            const nextContext: CallContext = {
                session,
                conversation: conversation ?? contextRef.current.conversation,
                callType: session.call_type,
                isCaller: session.caller_id === currentUserId,
                groupParticipants,
            };
            contextRef.current = nextContext;
            setContext(nextContext);
            try {
                const mesh = ensureMesh();
                const stream = await mesh.prepare(session.call_type);
                setLocalStream(stream);
                setCameraOn(session.call_type === "video");
                updateGroupParticipant(currentUserId, {
                    user_id: currentUserId,
                    fullname: currentUser?.fullname ?? "",
                    avatar: currentUser?.avatar,
                    status: "joined",
                    stream,
                    micOn: true,
                    cameraOn: session.call_type === "video",
                });
                callRingtone.stop();
                ws?.sendCall("call:group-join", { call_id: session.id });
                setCallState("connecting");
            } catch {
                setError(
                    session.call_type === "audio"
                        ? "Không thể truy cập microphone."
                        : "Không thể truy cập camera/microphone.",
                );
                setCallState("failed");
                cleanup();
            }
        },
        [cleanup, currentUser, currentUserId, ensureMesh, setCallState, updateGroupParticipant, ws],
    );

    const acceptCall = useCallback(async () => {
        const session = contextRef.current.session;
        if (!session) return;

        if (session.is_group) {
            await joinGroupCall(session, contextRef.current.conversation, [
                ...contextRef.current.groupParticipants.values(),
            ]);
            return;
        }

        activeCallIdRef.current = session.id;
        setError("");
        setCallState("permission_checking");

        // 1-on-1 accept
        try {
            const client = ensureClient();
            const stream = await client.prepare(session.call_type);
            setLocalStream(stream);
            setCameraOn(session.call_type === "video");
            callRingtone.stop();
            sendWithSession("call:accept", {});
            setCallState("connecting");
        } catch {
            setError(
                session.call_type === "audio"
                    ? "Không thể truy cập microphone."
                    : "Không thể truy cập camera/microphone.",
            );
            sendWithSession("call:failed", {});
            setCallState("failed");
            cleanup();
        }
    }, [cleanup, ensureClient, joinGroupCall, sendWithSession, setCallState]);

    const rejectCall = useCallback(() => {
        const session = contextRef.current.session;
        if (!session) return;
        callRingtone.stop();
        if (session.is_group) {
            ws?.sendCall("call:group-decline", { call_id: session.id });
            cleanup();
            setContext(idleContext);
            setState("idle");
            return;
        }
        sendWithSession("call:reject", {});
        setCallState("rejected");
        resetLater();
    }, [cleanup, resetLater, sendWithSession, setCallState, ws]);

    const cancelOrEndCall = useCallback(() => {
        const callId = contextRef.current.session?.id || activeCallIdRef.current;
        const session = contextRef.current.session;

        if (!callId) {
            callRingtone.stop();
            cleanup();
            setCallState("ended");
            resetLater();
            return;
        }

        callRingtone.stop();

        if (session?.is_group) {
            // If caller cancels before anyone joined, end the whole call
            if (state === "calling" || state === "ringing" || state === "permission_checking") {
                ws?.sendCall("call:end", { call_id: callId });
                setCallState("cancelled");
            } else {
                // Leave the group call
                ws?.sendCall("call:group-leave", { call_id: callId });
                setCallState("ended");
            }
            resetLater();
            return;
        }

        const eventType =
            state === "calling" || state === "ringing" || state === "permission_checking"
                ? "call:cancel"
                : "call:end";
        sendWithSession(eventType, {});
        setCallState(eventType === "call:cancel" ? "cancelled" : "ended");
        resetLater();
    }, [cleanup, resetLater, sendWithSession, setCallState, state, ws]);

    const toggleMic = useCallback(() => {
        if (contextRef.current.session?.is_group) {
            const enabled = meshRef.current?.toggleMic();
            if (typeof enabled === "boolean") {
                setMicOn(enabled);
                updateGroupParticipant(currentUserId, { micOn: enabled });
                broadcastMediaState(enabled, cameraOn);
            }
        } else {
            const enabled = clientRef.current?.toggleMic();
            if (typeof enabled === "boolean") setMicOn(enabled);
        }
    }, [broadcastMediaState, cameraOn, currentUserId, updateGroupParticipant]);

    const toggleCamera = useCallback(async () => {
        if (contextRef.current.session?.is_group) {
            const mesh = meshRef.current;
            if (!mesh) return;
            if (cameraOn) {
                mesh.toggleCamera();
                setCameraOn(false);
                updateGroupParticipant(currentUserId, { cameraOn: false });
                broadcastMediaState(micOn, false);
                const stream = mesh.getLocalStream();
                if (stream) setLocalStream(new MediaStream(stream.getTracks()));
            } else {
                const stream = await mesh.enableCamera();
                if (stream) setLocalStream(new MediaStream(stream.getTracks()));
                setCameraOn(true);
                updateGroupParticipant(currentUserId, { cameraOn: true });
                broadcastMediaState(micOn, true);
            }
            return;
        }
        const client = clientRef.current;
        if (!client) return;
        if (cameraOn) {
            client.toggleCamera();
            setCameraOn(false);
            const stream = client.getLocalStream();
            if (stream) setLocalStream(new MediaStream(stream.getTracks()));
        } else {
            const stream = await client.enableCamera();
            if (stream) setLocalStream(new MediaStream(stream.getTracks()));
            setCameraOn(true);
        }
    }, [broadcastMediaState, cameraOn, currentUserId, micOn, updateGroupParticipant]);

    const switchCamera = useCallback(async () => {
        if (contextRef.current.session?.is_group) {
            const stream = await meshRef.current?.switchCamera();
            if (stream) setLocalStream(stream);
        } else {
            const stream = await clientRef.current?.switchCamera();
            if (stream) setLocalStream(stream);
        }
    }, []);

    const dismissSyncedCall = useCallback(() => {
        callRingtone.stop();
        cleanup();
        setContext(idleContext);
        setState("idle");
        setError("");
    }, [cleanup]);

    // -------------------------------------------------------------------------
    // Group call: reconcile the full mesh from the server participant state.
    // Exactly one side of each pair creates the offer, preventing offer glare.
    // -------------------------------------------------------------------------

    const reconcileGroupPeers = useCallback(
        async (participants: Map<number, CallParticipant>, session: CallSession) => {
            const mesh = meshRef.current;
            if (!mesh) return;

            for (const participant of participants.values()) {
                if (participant.status !== "joined") continue;
                const remoteId = participant.user_id;
                if (remoteId === currentUserId) continue;
                let peer = mesh.getPeer(remoteId);
                if (peer?.needsReplacement()) {
                    mesh.removePeer(remoteId);
                    peer = undefined;
                }
                peer ??= mesh.getOrCreatePeer(remoteId);
                if (currentUserId > remoteId) continue;
                if (peer.hasSessionDescription()) continue;

                const offer = await peer.createOffer();
                ws?.sendCall("call:offer", {
                    call_id: session.id,
                    conversation_id: session.conversation_id,
                    target_user_id: remoteId,
                    sdp: offer,
                });
            }
        },
        [currentUserId, ws],
    );

    // -------------------------------------------------------------------------
    // WebSocket event handlers
    // -------------------------------------------------------------------------

    useEffect(() => {
        if (!ws) return;
        const handlers = {
            // ------------------------------------------------------------------
            // 1-on-1 events (unchanged)
            // ------------------------------------------------------------------
            onCallIncoming: (raw: unknown) => {
                const session = normalizeSession(raw);
                if (!session) return;
                if (currentUserId > 0 && session.receiver_id !== currentUserId) return;
                if (currentUserId > 0 && session.caller_id === currentUserId) return;

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
                    callType: session.call_type,
                    isCaller: false,
                    groupParticipants: new Map(),
                });
                setError("");
                callRingtone.playIncoming();
                setCallState("ringing");
            },

            onCallRinging: (raw: unknown) => {
                const session = normalizeSession(raw);
                if (!session) return;
                activeCallIdRef.current = session.id;
                const isCaller = currentUserId <= 0 || session.caller_id === currentUserId;
                if (!isCaller) return;
                const conversation =
                    selectedConversation?.id === session.conversation_id
                        ? selectedConversation
                        : undefined;
                setContext((prev) => ({
                    ...prev,
                    session,
                    conversation,
                    peer:
                        getPeerByID(
                            conversation,
                            isCaller ? session.receiver_id : session.caller_id,
                        ) ??
                        prev.peer ??
                        peerFromPayload(raw, isCaller ? session.receiver_id : session.caller_id),
                    callType: session.call_type,
                    isCaller: true,
                }));
                setCallState("calling");
            },

            onCallAccept: async (raw: unknown) => {
                const session = normalizeSession(raw);
                if (!session) return;
                activeCallIdRef.current = session.id;
                setContext((prev) => ({ ...prev, session }));
                callRingtone.stop();
                setCallState("connecting");
                const amCaller =
                    contextRef.current.isCaller ||
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
                const isGroup = session?.is_group ?? payload.is_group;

                if (isGroup) {
                    const senderId = payload.sender_id;
                    if (!senderId) return;
                    const mesh = ensureMesh();
                    const peer = mesh.getOrCreatePeer(senderId);
                    const answer = await peer.handleOffer(payload.sdp);
                    ws?.sendCall("call:answer", {
                        call_id: callID,
                        conversation_id: session?.conversation_id ?? payload.conversation_id,
                        target_user_id: senderId,
                        sdp: answer,
                    });
                } else {
                    const answer = await ensureClient().handleOffer(payload.sdp);
                    ws?.sendCall("call:answer", {
                        call_id: callID,
                        caller_id: session?.caller_id ?? payload.caller_id,
                        receiver_id: session?.receiver_id ?? payload.receiver_id,
                        conversation_id: session?.conversation_id ?? payload.conversation_id,
                        sdp: answer,
                    });
                }
            },

            onCallAnswer: async (raw: unknown) => {
                const payload = raw as CallSignalPayload;
                if (!payload.sdp) return;
                const isGroup = contextRef.current.session?.is_group;
                if (isGroup) {
                    const senderId = payload.sender_id;
                    if (!senderId) return;
                    const peer = meshRef.current?.getPeer(senderId);
                    if (peer) await peer.handleAnswer(payload.sdp);
                } else {
                    await clientRef.current?.handleAnswer(payload.sdp);
                }
            },

            onCallIceCandidate: async (raw: unknown) => {
                const payload = raw as CallSignalPayload;
                if (!payload.candidate) return;
                const isGroup = contextRef.current.session?.is_group;
                if (isGroup) {
                    const senderId = payload.sender_id;
                    if (!senderId) return;
                    const peer = ensureMesh().getOrCreatePeer(senderId);
                    await peer.addIceCandidate(payload.candidate).catch(() => {});
                } else {
                    await clientRef.current?.addIceCandidate(payload.candidate).catch(() => {});
                }
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

            // ------------------------------------------------------------------
            // Group call events
            // ------------------------------------------------------------------

            onCallGroupRinging: (raw: unknown) => {
                // Caller's own ack: call created, waiting for others to join.
                const session = normalizeSession(raw);
                if (!session) return;
                activeCallIdRef.current = session.id;
                const fromServer = normalizeGroupParticipants(
                    raw,
                    currentUserId,
                    selectedConversation?.participants ??
                        contextRef.current.conversation?.participants,
                );
                setContext((prev) => {
                    // Merge: keep existing streams already attached to participants
                    const merged = new Map(fromServer);
                    for (const [uid, existing] of prev.groupParticipants) {
                        const updated = merged.get(uid);
                        if (updated && existing.stream) {
                            merged.set(uid, { ...updated, stream: existing.stream });
                        }
                    }
                    return { ...prev, session, groupParticipants: merged, isCaller: true };
                });
                // Stay in "calling" state – set by startCall
            },

            onCallGroupIncoming: (raw: unknown) => {
                const session = normalizeSession(raw);
                if (!session) return;
                if (currentUserId > 0 && session.caller_id === currentUserId) return;
                if (activeCallIdRef.current && activeCallIdRef.current !== session.id) return;

                activeCallIdRef.current = session.id;
                const conversation =
                    selectedConversation?.id === session.conversation_id
                        ? selectedConversation
                        : undefined;

                const participants = normalizeGroupParticipants(
                    raw,
                    currentUserId,
                    selectedConversation?.participants ??
                        contextRef.current.conversation?.participants,
                );
                setContext({
                    session,
                    conversation,
                    callType: session.call_type,
                    isCaller: false,
                    groupParticipants: participants,
                });
                setError("");
                callRingtone.playIncoming();
                setCallState("ringing");
            },

            onCallGroupOngoing: (raw: unknown) => {
                const session = normalizeSession(raw);
                if (!session) return;
                const current = contextRef.current;
                const participants = normalizeGroupParticipants(
                    raw,
                    currentUserId,
                    selectedConversation?.participants ?? current.conversation?.participants,
                );
                if (current.session?.id === session.id && meshRef.current?.getLocalStream()) {
                    const merged = mergeGroupParticipants(current.groupParticipants, participants);
                    const nextContext = { ...current, session, groupParticipants: merged };
                    contextRef.current = nextContext;
                    setContext(nextContext);
                    void reconcileGroupPeers(merged, session);
                    return;
                }
                if (current.session?.id === session.id && !current.isCaller) {
                    callRingtone.stop();
                    cleanup();
                    contextRef.current = idleContext;
                    setContext(idleContext);
                    setState("idle");
                }
            },

            onCallGroupStarted: async (raw: unknown) => {
                const session = normalizeSession(raw);
                if (!session) return;
                activeCallIdRef.current = session.id;
                const participants = normalizeGroupParticipants(
                    raw,
                    currentUserId,
                    selectedConversation?.participants ??
                        contextRef.current.conversation?.participants,
                );
                const nextContext: CallContext = {
                    ...contextRef.current,
                    session,
                    groupParticipants: participants,
                    isCaller: true,
                };
                contextRef.current = nextContext;
                setContext(nextContext);
                callRingtone.stop();
                setCallState("connecting");
                setCallState("connected");
                await reconcileGroupPeers(participants, session);
                broadcastMediaState(micOn, session.call_type === "video" && cameraOn);
            },

            onCallGroupJoined: async (raw: unknown) => {
                const session = normalizeSession(raw);
                if (!session) return;
                activeCallIdRef.current = session.id;
                const participants = normalizeGroupParticipants(
                    raw,
                    currentUserId,
                    selectedConversation?.participants ??
                        contextRef.current.conversation?.participants,
                );
                const nextContext: CallContext = {
                    ...contextRef.current,
                    session,
                    groupParticipants: participants,
                };
                contextRef.current = nextContext;
                setContext(nextContext);
                callRingtone.stop();
                setCallState("connected");
                await reconcileGroupPeers(participants, session);
                broadcastMediaState(micOn, session.call_type === "video" && cameraOn);
            },

            onCallGroupState: (raw: unknown) => {
                const session = normalizeSession(raw);
                if (!session) return;
                const participants = normalizeGroupParticipants(
                    raw,
                    currentUserId,
                    selectedConversation?.participants ??
                        contextRef.current.conversation?.participants,
                );
                const merged = mergeGroupParticipants(
                    contextRef.current.groupParticipants,
                    participants,
                );
                const nextContext: CallContext = {
                    ...contextRef.current,
                    session,
                    groupParticipants: merged,
                };
                contextRef.current = nextContext;
                setContext(nextContext);
                void reconcileGroupPeers(merged, session);
            },

            onCallGroupParticipantJoined: async (raw: unknown) => {
                const payload = raw as CallSignalPayload & { participants?: CallParticipant[] };
                const joinedUserId = payload.participant_user_id;
                if (!joinedUserId || joinedUserId === currentUserId) return;

                const participants = normalizeGroupParticipants(
                    raw,
                    currentUserId,
                    selectedConversation?.participants ??
                        contextRef.current.conversation?.participants,
                );
                const mesh = meshRef.current;
                const session = contextRef.current.session;
                if (!mesh || !session) return;
                mesh.removePeer(joinedUserId);
                const merged = mergeGroupParticipants(
                    contextRef.current.groupParticipants,
                    participants,
                );
                const nextContext = { ...contextRef.current, groupParticipants: merged };
                contextRef.current = nextContext;
                setContext(nextContext);
                await reconcileGroupPeers(merged, session);
                broadcastMediaState(micOn, session.call_type === "video" && cameraOn);
            },

            onCallGroupParticipantLeft: (raw: unknown) => {
                const leftUserId = (raw as CallSignalPayload).participant_user_id;
                if (leftUserId) removeGroupParticipant(leftUserId);
                const participants = normalizeGroupParticipants(
                    raw,
                    currentUserId,
                    selectedConversation?.participants ??
                        contextRef.current.conversation?.participants,
                );
                setContext((prev) => ({
                    ...prev,
                    groupParticipants: mergeGroupParticipants(prev.groupParticipants, participants),
                }));
            },

            onCallMediaState: (raw: unknown) => {
                const payload = raw as CallSignalPayload & {
                    mic_on?: boolean;
                    camera_on?: boolean;
                };
                const userId = Number(payload.participant_user_id ?? payload.sender_id ?? 0);
                if (!userId || userId === currentUserId) return;
                updateGroupParticipant(userId, {
                    micOn: payload.mic_on,
                    cameraOn: payload.camera_on,
                });
            },

            onCallGroupLeft: () => {
                setCallState("ended");
                resetLater();
            },

            onCallGroupDeclined: () => {
                callRingtone.stop();
                cleanup();
                contextRef.current = idleContext;
                setContext(idleContext);
                setState("idle");
            },

            onCallGroupMissed: (raw: unknown) => {
                const session = normalizeSession(raw);
                setContext((prev) => ({ ...prev, session: session ?? prev.session }));
                callRingtone.stop();
                setCallState("missed");
                resetLater();
            },

            onCallGroupFull: () => {
                setError(`Phòng cuộc gọi đã đầy, tối đa ${GROUP_CALL_MAX} người.`);
                setCallState("failed");
                resetLater();
            },
        };

        console.debug("[useCall] registering WS handlers");
        ws.addHandlers(handlers);
        return () => {
            console.debug("[useCall] removing WS handlers");
            ws.removeHandlers(handlers);
        };
    }, [
        currentUserId,
        broadcastMediaState,
        cameraOn,
        cleanup,
        ensureClient,
        ensureMesh,
        reconcileGroupPeers,
        removeGroupParticipant,
        resetLater,
        selectedConversation,
        send,
        micOn,
        updateGroupParticipant,
        ws,
        setCallState,
    ]);

    // A reconnect or a dropped join event must not leave the mesh stale. This
    // heartbeat is sent only by clients that have active local media.
    useEffect(() => {
        const session = context.session;
        if (state !== "connected" || !session?.is_group) return;
        const sync = () => {
            ws?.sendCall("call:group-heartbeat", {
                call_id: session.id,
            });
        };
        sync();
        const timer = window.setInterval(sync, 3000);
        return () => window.clearInterval(timer);
    }, [context.session, state, ws]);

    useEffect(() => {
        const onUnload = () => {
            const session = contextRef.current.session;
            if (session) {
                if (session.is_group) {
                    ws?.sendCall("call:group-leave", { call_id: session.id });
                } else {
                    send("call:end", { call_id: session.id });
                }
            }
            cleanup();
        };
        window.addEventListener("beforeunload", onUnload);
        return () => {
            window.removeEventListener("beforeunload", onUnload);
            callRingtone.stop();
            cleanup();
        };
    }, [cleanup, send, ws]);

    return {
        state,
        context,
        localStream,
        remoteStream,
        error,
        micOn,
        cameraOn,
        startCall,
        joinGroupCall,
        acceptCall,
        rejectCall,
        cancelOrEndCall,
        toggleMic,
        toggleCamera,
        switchCamera,
        dismissSyncedCall,
    };
}

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

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
        is_group: Boolean(obj.is_group ?? obj.isGroup ?? false),
        max_participants: Number(obj.max_participants ?? obj.maxParticipants ?? GROUP_CALL_MAX),
        participants: Array.isArray(obj.participants)
            ? (obj.participants as CallParticipant[])
            : undefined,
        started_at: stringOrUndefined(obj.started_at ?? obj.startedAt),
        ended_at: stringOrUndefined(obj.ended_at ?? obj.endedAt),
        duration_seconds: Number(obj.duration_seconds ?? obj.durationSeconds ?? 0),
        created_at: stringOrUndefined(obj.created_at ?? obj.createdAt),
        updated_at: stringOrUndefined(obj.updated_at ?? obj.updatedAt),
    };
}

function normalizeGroupParticipants(
    raw: unknown,
    currentUserId: number,
    convParticipants?: Conversation["participants"],
): Map<number, CallParticipant> {
    const obj = raw as Record<string, unknown>;
    const parts = Array.isArray(obj.participants)
        ? (obj.participants as Record<string, unknown>[])
        : [];

    // Build a lookup from conversation participants for avatar/name fallback
    const convLookup = new Map<number, { fullname: string; avatar?: string }>();
    if (convParticipants) {
        for (const p of convParticipants) {
            convLookup.set(Number(p.id), {
                fullname: p.nickname || p.fullname || p.email || "",
                avatar: p.avatar ?? undefined,
            });
        }
    }

    const map = new Map<number, CallParticipant>();
    for (const p of parts) {
        const uid = Number(p.user_id ?? 0);
        if (!uid) continue;
        const conv = convLookup.get(uid);
        const fullname = String(p.fullname ?? conv?.fullname ?? "");
        const avatar = String(p.avatar ?? conv?.avatar ?? "");
        const status = String(p.status ?? "invited") as CallParticipant["status"];
        map.set(uid, {
            user_id: uid,
            fullname,
            avatar: avatar || undefined,
            status,
            micOn: uid === currentUserId ? true : undefined,
            cameraOn: uid === currentUserId ? true : undefined,
        });
    }
    return map;
}

function mergeGroupParticipants(
    current: Map<number, CallParticipant>,
    incoming: Map<number, CallParticipant>,
) {
    const merged = new Map(incoming);
    for (const [userId, existing] of current) {
        const next = merged.get(userId);
        if (!next) continue;
        merged.set(userId, {
            ...next,
            stream: existing.stream,
            micOn: existing.micOn ?? next.micOn,
            cameraOn: existing.cameraOn ?? next.cameraOn,
        });
    }
    return merged;
}

function getPeer(conversation: Conversation | undefined, currentUserId: number) {
    if (!conversation || conversation.is_group) return undefined;
    return conversation.participants.find(
        (participant) => Number(participant.id) !== currentUserId,
    );
}

function getPeerByID(conversation: Conversation | undefined, userID: number) {
    return conversation?.participants.find((participant) => Number(participant.id) === userID);
}

function peerFromPayload(raw: unknown, userID: number): Participant {
    const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const fullname =
        stringOrUndefined(obj.caller_name ?? obj.callerName) ??
        stringOrUndefined(obj.receiver_name ?? obj.receiverName) ??
        stringOrUndefined(obj.sender_name ?? obj.senderName) ??
        "Người gọi";
    const avatar =
        stringOrUndefined(obj.caller_avatar ?? obj.callerAvatar) ??
        stringOrUndefined(obj.receiver_avatar ?? obj.receiverAvatar);
    return {
        id: userID,
        fullname,
        email: "",
        avatar,
    };
}

function stringOrUndefined(value: unknown) {
    return typeof value === "string" ? value : undefined;
}
