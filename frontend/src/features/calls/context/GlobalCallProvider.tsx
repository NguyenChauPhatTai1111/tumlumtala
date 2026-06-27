import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Avatar, Box, Paper, Typography } from "@mui/material";
import { useSnackbar } from "notistack";
import { useCurrentUser } from "@/hooks/user/useCurrentUser";
import { useSharedMessengerWS } from "@/context/MessengerWebSocketContext";
import type { Conversation } from "@/types/messenger";
import { resolveCdnUrl } from "@/utils";
import { CallLayer } from "../components/CallLayer";
import { useCall } from "../hooks/useCall";
import type { CallState, CallType } from "../types/call.types";
import { GlobalCallContext } from "./GlobalCallContext";

const ACTIVE_CALL_STATES: CallState[] = [
	"permission_checking",
	"calling",
	"ringing",
	"connecting",
	"connected",
	"reconnecting",
];

const DEFAULT_ICON = "/icons/pwa-192x192.png";
const CALL_SYNC_CHANNEL = "tumlumtala-call-sync-v1";
const CALL_SYNC_STORAGE_KEY = "tumlumtala:active-call";
const CALL_SYNC_TAB_ID =
	typeof crypto !== "undefined" && crypto.randomUUID
		? crypto.randomUUID()
		: `${Date.now()}-${Math.random()}`;

type CallSyncSnapshot = {
	type: "active" | "idle" | "probe";
	source: string;
	callId?: string;
	state?: CallState;
	callType?: CallType;
	peerName?: string;
	peerAvatar?: string;
	updatedAt: number;
};

const TERMINAL_CALL_STATES: CallState[] = [
	"ended",
	"cancelled",
	"rejected",
	"missed",
	"failed",
	"busy",
];

function buildIncomingCallUrl(conversationId?: number, callId?: string) {
	const params = new URLSearchParams();
	if (conversationId) params.set("conversationId", String(conversationId));
	if (callId) params.set("callId", callId);
	const query = params.toString();
	return `${window.location.origin}/messenger${query ? `?${query}` : ""}`;
}

async function registerServiceWorker() {
	if (!("serviceWorker" in navigator)) return null;
	try {
		return await navigator.serviceWorker.register("/sw.js");
	} catch {
		return null;
	}
}

function focusCurrentTab(url: string) {
	try {
		window.focus();
		if (!window.location.pathname.startsWith("/messenger")) {
			window.location.href = url;
		}
	} catch {
		// Browser may block programmatic focus without a user gesture.
	}
}

async function showCallNotification(
	callerName: string,
	callType: CallType,
	conversationId?: number,
	callId?: string,
) {
	if (!("Notification" in window)) return;
	if (Notification.permission === "default") {
		await Notification.requestPermission();
	}
	if (Notification.permission !== "granted") return;

	const title = callType === "video" ? "Cuộc gọi video đến" : "Cuộc gọi thoại đến";
	const body = `${callerName} đang gọi cho bạn`;
	const url = buildIncomingCallUrl(conversationId, callId);

	try {
		await registerServiceWorker();
		const reg = await Promise.race([
			navigator.serviceWorker?.ready,
			new Promise<never>((_, reject) => setTimeout(() => reject(new Error("sw timeout")), 2000)),
		]);
		await reg.showNotification(title, {
			body,
			icon: DEFAULT_ICON,
			badge: DEFAULT_ICON,
			tag: "incoming-call",
			requireInteraction: true,
			data: { url, conversationId, callId, type: "incoming-call" },
		});
	} catch {
		const note = new Notification(title, {
			body,
			icon: DEFAULT_ICON,
			tag: "incoming-call",
			data: { url, conversationId, callId, type: "incoming-call" },
			requireInteraction: true,
		});
		note.onclick = () => {
			note.close();
			focusCurrentTab(url);
		};
	}
}

function dismissCallNotification() {
	navigator.serviceWorker?.ready
		.then((reg) => reg.getNotifications({ tag: "incoming-call" }))
		.then((notes) => notes.forEach((n) => n.close()))
		.catch(() => { });
}

