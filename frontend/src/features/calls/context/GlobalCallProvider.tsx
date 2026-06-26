import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
} from "react";
import { useSnackbar } from "notistack";
import { useCurrentUser } from "@/hooks/user/useCurrentUser";
import { useSharedMessengerWS } from "@/context/MessengerWebSocketContext";
import type { Conversation } from "@/types/messenger";
import { CallLayer } from "../components/CallLayer";
import { useCall } from "../hooks/useCall";
import type { CallState, CallType } from "../types/call.types";

const ACTIVE_CALL_STATES: CallState[] = [
	"permission_checking",
	"calling",
	"ringing",
	"connecting",
	"connected",
	"reconnecting",
];

const DEFAULT_ICON = "/assets/logo/logo.png";

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
		.catch(() => {});
}

type GlobalCallContextValue = {
	callState: CallState;
	startConversationCall: (conversation: Conversation, callType: CallType) => void;
};

const GlobalCallContext = createContext<GlobalCallContextValue | null>(null);

export function GlobalCallProvider({ children }: { children: ReactNode }) {
	const { user: currentUser } = useCurrentUser();
	const { enqueueSnackbar } = useSnackbar();
	const ws = useSharedMessengerWS();
	const call = useCall({ currentUser: currentUser ?? undefined, ws });
	const previousStateRef = useRef(call.state);

	const startConversationCall = useCallback(
		(conversation: Conversation, callType: CallType) => {
			if (ACTIVE_CALL_STATES.includes(previousStateRef.current)) {
				enqueueSnackbar("Bạn đang trong một cuộc gọi khác", { variant: "warning" });
				return;
			}
			void call.startCall(callType, conversation);
		},
		[call.startCall, enqueueSnackbar],
	);

	const value = useMemo(
		() => ({ callState: call.state, startConversationCall }),
		[call.state, startConversationCall],
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
			<CallLayer
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

export function useGlobalCall() {
	const context = useContext(GlobalCallContext);
	if (!context) {
		throw new Error("useGlobalCall must be used inside GlobalCallProvider");
	}
	return context;
}
