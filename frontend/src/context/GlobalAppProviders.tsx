import { MiniMessenger } from "@components/messenger/MiniMessenger";
import { NotificationPermissionBanner } from "@components/messenger/NotificationPermissionBanner";
import {
	ConfirmContext,
	type ConfirmFn,
	type ConfirmOptions,
} from "@context/confirm.context";
import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
} from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SnackbarProvider, useSnackbar } from "notistack";
import { type ReactNode, useCallback, useRef, useState } from "react";
import { MessageToastProvider } from "@/context/MessageToastContext";
import { MessengerEmojiProvider } from "@/context/MessengerEmojiContext";
import { setNotifyFn } from "@/utils/snackbar";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: { retry: 1, staleTime: 30_000 },
	},
});

type PendingConfirm = {
	options: ConfirmOptions;
	resolve: (value: boolean) => void;
};

function SnackbarBridge() {
	const { enqueueSnackbar } = useSnackbar();

	setNotifyFn(({ message, type }) => {
		enqueueSnackbar(message, {
			variant: type === "error" ? "error" : "success",
			anchorOrigin: { vertical: "top", horizontal: "right" },
		});
	});

	return null;
}

function ConfirmProvider({ children }: { children: ReactNode }) {
	const [pending, setPending] = useState<PendingConfirm | null>(null);
	const resolveRef = useRef<((value: boolean) => void) | null>(null);

	const confirm = useCallback<ConfirmFn>((options) => {
		return new Promise<boolean>((resolve) => {
			resolveRef.current = resolve;
			setPending({ options, resolve });
		});
	}, []);

	const handleClose = (result: boolean) => {
		resolveRef.current?.(result);
		resolveRef.current = null;
		setPending(null);
	};

	return (
		<ConfirmContext.Provider value={confirm}>
			{children}
			<Dialog
				open={Boolean(pending)}
				onClose={() => handleClose(false)}
				maxWidth="xs"
				fullWidth
			>
				{pending && (
					<>
						<DialogTitle>{pending.options.title ?? "Xác nhận"}</DialogTitle>
						{pending.options.description && (
							<DialogContent>
								<DialogContentText>
									{pending.options.description}
								</DialogContentText>
							</DialogContent>
						)}
						<DialogActions>
							<Button onClick={() => handleClose(false)} color="inherit">
								{pending.options.cancelText ?? "Hủy"}
							</Button>
							<Button
								onClick={() => handleClose(true)}
								color={
									pending.options.variant === "danger" ? "error" : "primary"
								}
								variant="contained"
								autoFocus
							>
								{pending.options.confirmText ?? "Xác nhận"}
							</Button>
						</DialogActions>
					</>
				)}
			</Dialog>
		</ConfirmContext.Provider>
	);
}

export function GlobalAppProviders({ children }: { children: ReactNode }) {
	return (
		<QueryClientProvider client={queryClient}>
			<SnackbarProvider
				maxSnack={3}
				autoHideDuration={3000}
				anchorOrigin={{ vertical: "top", horizontal: "right" }}
			>
				<SnackbarBridge />
				<MessageToastProvider>
					<ConfirmProvider>
						<MessengerEmojiProvider>
							<NotificationPermissionBanner />
							{children}
							<MiniMessenger />
						</MessengerEmojiProvider>
					</ConfirmProvider>
				</MessageToastProvider>
			</SnackbarProvider>
		</QueryClientProvider>
	);
}
