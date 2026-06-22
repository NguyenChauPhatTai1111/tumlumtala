import {
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	TextField,
} from "@mui/material";
import type {
	ConversationConfirmDialogState,
	ConversationInputDialogState,
} from "@pages/messenger/types/messenger";
import { useRef } from "react";
import type { Conversation } from "@/types/messenger";

export type MessengerDialogsProps = {
	confirmDialog?: ConversationConfirmDialogState | null;
	onCloseConfirmDialog: () => void;
	onSubmitConfirmDialog: (confirmed: boolean) => Promise<void>;
	isNotificationsEnabled: (conversation?: Conversation) => boolean;
	inputDialog?: ConversationInputDialogState | null;
	onCloseInputDialog: () => void;
	onSubmitInputDialog: () => Promise<void>;
	onInputDialogValueChange: (value: string) => void;
};

export function MessengerDialogs({
	confirmDialog,
	onCloseConfirmDialog,
	onSubmitConfirmDialog,
	isNotificationsEnabled,
	inputDialog,
	onCloseInputDialog,
	onSubmitInputDialog,
	onInputDialogValueChange,
}: MessengerDialogsProps) {
	const stableConfirmDialogRef = useRef<ConversationConfirmDialogState | null>(
		confirmDialog ?? null,
	);
	if (confirmDialog != null) {
		stableConfirmDialogRef.current = confirmDialog;
	}
	const stableConfirmDialog = stableConfirmDialogRef.current;

	return (
		<>
			<Dialog
				open={Boolean(confirmDialog)}
				onClose={onCloseConfirmDialog}
				fullWidth
				maxWidth="xs"
			>
				<DialogTitle>
					{stableConfirmDialog?.mode === "leave"
						? "Rời khỏi cuộc trò chuyện"
						: stableConfirmDialog?.mode === "removeMember"
							? "Xóa thành viên khỏi nhóm"
							: "Thông báo cuộc trò chuyện"}
				</DialogTitle>
				<DialogContent>
					<DialogContentText>
						{stableConfirmDialog?.mode === "leave" ? (
							<>
								{" "}
								Bạn có chắc chắn muốn{" "}
								<Box
									component="span"
									sx={{ fontWeight: 700, color: "error.main" }}
								>
									rời khỏi nhóm
								</Box>{" "}
								nhóm không?
							</>
						) : stableConfirmDialog?.mode === "removeMember" ? (
							<>
								{" "}
								Bạn có chắc chắn muốn xóa{" "}
								<Box
									component="span"
									sx={{ fontWeight: 700, color: "text.primary" }}
								>
									{stableConfirmDialog?.targetParticipant?.nickname ||
										stableConfirmDialog?.targetParticipant?.fullname ||
										"thành viên"}
								</Box>{" "}
								khỏi nhóm không?
							</>
						) : isNotificationsEnabled(stableConfirmDialog?.conversation) ? (
							<>
								{" "}
								Bạn có muốn{" "}
								<Box
									component="span"
									sx={{ fontWeight: 700, color: "error.main" }}
								>
									{" "}
									tắt thông báo{" "}
								</Box>
								cuộc trò chuyện này?
							</>
						) : (
							<>
								{" "}
								Bạn có muốn{" "}
								<Box
									component="span"
									sx={{ fontWeight: 700, color: "success.main" }}
								>
									{" "}
									bật thông báo{" "}
								</Box>{" "}
								cuộc trò chuyện này?{" "}
							</>
						)}
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					{stableConfirmDialog?.mode === "notifications" ? (
						<>
							<Button
								variant="outlined"
								onClick={() => onSubmitConfirmDialog(false)}
							>
								Hủy
							</Button>
							<Button
								variant="contained"
								onClick={() => onSubmitConfirmDialog(true)}
							>
								{isNotificationsEnabled(stableConfirmDialog?.conversation)
									? "Tắt thông báo"
									: "Bật thông báo"}
							</Button>
						</>
					) : (
						<>
							<Button
								variant="outlined"
								onClick={() => onSubmitConfirmDialog(false)}
							>
								Hủy
							</Button>
							<Button
								color={
									stableConfirmDialog?.mode === "removeMember"
										? "error"
										: undefined
								}
								variant="contained"
								onClick={() => onSubmitConfirmDialog(true)}
							>
								{stableConfirmDialog?.mode === "removeMember"
									? "Xóa"
									: "Rời khỏi"}
							</Button>
						</>
					)}
				</DialogActions>
			</Dialog>
			{inputDialog?.mode === "nickname" && (
				<Dialog open onClose={onCloseInputDialog} fullWidth maxWidth="xs">
					<DialogTitle>
						{`Đặt biệt danh cho ${inputDialog.participant?.fullname || "thành viên"}`}
					</DialogTitle>
					<DialogContent>
						<TextField
							autoFocus
							fullWidth
							label="Biệt danh"
							value={inputDialog.value}
							onChange={(e) => onInputDialogValueChange(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") onSubmitInputDialog();
							}}
							sx={{ mt: 1 }}
						/>
					</DialogContent>
					<DialogActions>
						<Button variant="outlined" onClick={onCloseInputDialog}>
							Hủy
						</Button>
						<Button variant="contained" onClick={onSubmitInputDialog}>
							Lưu
						</Button>
					</DialogActions>
				</Dialog>
			)}
		</>
	);
}
