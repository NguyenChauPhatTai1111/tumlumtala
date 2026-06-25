import { useSearchUsers } from "@hooks/user";
import CloseIcon from "@mui/icons-material/Close";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import SearchIcon from "@mui/icons-material/Search";
import {
	Avatar,
	Box,
	Button,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	Divider,
	IconButton,
	InputAdornment,
	List,
	ListItemAvatar,
	ListItemButton,
	ListItemText,
	TextField,
	Typography,
} from "@mui/material";
import type {
	ConversationConfirmDialogState,
	ConversationInputDialogState,
} from "@pages/messenger/types/messenger";
import { useRef, useState } from "react";
import { useSearchDebounce } from "@/hooks/table/useTableState";
import type { Conversation, User } from "@/types/messenger";
import { resolveCdnUrl } from "@/utils/urlUtils";

export type MessengerDialogsProps = {
	confirmDialog?: ConversationConfirmDialogState | null;
	onCloseConfirmDialog: () => void;
	onSubmitConfirmDialog: (confirmed: boolean) => Promise<void>;
	isNotificationsEnabled: (conversation?: Conversation) => boolean;
	inputDialog?: ConversationInputDialogState | null;
	onCloseInputDialog: () => void;
	onSubmitInputDialog: () => Promise<void>;
	onInputDialogValueChange: (value: string) => void;
	onAddMemberUser?: (user: User) => void;
	onRemoveSelectedUser?: (userId: string) => void;
};

function AddMembersDialog({
	inputDialog,
	onClose,
	onSubmit,
	onAddUser,
	onRemoveSelectedUser,
}: {
	inputDialog: ConversationInputDialogState & { mode: "addMembers" };
	onClose: () => void;
	onSubmit: () => Promise<void>;
	onAddUser?: (user: User) => void;
	onRemoveSelectedUser?: (userId: string) => void;
}) {
	const [searchQuery, setSearchQuery] = useState("");
	const searchInputRef = useRef<HTMLInputElement | null>(null);
	const debouncedQuery = useSearchDebounce(searchQuery, 500);

	const searchKeyword =
		debouncedQuery.trim().length >= 2 ? debouncedQuery.trim() : "";
	const { data, isLoading: searchLoading } = useSearchUsers(searchKeyword, 1, 20);

	const existingParticipantIds = new Set(
		inputDialog.conversation.participants.map((p) => p.id),
	);
	const selectedUserIds = new Set(
		(inputDialog.selectedUsers ?? []).map((u) => Number(u.id)),
	);

	const searchResults = (data?.items ?? []).filter((u) => {
		const uid = Number(u.id);
		return !existingParticipantIds.has(uid) && !selectedUserIds.has(uid);
	});

	const handleAddUser = (user: User) => {
		onAddUser?.(user);
		setSearchQuery("");
		requestAnimationFrame(() => {
			searchInputRef.current?.focus();
		});
	};

	const selectedUsers = inputDialog.selectedUsers ?? [];

	return (
		<Dialog open onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>
				<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
					<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
						<GroupAddIcon />
						<Typography variant="h6" fontWeight={700}>
							Thêm thành viên
						</Typography>
					</Box>
					<IconButton size="medium" onClick={onClose}>
						<CloseIcon />
					</IconButton>
				</Box>
			</DialogTitle>
			<Divider />
			<DialogContent sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
				{/* Chip list các user đã chọn */}
				{selectedUsers.length > 0 && (
					<Box>
						<Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: "block" }}>
							Đã chọn ({selectedUsers.length})
						</Typography>
						<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
							{selectedUsers.map((u) => (
								<Chip
									key={u.id}
									avatar={
										<Avatar src={resolveCdnUrl(u.avatar)}>
											{(u.first_name || u.username || "U").slice(0, 1).toUpperCase()}
										</Avatar>
									}
									label={u.first_name || u.username}
									size="small"
									onDelete={() => onRemoveSelectedUser?.(String(u.id))}
									color="primary"
									variant="outlined"
									deleteIcon={<CloseIcon />}
									onMouseDown={(e) => e.stopPropagation()}
								/>
							))}
						</Box>
					</Box>
				)}

				{/* Search input — luôn hiển thị khi mở dialog */}
				<Box>
					<TextField
						fullWidth
						autoFocus
						size="medium"
						inputRef={searchInputRef}
						placeholder="Tìm kiếm theo tên, email..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						InputProps={{
							startAdornment: (
								<InputAdornment position="start">
									<SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
								</InputAdornment>
							),
							endAdornment: searchQuery ? (
								<InputAdornment position="end">
									<IconButton size="small" onClick={() => setSearchQuery("")}>
										<CloseIcon fontSize="small" />
									</IconButton>
								</InputAdornment>
							) : undefined,
						}}
					/>

					{searchLoading && (
						<Box sx={{ display: "flex", justifyContent: "center", py: 1.5 }}>
							<CircularProgress size={20} />
						</Box>
					)}

					{!searchLoading && searchKeyword && searchResults.length === 0 && (
						<Typography
							variant="caption"
							color="text.secondary"
							sx={{ display: "block", textAlign: "center", py: 1.5 }}
						>
							Không tìm thấy người dùng
						</Typography>
					)}

					{searchResults.length > 0 && (
						<List dense sx={{ maxHeight: 240, overflowY: "auto", mt: 0.5 }}>
							{searchResults.map((user, index) => (
								<Box key={user.id}>
									<ListItemButton onClick={() => handleAddUser(user)} sx={{ borderRadius: 1 }}>
										<ListItemAvatar sx={{ minWidth: 44 }}>
											<Avatar src={resolveCdnUrl(user.avatar)} sx={{ width: 32, height: 32 }}>
												{(user.first_name || user.username || "U").slice(0, 1).toUpperCase()}
											</Avatar>
										</ListItemAvatar>
										<ListItemText
											primary={
												<Typography variant="body2" fontWeight={500}>
													{user.first_name || user.username}
												</Typography>
											}
											secondary={
												<Typography variant="caption" color="text.secondary">
													{user.email}
												</Typography>
											}
										/>
									</ListItemButton>
									{index < searchResults.length - 1 && <Divider />}
								</Box>
							))}
						</List>
					)}
				</Box>
			</DialogContent>
			<DialogActions sx={{ px: 2, pb: 2 }}>
				<Button variant="outlined" onClick={onClose}>
					Hủy
				</Button>
				<Button
					variant="contained"
					onClick={onSubmit}
					disabled={selectedUsers.length === 0}
					startIcon={<GroupAddIcon />}
				>
					Thêm thành viên
				</Button>
			</DialogActions>
		</Dialog>
	);
}

export function MessengerDialogs({
	confirmDialog,
	onCloseConfirmDialog,
	onSubmitConfirmDialog,
	isNotificationsEnabled,
	inputDialog,
	onCloseInputDialog,
	onSubmitInputDialog,
	onInputDialogValueChange,
	onAddMemberUser,
	onRemoveSelectedUser,
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

			{inputDialog?.mode === "addMembers" && (
				<AddMembersDialog
					inputDialog={inputDialog as ConversationInputDialogState & { mode: "addMembers" }}
					onClose={onCloseInputDialog}
					onSubmit={onSubmitInputDialog}
					onAddUser={onAddMemberUser}
					onRemoveSelectedUser={onRemoveSelectedUser}
				/>
			)}

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
