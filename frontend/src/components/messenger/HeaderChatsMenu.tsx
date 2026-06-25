import ChatIcon from "@mui/icons-material/Chat";
import ArchiveIcon from "@mui/icons-material/Archive";
import DeleteIcon from "@mui/icons-material/Delete";
import LogoutIcon from "@mui/icons-material/Logout";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SearchIcon from "@mui/icons-material/Search";
import {
	Avatar,
	Badge,
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	IconButton,
	InputAdornment,
	ListItemIcon,
	Menu,
	MenuItem,
	Popover,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import {
	useMessengerConversationActions,
	useMessengerConversations,
} from "@hooks/messenger";
import { useCurrentUser } from "@hooks/common/useCurrentUser";
import { useNotification } from "@hooks/common/useNotification";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { Conversation } from "@/types/messenger";
import { formatTimestampRealtime } from "@/utils";
import { resolveCdnUrl } from "@/utils/urlUtils";
import { buildGeneratedAvatar } from "./utils/avatar";
import { hydrateConversationParticipantAvatars } from "./utils/avatarHydration";
import {
	getConversationAvatar as getBaseConversationAvatar,
	getConversationDisplayName,
} from "./utils/conversation";
import { openMiniMessengerConversation } from "./miniMessengerEvents";
import { listUsers } from "@/api/userApi";

const HEADER_CONVERSATION_LIMIT = 10;
type HeaderChatTab = "all" | "unread" | "groups" | "archived";
const HEADER_CHAT_TABS: Array<{ value: HeaderChatTab; label: string }> = [
	{ value: "all", label: "All" },
	{ value: "unread", label: "Unread" },
	{ value: "groups", label: "Groups" },
	{ value: "archived", label: "Archived" },
];

type ConfirmAction = {
	type: "delete" | "leave";
	conversation: Conversation;
} | null;

function getConversationTitle(
	conversation: Conversation,
	currentUserId?: number | string,
) {
	return getConversationDisplayName(conversation, Number(currentUserId ?? 0));
}

function getConversationAvatar(
	conversation: Conversation,
	currentUserId?: number | string,
) {
	const title = getConversationTitle(conversation, currentUserId);
	return (
		resolveCdnUrl(
			getBaseConversationAvatar(conversation, Number(currentUserId ?? 0)),
		) || buildGeneratedAvatar(title)
	);
}

function getLastSenderName(
	conversation: Conversation,
	currentUserId?: number | string,
) {
	if (!conversation.last_message_sender_id) return "";
	if (Number(conversation.last_message_sender_id) === Number(currentUserId)) {
		return "Bạn";
	}

	const participant = conversation.participants.find(
		(item) => Number(item.id) === Number(conversation.last_message_sender_id),
	);

	return participant?.nickname || participant?.fullname || "";
}

function getLastMessagePreviewContent(conversation: Conversation) {
	const content = conversation.last_message_content?.trim();
	const messageType = String(conversation.last_message_type ?? "").toLowerCase();
	const looksLikeAttachmentPath = Boolean(
		content?.includes("/messenger/attachments/") ||
			content?.includes("messenger/attachments/"),
	);

	if (messageType === "image") return "Hình ảnh";
	if (messageType === "video") return "Video";
	if (messageType === "file" || looksLikeAttachmentPath) return "Tệp đính kèm";
	if (messageType === "sticker") return "Sticker";
	if (!content) return "Chưa có tin nhắn";

	return content;
}

function getPreview(conversation: Conversation, currentUserId?: number | string) {
	const content = getLastMessagePreviewContent(conversation);
	if (!conversation.is_group) return content;
	if (content === "Chưa có tin nhắn") return content;

	const senderName = getLastSenderName(conversation, currentUserId);
	return senderName ? `${senderName}: ${content}` : content;
}

export function HeaderChatsMenu() {
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
	const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
	const [menuConversation, setMenuConversation] = useState<Conversation | null>(
		null,
	);
	const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
	const [search, setSearch] = useState("");
	const [activeTab, setActiveTab] = useState<HeaderChatTab>("all");
	const [now, setNow] = useState(() => Date.now());
	const navigate = useNavigate();
	const { data: currentUser } = useCurrentUser();
	const { open: notify } = useNotification();
	const conversationActions = useMessengerConversationActions();
	const currentUserId = currentUser?.id;
	const conversationsQuery = useMessengerConversations(
		HEADER_CONVERSATION_LIMIT,
		0,
	);
	const conversations = useMemo(
		() => conversationsQuery.data?.items ?? [],
		[conversationsQuery.data?.items],
	);
	const usersForAvatarQuery = useQuery({
		queryKey: ["users", "messenger-avatar-hydration"],
		queryFn: () => listUsers(200, 0),
		staleTime: 60_000,
		enabled: Boolean(currentUserId),
	});
	const usersForAvatar = useMemo(
		() => usersForAvatarQuery.data?.users ?? [],
		[usersForAvatarQuery.data?.users],
	);
	const hydratedConversations = useMemo(
		() =>
			conversations.map((conversation) =>
				hydrateConversationParticipantAvatars(conversation, usersForAvatar),
			),
		[conversations, usersForAvatar],
	);

	useEffect(() => {
		const timer = window.setInterval(() => setNow(Date.now()), 60_000);
		return () => window.clearInterval(timer);
	}, []);
	const unreadCount = hydratedConversations.reduce(
		(total, conversation) => total + Number(conversation.unread_count || 0),
		0,
	);
	const tabCounts = useMemo(
		() => ({
			all: hydratedConversations.filter((conversation) => !conversation.is_archived)
				.length,
			unread: hydratedConversations.filter(
				(conversation) =>
					!conversation.is_archived &&
					Number(conversation.unread_count || 0) > 0,
			).length,
			groups: hydratedConversations.filter(
				(conversation) => !conversation.is_archived && conversation.is_group,
			).length,
			archived: hydratedConversations.filter((conversation) => conversation.is_archived)
				.length,
		}),
		[hydratedConversations],
	);
	const filteredConversations = useMemo(() => {
		const keyword = search.trim().toLowerCase();
		return hydratedConversations.filter((conversation) => {
			if (activeTab !== "archived" && conversation.is_archived) {
				return false;
			}
			if (activeTab === "archived" && !conversation.is_archived) {
				return false;
			}
			if (activeTab === "unread" && Number(conversation.unread_count || 0) <= 0) {
				return false;
			}
			if (activeTab === "groups" && !conversation.is_group) {
				return false;
			}
			if (!keyword) return true;

			const title = getConversationTitle(conversation, currentUserId);
			const preview = getPreview(conversation, currentUserId);
			return (
				title.toLowerCase().includes(keyword) ||
				preview.toLowerCase().includes(keyword)
			);
		});
	}, [activeTab, hydratedConversations, currentUserId, search]);

	const open = Boolean(anchorEl);
	const optionsOpen = Boolean(menuAnchorEl);

	const closeOptionsMenu = () => {
		setMenuAnchorEl(null);
		setMenuConversation(null);
	};

	const handleOpenOptions = (
		event: MouseEvent<HTMLElement>,
		conversation: Conversation,
	) => {
		event.stopPropagation();
		setMenuAnchorEl(event.currentTarget);
		setMenuConversation(conversation);
	};

	const refreshConversations = async () => {
		await conversationsQuery.refetch();
	};

	const handleOpenInMessenger = () => {
		if (!menuConversation) return;
		const conversationId = menuConversation.id;
		closeOptionsMenu();
		setAnchorEl(null);
		navigate(`/messenger?conversationId=${conversationId}`);
	};

	const handleMuteConversation = async () => {
		if (!menuConversation) return;
		const conversation = menuConversation;
		closeOptionsMenu();
		try {
			await conversationActions.updateNotifications.mutateAsync({
				conversationId: conversation.id,
				enabled: false,
			});
			await refreshConversations();
			notify?.({ type: "success", message: "Đã tắt thông báo" });
		} catch {
			notify?.({ type: "error", message: "Không thể tắt thông báo" });
		}
	};

	const handleArchiveConversation = async () => {
		if (!menuConversation) return;
		const conversation = menuConversation;
		closeOptionsMenu();
		try {
			await conversationActions.archive.mutateAsync(conversation.id);
			await refreshConversations();
			notify?.({ type: "success", message: "Đã lưu trữ cuộc trò chuyện" });
		} catch {
			notify?.({ type: "error", message: "Không thể lưu trữ cuộc trò chuyện" });
		}
	};

	const handleDeleteConversation = async () => {
		if (!menuConversation) return;
		const conversation = menuConversation;
		closeOptionsMenu();
		setConfirmAction({ type: "delete", conversation });
	};

	const handleLeaveConversation = async () => {
		if (!menuConversation) return;
		const conversation = menuConversation;
		closeOptionsMenu();
		setConfirmAction({ type: "leave", conversation });
	};

	const handleConfirmAction = async () => {
		if (!confirmAction) return;
		const { type, conversation } = confirmAction;
		setConfirmAction(null);
		try {
			if (type === "delete") {
				await conversationActions.delete.mutateAsync(conversation.id);
			} else {
				await conversationActions.leave.mutateAsync(conversation.id);
			}
			await refreshConversations();
			notify?.({
				type: "success",
				message:
					type === "delete"
						? "Đã xóa cuộc trò chuyện"
						: "Đã rời khỏi nhóm",
			});
		} catch {
			notify?.({
				type: "error",
				message:
					type === "delete"
						? "Không thể xóa cuộc trò chuyện"
						: "Không thể rời khỏi nhóm",
			});
		}
	};

	return (
		<>
			<Tooltip title="Tin nhắn">
				<IconButton
					color="inherit"
					onClick={(event) => setAnchorEl(event.currentTarget)}
					sx={{
						bgcolor: open ? "primary.main" : "action.hover",
						color: open ? "primary.contrastText" : "text.primary",
						"&:hover": {
							bgcolor: open ? "primary.dark" : "action.selected",
						},
					}}
				>
					<Badge
						color="error"
						badgeContent={unreadCount > 0 ? Math.min(unreadCount, 99) : 0}
					>
						<ChatIcon />
					</Badge>
				</IconButton>
			</Tooltip>

			<Popover
				open={open}
				anchorEl={anchorEl}
				onClose={() => setAnchorEl(null)}
				anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
				transformOrigin={{ vertical: "top", horizontal: "right" }}
				slotProps={{
					paper: {
						sx: {
							mt: 1.5,
							width: 430,
							maxWidth: "calc(100vw - 24px)",
							height: 720,
							maxHeight: "calc(100vh - 96px)",
							borderRadius: 2,
							bgcolor: "#242526",
							color: "#e4e6eb",
							boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
							overflow: "hidden",
						},
					},
				}}
			>
				<Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
					<Box sx={{ px: 2, pt: 1.75, pb: 1 }}>
						<Box
							sx={{
								display: "flex",
								alignItems: "center",
								mb: 1.5,
							}}
						>
							<Typography sx={{ fontSize: 28, fontWeight: 900 }}>
								Chats
							</Typography>
						</Box>

						<TextField
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Search Messenger"
							fullWidth
							size="small"
							InputProps={{
								startAdornment: (
									<InputAdornment position="start">
										<SearchIcon sx={{ color: "#b0b3b8" }} />
									</InputAdornment>
								),
							}}
							sx={{
								"& .MuiOutlinedInput-root": {
									borderRadius: 999,
									bgcolor: "#3a3b3c",
									color: "#e4e6eb",
									"& fieldset": { border: 0 },
								},
								"& input::placeholder": {
									color: "#b0b3b8",
									opacity: 1,
								},
							}}
						/>

						<Box
							sx={{
								display: "grid",
								gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
								columnGap: 0.5,
								mt: 2,
								pt: 1,
							}}
						>
							{HEADER_CHAT_TABS.map((tab) => {
								const selected = activeTab === tab.value;
								const count = tabCounts[tab.value];
								return (
									<Box
										key={tab.value}
										component="button"
										type="button"
										onClick={() => setActiveTab(tab.value)}
										sx={{
											all: "unset",
											cursor: "pointer",
											position: "relative",
											minWidth: 0,
											px: 0.75,
											py: 0.8,
											borderRadius: 999,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											color: selected ? "#ffb86b" : "#e4e6eb",
											bgcolor: selected
												? "rgba(249,115,22,0.18)"
												: "transparent",
											fontWeight: 800,
											"&:hover": {
												bgcolor: selected
													? "rgba(249,115,22,0.24)"
													: "rgba(255,255,255,0.08)",
											},
										}}
									>
										<Box
											component="span"
											sx={{
												minWidth: 0,
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
											}}
										>
											{tab.label}
										</Box>
										<Box
											component="span"
											sx={{
												position: "absolute",
												top: -8,
												right: 7,
												minWidth: 18,
												height: 18,
												px: 0.55,
												borderRadius: 999,
												display: "inline-flex",
												alignItems: "center",
												justifyContent: "center",
												bgcolor: selected
													? "rgba(249,115,22,0.22)"
													: "rgba(255,255,255,0.1)",
												color: selected ? "#ffb86b" : "#b0b3b8",
												fontSize: 11,
												fontWeight: 900,
												lineHeight: 1,
												pointerEvents: "none",
											}}
										>
											{count}
										</Box>
									</Box>
								);
							})}
						</Box>
					</Box>

					<Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 1.25 }}>
						{filteredConversations.map((conversation) => {
							const title = getConversationTitle(conversation, currentUserId);
							const preview = getPreview(conversation, currentUserId);
							const avatar = getConversationAvatar(conversation, currentUserId);
							const unread = Number(conversation.unread_count || 0) > 0;
							const conversationTime = formatTimestampRealtime(
								conversation.last_message_at ?? "",
								now,
							);

							return (
								<Box
									key={conversation.id}
									onClick={() => {
										openMiniMessengerConversation(conversation.id, {
											keepInRail: true,
										});
										setAnchorEl(null);
									}}
									sx={{
										display: "flex",
										alignItems: "center",
										gap: 1.5,
										position: "relative",
										px: 1,
										py: 1,
										pr: 5.5,
										borderRadius: 1.5,
										cursor: "pointer",
										"&:hover": { bgcolor: "rgba(255,255,255,0.08)" },
										"&:hover .header-chat-options": {
											opacity: 1,
											pointerEvents: "auto",
										},
									}}
								>
									<Avatar src={avatar} sx={{ width: 58, height: 58 }}>
										{title.charAt(0).toUpperCase()}
									</Avatar>
									<Box sx={{ flex: 1, minWidth: 0 }}>
										<Box
											sx={{
												display: "flex",
												alignItems: "center",
												gap: 1,
												minWidth: 0,
											}}
										>
											<Typography
												sx={{
													fontWeight: 850,
													minWidth: 0,
													overflow: "hidden",
													textOverflow: "ellipsis",
													whiteSpace: "nowrap",
												}}
											>
												{title}
											</Typography>
											{conversationTime ? (
												<Typography
													component="span"
													sx={{
														ml: "auto",
														flexShrink: 0,
														color: unread ? "#e4e6eb" : "#b0b3b8",
														fontSize: 13,
														fontWeight: unread ? 800 : 500,
														whiteSpace: "nowrap",
													}}
												>
													{conversationTime}
												</Typography>
											) : null}
										</Box>
										<Typography
											noWrap
											sx={{
												color: unread ? "#e4e6eb" : "#b0b3b8",
												fontWeight: unread ? 800 : 400,
												fontSize: 14,
											}}
										>
											{preview}
										</Typography>
									</Box>
									{unread && (
										<Box
											sx={{
												position: "absolute",
												right: 14,
												top: "50%",
												transform: "translateY(-50%)",
												width: 12,
												height: 12,
												borderRadius: "50%",
												bgcolor: "#f97316",
											}}
										/>
									)}
									<IconButton
										className="header-chat-options"
										size="small"
										onClick={(event) => handleOpenOptions(event, conversation)}
										sx={{
											position: "absolute",
											right: 5,
											top: "50%",
											transform: "translateY(-50%)",
											width: 38,
											height: 38,
											opacity:
												menuConversation?.id === conversation.id ? 1 : 0,
											pointerEvents:
												menuConversation?.id === conversation.id
													? "auto"
													: "none",
											bgcolor: "#3a3b3c",
											color: "#e4e6eb",
											boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
											"&:hover": { bgcolor: "#4b4c4f" },
										}}
									>
										<MoreHorizIcon fontSize="small" />
									</IconButton>
								</Box>
							);
						})}
					</Box>

					<Menu
						anchorEl={menuAnchorEl}
						open={optionsOpen}
						onClose={closeOptionsMenu}
						slotProps={{
							paper: {
								sx: {
									minWidth: 250,
									bgcolor: "#242526",
									color: "#e4e6eb",
									borderRadius: 2,
									boxShadow: "0 18px 48px rgba(0,0,0,0.5)",
									"& .MuiListItemIcon-root": {
										color: "inherit",
										minWidth: 38,
									},
								},
							},
						}}
					>
						<MenuItem onClick={handleOpenInMessenger}>
							<ListItemIcon>
								<OpenInNewIcon fontSize="small" />
							</ListItemIcon>
							Open in Messenger
						</MenuItem>
						<MenuItem onClick={handleMuteConversation}>
							<ListItemIcon>
								<NotificationsOffIcon fontSize="small" />
							</ListItemIcon>
							Mute notifications
						</MenuItem>
						<Divider sx={{ borderColor: "rgba(255,255,255,0.14)" }} />
						<MenuItem onClick={handleArchiveConversation}>
							<ListItemIcon>
								<ArchiveIcon fontSize="small" />
							</ListItemIcon>
							Archive
						</MenuItem>
						<MenuItem onClick={handleDeleteConversation} sx={{ color: "#ff4d4f" }}>
							<ListItemIcon sx={{ color: "#ff4d4f !important" }}>
								<DeleteIcon fontSize="small" />
							</ListItemIcon>
							Delete
						</MenuItem>
						{menuConversation?.is_group ? (
							<MenuItem onClick={handleLeaveConversation}>
								<ListItemIcon>
									<LogoutIcon fontSize="small" />
								</ListItemIcon>
								Leave group
							</MenuItem>
						) : null}
					</Menu>

					<Box
						onClick={() => {
							setAnchorEl(null);
							navigate("/messenger");
						}}
						sx={{
							py: 1.5,
							textAlign: "center",
							borderTop: "1px solid rgba(255,255,255,0.08)",
							color: "#f97316",
							fontWeight: 850,
							cursor: "pointer",
							"&:hover": { bgcolor: "rgba(255,255,255,0.06)" },
						}}
					>
						See all in Messenger
					</Box>
				</Box>
			</Popover>

			<Dialog
				open={Boolean(confirmAction)}
				onClose={() => setConfirmAction(null)}
				PaperProps={{
					sx: {
						bgcolor: "#242526",
						color: "#e4e6eb",
						borderRadius: 2,
						minWidth: 360,
					},
				}}
			>
				<DialogTitle sx={{ fontWeight: 850 }}>
					{confirmAction?.type === "delete"
						? "Xóa cuộc trò chuyện?"
						: "Rời khỏi nhóm?"}
				</DialogTitle>
				<DialogContent sx={{ color: "#b0b3b8" }}>
					{confirmAction?.type === "delete"
						? "Cuộc trò chuyện này sẽ bị xóa khỏi danh sách của bạn."
						: "Bạn sẽ không còn nhận tin nhắn từ nhóm này sau khi rời nhóm."}
				</DialogContent>
				<DialogActions sx={{ px: 3, pb: 2 }}>
					<Button onClick={() => setConfirmAction(null)}>Hủy</Button>
					<Button
						variant="contained"
						color={confirmAction?.type === "delete" ? "error" : "primary"}
						onClick={() => {
							void handleConfirmAction();
						}}
					>
						{confirmAction?.type === "delete" ? "Xóa" : "Rời nhóm"}
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
}
