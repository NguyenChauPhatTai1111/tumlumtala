import {
	type ReactNode,
	createContext,
	useCallback,
	useContext,
	useState,
} from "react";
import {
	MessageToastContainer,
	type MessageToastItem,
} from "@components/messenger/MessageToast";

type ShowToastFn = (options: Omit<MessageToastItem, "id">) => void;

const MessageToastContext = createContext<ShowToastFn>(() => {});

export function useShowMessageToast() {
	return useContext(MessageToastContext);
}

export function MessageToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<MessageToastItem[]>([]);

	const showToast = useCallback<ShowToastFn>((options) => {
		const id = `${Date.now()}-${Math.random()}`;
		setToasts((prev) => {
			const next = [...prev, { id, ...options }];
			return next.length > 3 ? next.slice(next.length - 3) : next;
		});
	}, []);

	const handleClose = useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	return (
		<MessageToastContext.Provider value={showToast}>
			{children}
			<MessageToastContainer items={toasts} onClose={handleClose} />
		</MessageToastContext.Provider>
	);
}
