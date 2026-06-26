import { ConversationItem } from "@components/messenger/conversation/components/ConversationItem";
import ArchiveIcon from "@mui/icons-material/Archive";
import DeleteIcon from "@mui/icons-material/Delete";
import LogoutIcon from "@mui/icons-material/Logout";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import UnarchiveIcon from "@mui/icons-material/Unarchive";
import {
	Box,
	CircularProgress,
	Divider,
	List,
	ListItemIcon,
	Menu,
	MenuItem,
	Portal,
	Typography,
	useMediaQuery,
	useTheme,
} from "@mui/material";
import { useState } from "react";
import { useNow } from "@/hooks/common/useNow";
import type { Conversation } from "@/types/messenger";

interface MessengerConversationListProps {
	conversations: Conversation[];
	selectedId?: number | null;
	currentUserId: number;
	onlineUserIds?: Set<number>;
	typingByConversation?: Map<number, number[]>;
	loading?: boolean;
	loadingMore?: boolean;
	hasMore?: boolean;
	compact?: boolean;
	onSelect: (conversationId: number) => void;
	onArchiveToggle?: (conversation: Conversation) => void;
	onDelete?: (conversationId: number) => void;
	onToggleNotifications?: (conversation: Conversation) => void;
	onLeaveConversation?: (conversation: Conversation) => void;
	onLoadMore?: () => void;
}

interface MenuState {
	conversation: Conversation;
	pos: { top: number; left: number };
}

export const MessengerConversationList = ({
	conversations,
	selectedId,
	currentUserId,
	onlineUserIds,
	typingByConversation,
	loading,
	loadingMore,
	hasMore,
	compact = false,
	onSelect,
	onArchiveToggle,
	onDelete,
	onToggleNotifications,
	onLeaveConversation,
	onLoadMore,
}: MessengerConversationListProps) => {
	const now = useNow();
	const muiTheme = useTheme();
	const isTouchDevice = useMediaQuery(muiTheme.breakpoints.down("md"));
	const [menuState, setMenuState] = useState<MenuState | null>(null);

	const menuOpen = Boolean(menuState);

	const handleMenuOpen = (
		pos: { top: number; left: number },
		conversation: Conversation,
	) => {
		setMenuState({ pos, conversation });
	};

	const handleMenuClose = () => setMenuState(null);

	const hasMenuActions =
		onToggleNotifications || onArchiveToggle || onLeaveConversation || onDelete;

	if (loading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
				<CircularProgress size={24} />
			</Box>
		);
	}

	if (conversations.length === 0) {
		return (
			<Box sx={{ p: 2 }}>
				<Typography color="text.secondary" align="center" variant="caption">
					Chưa có cuộc trò chuyện
				</Typography>
			</Box>
		);
	}

	return (
		<>
			{isTouchDevice && menuState && (
				<Portal>
					<Box
						sx={{
							position: "fixed",
							inset: 0,
							bgcolor: "rgba(0,0,0,0.35)",
							zIndex: (theme) => theme.zIndex.modal - 2,
							pointerEvents: "none",
						}}
					/>
				</Portal>
			)}
			<List sx={{ width: "100%", p: 0 }}>
				{conversations.map((conversation, index) => {
					const typingUserIds =
						typingByConversation
							?.get(conversation.id)
							?.filter((userId) => userId !== currentUserId) ?? [];
					const firstTypingUserId = typingUserIds[0];
					const firstTypingParticipant = conversation.participants?.find(
						(participant) => participant.id === firstTypingUserId,
					);
					const firstTypingName =
						firstTypingParticipant?.nickname ||
						firstTypingParticipant?.fullname ||
						"Người dùng";
					const typingLabel =
						typingUserIds.length > 1
							? `${firstTypingName} +${typingUserIds.length - 1}`
							: typingUserIds.length === 1
								? firstTypingName
								: "";
					const typingPreview = typingLabel
						? {
								label: typingLabel,
								avatar: firstTypingParticipant?.avatar,
								showAvatar: conversation.is_group,
							}
						: undefined;

					const isOnline =
						!conversation.is_group &&
						onlineUserIds != null &&
						(conversation.participants ?? []).some(
							(p) => p.id !== currentUserId && onlineUserIds.has(p.id),
						);

					const isDimmed =
						isTouchDevice &&
						menuState !== null &&
						menuState.conversation.id !== conversation.id;

					return (
						<Box
							key={conversation.id}
							sx={
								isDimmed
									? {
											opacity: 0.35,
											filter: "blur(0.8px)",
											transition: "opacity 0.2s ease, filter 0.2s ease",
											pointerEvents: "none",
										}
									: {
											transition: "opacity 0.2s ease, filter 0.2s ease",
										}
							}
						>
							<ConversationItem
								conversation={conversation}
								currentUserId={currentUserId}
								selected={selectedId === conversation.id}
								isOnline={isOnline}
								compact={compact}
								now={now}
								typingPreview={typingPreview}
								onSelect={onSelect}
								onMenuOpen={hasMenuActions ? handleMenuOpen : undefined}
								onToggleNotifications={onToggleNotifications}
							/>
							{index < conversations.length - 1 && <Divider />}
						</Box>
					);
				})}
			</List>

			{loadingMore && (
				<Box sx={{ display: "flex", justifyContent: "center", py: 1.5 }}>
					<CircularProgress size={20} />
				</Box>
			)}

			<Menu
				open={menuOpen}
				onClose={handleMenuClose}
				anchorReference="anchorPosition"
				anchorPosition={menuState?.pos}
				transformOrigin={{ horizontal: "left", vertical: "top" }}
			>
				{onToggleNotifications && menuState ? (
					<MenuItem
						onClick={() => {
							handleMenuClose();
							onToggleNotifications(menuState.conversation);
						}}
					>
						<ListItemIcon>
							{menuState.conversation.notifications_enabled ? (
								<NotificationsOffIcon fontSize="small" />
							) : (
								<NotificationsActiveIcon fontSize="small" />
							)}
						</ListItemIcon>
						{menuState.conversation.notifications_enabled
							? "Tắt thông báo"
							: "Bật thông báo"}
					</MenuItem>
				) : null}
				{onArchiveToggle && menuState ? (
					<MenuItem
						onClick={() => {
							handleMenuClose();
							onArchiveToggle(menuState.conversation);
						}}
					>
						<ListItemIcon>
							{menuState.conversation.is_archived ? (
								<UnarchiveIcon fontSize="small" />
							) : (
								<ArchiveIcon fontSize="small" />
							)}
						</ListItemIcon>
						{menuState.conversation.is_archived ? "Khôi phục" : "Lưu trữ"}
					</MenuItem>
				) : null}
				{onLeaveConversation && menuState?.conversation.is_group ? (
					<MenuItem
						onClick={() => {
							handleMenuClose();
							onLeaveConversation(menuState.conversation);
						}}
					>
						<ListItemIcon>
							<LogoutIcon fontSize="small" />
						</ListItemIcon>
						Rời khỏi cuộc trò chuyện
					</MenuItem>
				) : null}
				{onDelete && menuState ? (
					<MenuItem
						onClick={() => {
							handleMenuClose();
							onDelete(menuState.conversation.id);
						}}
					>
						<ListItemIcon>
							<DeleteIcon fontSize="small" />
						</ListItemIcon>
						Xóa
					</MenuItem>
				) : null}
			</Menu>
		</>
	);
};