export function GlobalCallProvider({ children }: { children: ReactNode }) {
	const { user: currentUser } = useCurrentUser();
	const { enqueueSnackbar } = useSnackbar();
	const ws = useSharedMessengerWS();
	const call = useCall({ currentUser: currentUser ?? undefined, ws });
	const startCall = call.startCall;
	const previousStateRef = useRef(call.state);
	const channelRef = useRef<BroadcastChannel | null>(null);
	const localStateRef = useRef(call.state);
	const localCallIDRef = useRef(call.context.session?.id);
	const localOwnerRef = useRef(false);
	const lastOwnedSnapshotRef = useRef<CallSyncSnapshot | null>(null);
	const dismissSyncedCallRef = useRef(call.dismissSyncedCall);
	const [syncedCall, setSyncedCall] = useState<CallSyncSnapshot | null>(null);

	const ownsLocalCall =
		ACTIVE_CALL_STATES.includes(call.state) &&
		(call.context.isCaller || Boolean(call.localStream));

	useEffect(() => {
		localStateRef.current = call.state;
		localCallIDRef.current = call.context.session?.id;
		localOwnerRef.current = ownsLocalCall;
		dismissSyncedCallRef.current = call.dismissSyncedCall;
	}, [
		call.context.session?.id,
		call.dismissSyncedCall,
		call.state,
		ownsLocalCall,
	]);

	useEffect(() => {
		const handleSnapshot = (snapshot: CallSyncSnapshot) => {
			if (!snapshot || snapshot.source === CALL_SYNC_TAB_ID) return;

			if (snapshot.type === "probe") {
				if (localOwnerRef.current && lastOwnedSnapshotRef.current) {
					channelRef.current?.postMessage({
						...lastOwnedSnapshotRef.current,
						updatedAt: Date.now(),
					});
				}
				return;
			}

			if (snapshot.type === "active") {
				if (localOwnerRef.current) return;
				setSyncedCall(snapshot);
				if (ACTIVE_CALL_STATES.includes(localStateRef.current)) {
					dismissSyncedCallRef.current();
				}
				return;
			}

			setSyncedCall((current) => {
				if (!current) return null;
				if (
					current.source === snapshot.source ||
					(snapshot.callId && current.callId === snapshot.callId)
				) {
					return null;
				}
				return current;
			});
			if (
				!localOwnerRef.current &&
				ACTIVE_CALL_STATES.includes(localStateRef.current) &&
				(!snapshot.callId || snapshot.callId === localCallIDRef.current)
			) {
				dismissSyncedCallRef.current();
			}
		};

		if ("BroadcastChannel" in window) {
			const channel = new BroadcastChannel(CALL_SYNC_CHANNEL);
			channelRef.current = channel;
			channel.onmessage = (event: MessageEvent<CallSyncSnapshot>) => {
				handleSnapshot(event.data);
			};
		}

		const onStorage = (event: StorageEvent) => {
			if (event.key !== CALL_SYNC_STORAGE_KEY) return;
			if (!event.newValue) {
				setSyncedCall(null);
				return;
			}
			try {
				handleSnapshot(JSON.parse(event.newValue) as CallSyncSnapshot);
			} catch {
				// Ignore malformed data from an older app version.
			}
		};
		window.addEventListener("storage", onStorage);

		try {
			const stored = localStorage.getItem(CALL_SYNC_STORAGE_KEY);
			if (stored) {
				const snapshot = JSON.parse(stored) as CallSyncSnapshot;
				if (Date.now() - snapshot.updatedAt <= 15_000) {
					handleSnapshot(snapshot);
				} else {
					localStorage.removeItem(CALL_SYNC_STORAGE_KEY);
				}
			}
		} catch {
			// Storage may be unavailable in private browsing.
		}
		channelRef.current?.postMessage({
			type: "probe",
			source: CALL_SYNC_TAB_ID,
			updatedAt: Date.now(),
		} satisfies CallSyncSnapshot);

		return () => {
			window.removeEventListener("storage", onStorage);
			channelRef.current?.close();
			channelRef.current = null;
		};
	}, []);

	useEffect(() => {
		const postSnapshot = (snapshot: CallSyncSnapshot) => {
			channelRef.current?.postMessage(snapshot);
			try {
				if (snapshot.type === "active") {
					localStorage.setItem(CALL_SYNC_STORAGE_KEY, JSON.stringify(snapshot));
				} else {
					localStorage.removeItem(CALL_SYNC_STORAGE_KEY);
				}
			} catch {
				// BroadcastChannel still handles open tabs when storage is unavailable.
			}
		};

		if (ownsLocalCall) {
			const peer = call.context.peer;
			const createSnapshot = (): CallSyncSnapshot => ({
				type: "active",
				source: CALL_SYNC_TAB_ID,
				callId: call.context.session?.id,
				state: call.state,
				callType: call.context.session?.call_type ?? call.context.callType,
				peerName: peer?.nickname || peer?.fullname || peer?.email || "Cuộc gọi",
				peerAvatar: peer?.avatar,
				updatedAt: Date.now(),
			});
			const initialSnapshot = createSnapshot();
			lastOwnedSnapshotRef.current = initialSnapshot;
			postSnapshot(initialSnapshot);
			const heartbeat = window.setInterval(
				() => {
					const snapshot = createSnapshot();
					lastOwnedSnapshotRef.current = snapshot;
					postSnapshot(snapshot);
				},
				3000,
			);
			const onUnload = () => {
				postSnapshot({
					type: "idle",
					source: CALL_SYNC_TAB_ID,
					callId: call.context.session?.id,
					updatedAt: Date.now(),
				});
			};
			window.addEventListener("beforeunload", onUnload);
			return () => {
				window.clearInterval(heartbeat);
				window.removeEventListener("beforeunload", onUnload);
			};
		}

		if (TERMINAL_CALL_STATES.includes(call.state)) {
			lastOwnedSnapshotRef.current = null;
			postSnapshot({
				type: "idle",
				source: CALL_SYNC_TAB_ID,
				callId: call.context.session?.id,
				updatedAt: Date.now(),
			});
		}
	}, [
		call.context.callType,
		call.context.peer,
		call.context.session?.call_type,
		call.context.session?.id,
		call.state,
		ownsLocalCall,
	]);

	const startConversationCall = useCallback(
		(conversation: Conversation, callType: CallType) => {
			if (
				ACTIVE_CALL_STATES.includes(previousStateRef.current) ||
				syncedCall?.type === "active"
			) {
				enqueueSnackbar("Bạn đang trong một cuộc gọi khác", { variant: "warning" });
				return;
			}
			void startCall(callType, conversation);
		},
		[enqueueSnackbar, startCall, syncedCall],
	);

	const effectiveCallState =
		call.state === "idle" && syncedCall?.state ? syncedCall.state : call.state;
	const value = useMemo(
		() => ({ callState: effectiveCallState, startConversationCall }),
		[effectiveCallState, startConversationCall],
	);

	// Incoming call notification when tab is not focused
	useEffect(() => {
		if (call.state === "ringing" && previousStateRef.current !== "ringing") {
			const peer = call.context.peer;
			const callerName = peer?.fullname ?? peer?.email ?? "Ai đó";
			const callType = call.context.session?.call_type ?? "video";
			const conversationId = call.context.session?.conversation_id ?? call.context.conversation?.id;
			const callId = call.context.session?.id;
			if (!document.hasFocus()) {
				void showCallNotification(callerName, callType, conversationId, callId);
			}
		}
		// Dismiss incoming-call notification once call is no longer ringing
		if (previousStateRef.current === "ringing" && call.state !== "ringing") {
			dismissCallNotification();
		}
		if (call.state === "missed" && previousStateRef.current !== "missed") {
			enqueueSnackbar("Cuộc gọi nhỡ", { variant: "info" });
		}
		previousStateRef.current = call.state;
	}, [call.state, call.context, enqueueSnackbar]);

	return (
		<GlobalCallContext.Provider value={value}>
			{children}
			{syncedCall?.type === "active" && call.state === "idle" ? (
				<Paper
					elevation={12}
					sx={{
						position: "fixed",
						top: { xs: 8, sm: 12 },
						left: "50%",
						transform: "translateX(-50%)",
						zIndex: 2100,
						width: { xs: "calc(100% - 16px)", sm: 420 },
						px: 1.25,
						py: 0.9,
						display: "flex",
						alignItems: "center",
						gap: 1.25,
						borderRadius: 2.5,
						bgcolor: "rgba(17,24,39,0.96)",
						...(syncedCall.peerAvatar
							? {
									backgroundImage: `linear-gradient(rgba(3,7,18,0.58), rgba(3,7,18,0.74)), url("${resolveCdnUrl(syncedCall.peerAvatar)}")`,
									backgroundSize: "cover",
									backgroundPosition: "center",
								}
							: {}),
						color: "#fff",
						border: "1px solid rgba(255,255,255,0.14)",
						backdropFilter: "blur(14px)",
					}}
				>
					<Avatar
						src={resolveCdnUrl(syncedCall.peerAvatar)}
						sx={{ width: 42, height: 42 }}
					/>
					<Box sx={{ minWidth: 0 }}>
						<Typography fontWeight={800} noWrap>
							{syncedCall.peerName}
						</Typography>
						<Typography variant="caption" sx={{ opacity: 0.72 }}>
							Cuộc gọi đang diễn ra...
						</Typography>
					</Box>
				</Paper>
			) : null}
			<CallLayer
				key={call.context.session?.id ?? call.state}
				state={call.state}
				context={call.context}
				localStream={call.localStream}
				remoteStream={call.remoteStream}
				error={call.error}
				micOn={call.micOn}
				cameraOn={call.cameraOn}
				onAccept={call.acceptCall}
				onReject={call.rejectCall}
				onEnd={call.cancelOrEndCall}
				onToggleMic={call.toggleMic}
				onToggleCamera={call.toggleCamera}
				onSwitchCamera={call.switchCamera}
			/>
		</GlobalCallContext.Provider>
	);
}
