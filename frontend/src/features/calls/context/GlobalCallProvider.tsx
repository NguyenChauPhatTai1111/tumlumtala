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
import { useMessengerWebSocketConnection } from "@/hooks/messenger";
import type { Conversation } from "@/types/messenger";
import { CallLayer } from "../components/CallLayer";
import { useCall } from "../hooks/useCall";
import type { CallType } from "../types/call.types";

type GlobalCallContextValue = {
	startConversationCall: (conversation: Conversation, callType: CallType) => void;
};

const GlobalCallContext = createContext<GlobalCallContextValue | null>(null);

export function GlobalCallProvider({ children }: { children: ReactNode }) {
	const { user: currentUser } = useCurrentUser();
	const { enqueueSnackbar } = useSnackbar();
	const ws = useMessengerWebSocketConnection();
	const call = useCall({ currentUser: currentUser ?? undefined, ws });
	const previousStateRef = useRef(call.state);

	const startConversationCall = useCallback(
		(conversation: Conversation, callType: CallType) => {
			void call.startCall(callType, conversation);
		},
		[call.startCall],
	);

	const value = useMemo(
		() => ({ startConversationCall }),
		[startConversationCall],
	);

	useEffect(() => {
		if (call.state === "missed" && previousStateRef.current !== "missed") {
			enqueueSnackbar("Cuộc gọi nhỡ", { variant: "info" });
		}
		previousStateRef.current = call.state;
	}, [call.state, enqueueSnackbar]);

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
