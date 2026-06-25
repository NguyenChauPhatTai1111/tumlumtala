import {
	CreateGroupDialog,
	MessageList,
	MessengerComposer,
	UserSearchDialog,
} from "@components/messenger";
import { toRenderableChatBackground } from "@components/messenger/utils/background";
import { parseConversationThemeConfig } from "@components/messenger/utils/theme";
import {
	DEFAULT_INCOMING_BUBBLE_COLOR,
	DEFAULT_OUTGOING_BUBBLE_COLOR,
} from "@constants/messenger";
import { useCurrentUser } from "@hooks/common/useCurrentUser";
import { useNotification } from "@hooks/common/useNotification";
import { messengerKeys } from "@hooks/keys/messengerKeys";
import {
	useMessengerConversationActions,
	useMessengerConversations,
	useMessengerMessageActions,
	useMessengerMessages,
	useMessengerWebSocketConnection,
	useNewMessageNotification,
} from "@hooks/messenger";
import ArchiveIcon from "@mui/icons-material/Archive";
import CallIcon from "@mui/icons-material/Call";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import LogoutIcon from "@mui/icons-material/Logout";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PaletteIcon from "@mui/icons-material/Palette";
import RemoveIcon from "@mui/icons-material/Remove";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import VideocamIcon from "@mui/icons-material/Videocam";
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
	ListItemIcon,
	Menu,
	MenuItem,
	Paper,
	Popover,
	TextField,
	Tooltip,
	Typography,
	useMediaQuery,
	useTheme,
} from "@mui/material";
import MessengerCustomizeDialog from "@pages/messenger/dialogs/MessengerCustomizeDialog";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { listUsers } from "@/api/userApi";

import {
	createConversation,
	getConversation,
	getMessages,
	parsePaginated,
	sendMessage,
	setQuickReaction,
	toConversation,
	toMessage,
	uploadMessageAttachment,
} from "@/services/messengerService";
import { getActiveThemes } from "@/services/themeService";
import type {
	Conversation,
	Message,
	PaginatedResult,
	SendMessagePayloadItem,
	User,
} from "@/types/messenger";
import { resolveCdnUrl } from "@/utils/urlUtils";
import {
	MINI_MESSENGER_CLOSE_ALL_EVENT,
	MINI_MESSENGER_OPEN_EVENT,
	type MiniMessengerOpenDetail,
} from "./miniMessengerEvents";
import { buildGeneratedAvatar } from "./utils/avatar";
import { hydrateConversationParticipantAvatars } from "./utils/avatarHydration";

const CONVERSATION_FETCH_LIMIT = 10;
const CONVERSATION_DISPLAY_LIMIT = 5;
const MINI_WINDOW_LIMIT = 2;
const MINI_MESSAGE_LIMIT = 30;
const MAX_FILE_SIZE_MB = 100;
const MINI_OPEN_WINDOWS_STORAGE_KEY =
	"tumlumtala.miniMessenger.openConversationIds";
const MINI_RAIL_CONVERSATIONS_STORAGE_KEY =
	"tumlumtala.miniMessenger.railConversationIds";
const MINI_DISMISSED_CONVERSATIONS_STORAGE_KEY =
	"tumlumtala.miniMessenger.dismissedConversationIds";
const MINI_RAIL_CLEARED_STORAGE_KEY = "tumlumtala.miniMessenger.railCleared";

function readStoredConversationIds(storageKey: string, limit?: number) {
	if (typeof window === "undefined") return [];

	try {
		const raw = window.localStorage.getItem(storageKey);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		const ids = parsed
			.map((id) => Number(id))
			.filter((id) => Number.isInteger(id) && id > 0);
		const uniqueIds = Array.from(new Set(ids));
		return typeof limit === "number" ? uniqueIds.slice(-limit) : uniqueIds;
	} catch {
		return [];
	}
}

function readStoredOpenConversationIds() {
	return readStoredConversationIds(
		MINI_OPEN_WINDOWS_STORAGE_KEY,
		MINI_WINDOW_LIMIT,
	);
}

function readStoredRailConversationIds() {
	return readStoredConversationIds(MINI_RAIL_CONVERSATIONS_STORAGE_KEY);
}

function readStoredDismissedConversationIds() {
	return readStoredConversationIds(MINI_DISMISSED_CONVERSATIONS_STORAGE_KEY);
}

function readStoredRailCleared() {
	if (typeof window === "undefined") return false;
	return window.localStorage.getItem(MINI_RAIL_CLEARED_STORAGE_KEY) === "true";
}

function getMiniConversationTheme(conversation: Conversation) {
	const parsed = parseConversationThemeConfig(conversation.background);
	const themeData = conversation.theme;
	const background =
		conversation.theme_url ||
		themeData?.background ||
		parsed.background ||
		conversation.background;
	const backgroundColor =
		themeData?.background_color ||
		parsed.backgroundColor ||
		conversation.background_color;
	const hasTheme = Boolean(background || backgroundColor);

	return {
		chatBackground: toRenderableChatBackground(background, backgroundColor),
		incomingBubbleColor: hasTheme
			? themeData?.incoming_bubble_color ||
				parsed.incomingBubbleColor ||
				conversation.incoming_bubble_color ||
				DEFAULT_INCOMING_BUBBLE_COLOR
			: undefined,
		outgoingBubbleColor: hasTheme
			? themeData?.outgoing_bubble_color ||
				parsed.outgoingBubbleColor ||
				conversation.outgoing_bubble_color ||
				DEFAULT_OUTGOING_BUBBLE_COLOR
			: undefined,
		incomingTextColor:
			themeData?.incoming_text_color || conversation.incoming_text_color,
		outgoingTextColor:
			themeData?.outgoing_text_color ||
			conversation.outgoing_text_color ||
			(hasTheme ? "#ffffff" : undefined),
	};
}

function getConversationTitle(
	conversation: Conversation | undefined,
	currentUserId?: number | string,
) {
	if (!conversation) return "Tin nhắn";
	if (conversation.is_group) return conversation.name || "Nhóm chat";

	const other = conversation.participants.find(
		(participant) => Number(participant.id) !== Number(currentUserId),
	);

	return (
		other?.nickname ||
		other?.fullname ||
		conversation.name ||
		conversation.last_message_sender_name ||
		"Tin nhắn"
	);
}

function getConversationAvatar(
	conversation: Conversation | undefined,
	currentUserId?: number | string,
) {
	if (!conversation) return undefined;
	const title = getConversationTitle(conversation, currentUserId);
	if (conversation.is_group) {
		return resolveCdnUrl(conversation.avatar) || buildGeneratedAvatar(title);
	}

	return (
		resolveCdnUrl(
			conversation.participants.find(
				(participant) => Number(participant.id) !== Number(currentUserId),
			)?.avatar,
		) || buildGeneratedAvatar(title)
	);
}

function getMessageSenderName(
	conversation: Conversation,
	message: Message | null,
	currentUserId?: number | string,
) {
	if (!message) return "";
	if (Number(message.sender_id) === Number(currentUserId)) return "Bạn";

	const participant = conversation.participants.find(
		(item) => Number(item.id) === Number(message.sender_id),
	);

	return (
		participant?.nickname || participant?.fullname || message.sender_name || ""
	);
}

function getLastSenderName(
	conversation: Conversation,
	currentUserId?: number | string,
) {
	if (!conversation.last_message_sender_id) {
		return conversation.last_message_sender_name || "Chưa có tin nhắn";
	}

	if (Number(conversation.last_message_sender_id) === Number(currentUserId)) {
		return "Bạn";
	}

	const participant = conversation.participants.find(
		(item) => Number(item.id) === Number(conversation.last_message_sender_id),
	);

	return (
		participant?.nickname ||
		participant?.fullname ||
		conversation.last_message_sender_name ||
		"Người gửi"
	);
}

function getLastMessagePreviewContent(conversation: Conversation) {
	const content = conversation.last_message_content?.trim();
	const messageType = String(
		conversation.last_message_type ?? "",
	).toLowerCase();
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

function getMessagePreviewContent(message: Message) {
	const content = message.content?.trim();
	const messageType = String(message.message_type ?? "").toLowerCase();
	const looksLikeAttachmentPath = Boolean(
		content?.includes("/messenger/attachments/") ||
			content?.includes("messenger/attachments/"),
	);

	if (messageType === "image") return "Hình ảnh";
	if (messageType === "video") return "Video";
	if (messageType === "file" || looksLikeAttachmentPath) return "Tệp đính kèm";
	if (messageType === "sticker") return "Sticker";
	if (!content) return "Tin nhắn mới";

	return content;
}

function ConversationTooltip({
	conversation,
	currentUserId,
}: {
	conversation: Conversation;
	currentUserId?: number | string;
}) {
	const title = getConversationTitle(conversation, currentUserId);
	const senderName = getLastSenderName(conversation, currentUserId);
	const lastContent = getLastMessagePreviewContent(conversation);
	const previewText =
		conversation.is_group && lastContent !== "Chưa có tin nhắn"
			? `${senderName}: ${lastContent}`
			: lastContent;

	return (
		<Box sx={{ maxWidth: 280 }}>
			<Typography sx={{ fontWeight: 800, fontSize: 14 }} noWrap>
				{title}
			</Typography>
			<Typography sx={{ color: "rgba(255,255,255,0.76)", fontSize: 13 }} noWrap>
				{previewText}
			</Typography>
		</Box>
	);
}

function MiniConversationRail({
	conversations,
	currentUserId,
	total,
	openIds,
	onOpen,
	onDismiss,
	onCloseAll,
	onMinimizeAll,
	onOpenNewMessage,
}: {
	conversations: Conversation[];
	currentUserId?: number | string;
	total: number;
	openIds: number[];
	onOpen: (conversationId: number) => void;
	onDismiss: (conversationId: number) => void;
	onCloseAll: () => void;
	onMinimizeAll: () => void;
	onOpenNewMessage: () => void;
}) {
	const [optionsAnchor, setOptionsAnchor] = useState<HTMLElement | null>(null);
	const hiddenCount = Math.max(0, total - CONVERSATION_DISPLAY_LIMIT);
	const hasListedChats = total > 0;
	const hasOpenChats = openIds.length > 0;
	const closeOptions = () => setOptionsAnchor(null);

	return (
		<Box
			sx={{
				position: "fixed",
				right: 24,
				bottom: 24,
				zIndex: (theme) => theme.zIndex.modal - 1,
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				gap: 0.8,
			}}
		>
			<Tooltip title="Tùy chọn chat" placement="left">
				<IconButton
					onClick={(event) => setOptionsAnchor(event.currentTarget)}
					sx={{
						width: 50,
						height: 50,
						bgcolor: "background.paper",
						boxShadow: "0 14px 34px rgba(0,0,0,0.35)",
						"&:hover": { bgcolor: "action.hover" },
					}}
				>
					<MoreHorizIcon />
				</IconButton>
			</Tooltip>

			{conversations.map((conversation) => {
				const title = getConversationTitle(conversation, currentUserId);
				const selected = openIds.includes(conversation.id);

				return (
					<Tooltip
						key={conversation.id}
						title={
							<ConversationTooltip
								conversation={conversation}
								currentUserId={currentUserId}
							/>
						}
						placement="left"
					>
						<Box
							sx={{
								position: "relative",
								width: 50,
								height: 50,
								"&:hover .mini-rail-dismiss": { opacity: 1 },
							}}
						>
							<IconButton
								onClick={() => onOpen(conversation.id)}
								sx={{
									width: 50,
									height: 50,
									p: 0,
									borderRadius: "50%",
									bgcolor: selected ? "primary.main" : "background.paper",
									boxShadow: "0 12px 30px rgba(0,0,0,0.34)",
									"&:hover": {
										bgcolor: selected ? "primary.dark" : "action.hover",
									},
								}}
							>
								<Badge
									color="primary"
									badgeContent={
										conversation.unread_count > 0
											? Math.min(conversation.unread_count, 99)
											: 0
									}
								>
									<Avatar
										src={getConversationAvatar(conversation, currentUserId)}
										alt={title}
										sx={{ width: 46, height: 46 }}
									>
										{title.charAt(0).toUpperCase()}
									</Avatar>
								</Badge>
							</IconButton>
							<IconButton
								className="mini-rail-dismiss"
								size="small"
								onClick={(event) => {
									event.stopPropagation();
									onDismiss(conversation.id);
								}}
								sx={{
									position: "absolute",
									left: -6,
									top: -6,
									width: 22,
									height: 22,
									bgcolor: "#303030",
									color: "#fff",
									border: "1px solid rgba(255,255,255,0.16)",
									opacity: 0,
									transition: "opacity 0.15s",
									"&:hover": { bgcolor: "#4a4a4a" },
								}}
							>
								<CloseIcon sx={{ fontSize: 14 }} />
							</IconButton>
						</Box>
					</Tooltip>
				);
			})}

			<Popover
				open={Boolean(optionsAnchor)}
				anchorEl={optionsAnchor}
				onClose={closeOptions}
				anchorOrigin={{ vertical: "center", horizontal: "left" }}
				transformOrigin={{ vertical: "center", horizontal: "right" }}
				slotProps={{
					paper: {
						sx: {
							mb: 1,
							mr: 1.5,
							width: 330,
							borderRadius: 2,
							bgcolor: "#242526",
							color: "#f5f5f5",
							boxShadow: "0 18px 55px rgba(0,0,0,0.45)",
							overflow: "visible",
							"&::after": {
								content: '""',
								position: "absolute",
								right: -9,
								top: "50%",
								width: 18,
								height: 18,
								bgcolor: "#242526",
								transform: "translateY(-50%) rotate(45deg)",
							},
						},
					},
				}}
			>
				<Box sx={{ p: 1.25, position: "relative", zIndex: 1 }}>
					<Box
						component="button"
						disabled={!hasListedChats}
						onClick={() => {
							onCloseAll();
							closeOptions();
						}}
						sx={{
							all: "unset",
							width: "100%",
							display: "flex",
							alignItems: "center",
							gap: 1.5,
							px: 1,
							py: 1,
							borderRadius: 1.25,
							cursor: hasListedChats ? "pointer" : "default",
							opacity: hasListedChats ? 1 : 0.45,
							"&:hover": {
								bgcolor: hasListedChats
									? "rgba(255,255,255,0.08)"
									: "transparent",
							},
						}}
					>
						<CloseIcon />
						<Typography sx={{ fontWeight: 800 }}>Close all chats</Typography>
					</Box>
					<Box
						component="button"
						disabled={!hasOpenChats}
						onClick={() => {
							onMinimizeAll();
							closeOptions();
						}}
						sx={{
							all: "unset",
							width: "100%",
							display: "flex",
							alignItems: "center",
							gap: 1.5,
							px: 1,
							py: 1,
							borderRadius: 1.25,
							cursor: hasOpenChats ? "pointer" : "default",
							opacity: hasOpenChats ? 1 : 0.45,
							"&:hover": {
								bgcolor: hasOpenChats
									? "rgba(255,255,255,0.08)"
									: "transparent",
							},
						}}
					>
						<RemoveCircleOutlineIcon />
						<Typography sx={{ fontWeight: 800 }}>
							Minimise open chats
						</Typography>
					</Box>
				</Box>
			</Popover>

			{hiddenCount > 0 && (
				<Paper
					elevation={8}
					sx={{
						width: 54,
						height: 54,
						display: "grid",
						placeItems: "center",
						borderRadius: "50%",
						bgcolor: "background.paper",
						fontWeight: 800,
					}}
				>
					+{hiddenCount}
				</Paper>
			)}

			<Tooltip title="Tin nhắn mới" placement="left">
				<IconButton
					onClick={onOpenNewMessage}
					sx={{
						width: 58,
						height: 58,
						bgcolor: "background.paper",
						boxShadow: "0 14px 34px rgba(0,0,0,0.35)",
						"&:hover": { bgcolor: "action.hover" },
					}}
				>
					<EditIcon />
				</IconButton>
			</Tooltip>
		</Box>
	);
}

function MiniChatWindow({
	conversation,
	currentUserId,
	onClose,
	onMinimize,
}: {
	conversation: Conversation;
	currentUserId?: number | string;
	onClose: (conversationId: number) => void;
	onMinimize: (conversationId: number) => void;
}) {
	const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
	const [replyingMessage, setReplyingMessage] = useState<Message | null>(null);
	const [actionsAnchor, setActionsAnchor] = useState<HTMLElement | null>(null);
	const [customizeOpen, setCustomizeOpen] = useState(false);
	const [nicknameOpen, setNicknameOpen] = useState(false);
	const [nicknameTargetId, setNicknameTargetId] = useState<number | null>(null);
	const [nicknameValue, setNicknameValue] = useState("");
	const [createGroupOpen, setCreateGroupOpen] = useState(false);
	const [confirmAction, setConfirmAction] = useState<"delete" | "leave" | null>(
		null,
	);
	const [creatingGroup, setCreatingGroup] = useState(false);
	const queryClient = useQueryClient();
	const { open } = useNotification();
	const navigate = useNavigate();
	const ws = useMessengerWebSocketConnection();
	const conversationActions = useMessengerConversationActions();
	const messageActions = useMessengerMessageActions(conversation.id);
	const themesQuery = useQuery({
		queryKey: ["themes", "active"],
		queryFn: getActiveThemes,
	});
	const messagesQuery = useMessengerMessages(
		conversation.id,
		MINI_MESSAGE_LIMIT,
		0,
	);
	const title = getConversationTitle(conversation, currentUserId);
	const avatar = getConversationAvatar(conversation, currentUserId);
	const replySenderName = useMemo(
		() => getMessageSenderName(conversation, replyingMessage, currentUserId),
		[conversation, currentUserId, replyingMessage],
	);
	const otherParticipants = useMemo(
		() =>
			conversation.participants.filter(
				(participant) => Number(participant.id) !== Number(currentUserId),
			),
		[conversation.participants, currentUserId],
	);
	const nicknameTarget = useMemo(
		() =>
			conversation.participants.find(
				(participant) => participant.id === nicknameTargetId,
			) ?? otherParticipants[0],
		[conversation.participants, nicknameTargetId, otherParticipants],
	);
	const miniTheme = useMemo(
		() => getMiniConversationTheme(conversation),
		[conversation],
	);
	const messages = useMemo(
		() =>
			(messagesQuery.data?.items ?? []).slice().sort((a, b) => {
				const seqA = Number(a.message_seq ?? a.seq ?? a.id);
				const seqB = Number(b.message_seq ?? b.seq ?? b.id);
				if (seqA !== seqB) return seqA - seqB;
				return (
					new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
				);
			}),
		[messagesQuery.data?.items],
	);

	const loadOlderMessages = useCallback(() => {
		const currentPage = messagesQuery.data;
		if (
			!currentPage?.hasMore ||
			loadingOlderMessages ||
			messagesQuery.isLoading
		) {
			return false;
		}

		setLoadingOlderMessages(true);
		const key = messengerKeys.messages(
			String(conversation.id),
			MINI_MESSAGE_LIMIT,
			0,
		);

		void (async () => {
			try {
				const olderPage = await getMessages(conversation.id, {
					limit: MINI_MESSAGE_LIMIT,
					offset: currentPage.items.length,
				});

				queryClient.setQueryData<PaginatedResult<Message>>(key, (old) => {
					if (!old) return olderPage;

					const seen = new Set(
						old.items.map((item) =>
							item.id > 0
								? `id:${item.id}`
								: `tmp:${item.temp_id ?? item.created_at}`,
						),
					);
					const olderItems = olderPage.items.filter((item) => {
						const itemKey =
							item.id > 0
								? `id:${item.id}`
								: `tmp:${item.temp_id ?? item.created_at}`;
						return !seen.has(itemKey);
					});

					return {
						...old,
						items: [...olderItems, ...old.items],
						total: Math.max(old.total, olderPage.total),
						hasMore: olderPage.hasMore,
					};
				});
			} catch {
				open?.({ type: "error", message: "Không thể tải thêm tin nhắn" });
			} finally {
				setLoadingOlderMessages(false);
			}
		})();

		return true;
	}, [
		conversation.id,
		loadingOlderMessages,
		messagesQuery.data,
		messagesQuery.isLoading,
		open,
		queryClient,
	]);

	const appendMessageToCache = useCallback(
		(message: Message) => {
			const key = messengerKeys.messages(
				String(conversation.id),
				MINI_MESSAGE_LIMIT,
				0,
			);

			queryClient.setQueryData<PaginatedResult<Message>>(key, (old) => {
				if (!old) {
					return {
						items: [message],
						total: 1,
						limit: MINI_MESSAGE_LIMIT,
						offset: 0,
						hasMore: false,
					};
				}

				if (
					old.items.some(
						(item) =>
							(message.id > 0 && item.id === message.id) ||
							(Boolean(message.temp_id) && item.temp_id === message.temp_id),
					)
				) {
					return old;
				}

				return {
					...old,
					items: [...old.items, message],
					total: old.total + 1,
				};
			});
		},
		[conversation.id, queryClient],
	);

	const updateMessageInCache = useCallback(
		(
			predicate: (message: Message) => boolean,
			updater: (message: Message) => Message,
		) => {
			const key = messengerKeys.messages(
				String(conversation.id),
				MINI_MESSAGE_LIMIT,
				0,
			);
			queryClient.setQueryData<PaginatedResult<Message>>(key, (old) => {
				if (!old) return old;
				return {
					...old,
					items: old.items.map((item) =>
						predicate(item) ? updater(item) : item,
					),
				};
			});
		},
		[conversation.id, queryClient],
	);

	const updateConversationPreview = useCallback(
		(message: Message) => {
			queryClient.setQueryData<PaginatedResult<Conversation>>(
				messengerKeys.conversations(CONVERSATION_FETCH_LIMIT, 0),
				(old) => {
					if (!old) return old;

					const idx = old.items.findIndex(
						(item) => item.id === conversation.id,
					);
					if (idx === -1) return old;

					const updated: Conversation = {
						...old.items[idx],
						last_message_id: message.id || old.items[idx].last_message_id,
						last_message_content: message.content,
						last_message_at: message.created_at,
						last_message_sender_id: Number(message.sender_id),
						last_message_type: message.message_type,
					};

					return {
						...old,
						items: [
							updated,
							...old.items.filter((_, index) => index !== idx),
						].slice(0, CONVERSATION_FETCH_LIMIT),
					};
				},
			);
		},
		[conversation.id, queryClient],
	);

	const handleSend = useCallback(
		async (
			text: string | SendMessagePayloadItem[],
			type?: string,
			itemId?: number,
		) => {
			const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
			const payloads = Array.isArray(text) ? text : null;
			const firstPayload = payloads?.[0];
			const initialContent = payloads
				? String(firstPayload?.content ?? "")
				: String(text);
			const initialMessageType = firstPayload?.type || type || "text";

			if (!initialContent.trim() && !firstPayload?.file) return false;

			const optimisticMessage: Message = {
				id: 0,
				temp_id: tempId,
				conversation_id: conversation.id,
				sender_id: String(currentUserId ?? ""),
				receiver_id: "",
				content: initialContent,
				message_type: initialMessageType,
				is_read: false,
				created_at: new Date().toISOString(),
				pending: true,
				failed: false,
				status: "sending",
				reply_to_message_id:
					replyingMessage && Number.isFinite(Number(replyingMessage.id))
						? Number(replyingMessage.id)
						: undefined,
				file: firstPayload?.file,
				metadata: firstPayload?.metadata,
			};

			appendMessageToCache(optimisticMessage);
			updateConversationPreview(optimisticMessage);

			try {
				let content = initialContent;
				let messageType = firstPayload?.type || type || "text";
				let messagesPayload: SendMessagePayloadItem[] | undefined =
					payloads ?? undefined;
				let metadata = firstPayload?.metadata;
				let finalItemId = firstPayload?.item_id ?? itemId;

				if (firstPayload?.file) {
					const file = firstPayload.file;
					if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
						updateMessageInCache(
							(message) => message.temp_id === tempId,
							(message) => ({
								...message,
								pending: false,
								failed: true,
								status: undefined,
							}),
						);
						open?.({
							type: "error",
							message: `File quá lớn. Dung lượng tối đa cho phép là ${MAX_FILE_SIZE_MB}MB`,
						});
						return false;
					}

					content = await uploadMessageAttachment(conversation.id, file);
					updateMessageInCache(
						(message) => message.temp_id === tempId,
						(message) => ({ ...message, content }),
					);
					messageType = firstPayload.type;
					metadata = firstPayload.metadata;
					finalItemId = firstPayload.item_id;
					messagesPayload = [
						{
							type: firstPayload.type,
							content,
							item_id: firstPayload.item_id,
							metadata: firstPayload.metadata,
						},
					];
				}

				if (!content.trim() && !firstPayload?.file) return false;

				const response = await sendMessage({
					conversation_id: conversation.id,
					content,
					message_type: messageType,
					item_id: finalItemId,
					metadata,
					messages: messagesPayload,
					temp_id: tempId,
					reply_to_message_id:
						replyingMessage && Number.isFinite(Number(replyingMessage.id))
							? Number(replyingMessage.id)
							: undefined,
				});

				updateMessageInCache(
					(message) =>
						message.temp_id === tempId ||
						(response.message.id > 0 && message.id === response.message.id),
					(message) => ({
						...message,
						...response.message,
						temp_id: message.temp_id || response.message.temp_id || tempId,
						pending: false,
						failed: false,
						status: "sent",
						metadata: response.message.metadata ?? message.metadata,
					}),
				);
				updateConversationPreview(response.message);

				if (firstPayload?.content?.startsWith("blob:")) {
					URL.revokeObjectURL(firstPayload.content);
				}

				setReplyingMessage(null);
				return true;
			} catch {
				updateMessageInCache(
					(message) => message.temp_id === tempId,
					(message) => ({
						...message,
						pending: false,
						failed: true,
						status: undefined,
					}),
				);
				open?.({ type: "error", message: "Không thể gửi tin nhắn" });
				return false;
			}
		},
		[
			appendMessageToCache,
			conversation.id,
			currentUserId,
			open,
			replyingMessage,
			updateConversationPreview,
			updateMessageInCache,
		],
	);

	const applyLocalReaction = useCallback(
		(
			target: Message,
			reaction: string,
			action: "toggle" | "remove" = "toggle",
		): Message => {
			const userId = String(currentUserId ?? "");
			const currentReaction = target.my_reaction ?? null;
			const shouldRemove =
				action === "remove" ||
				(Boolean(currentReaction) && currentReaction === reaction);
			const reactions = target.reactions ?? [];
			const withoutMine = userId
				? reactions.filter((item) => String(item.user_id) !== userId)
				: reactions;

			return {
				...target,
				my_reaction: shouldRemove ? null : reaction,
				reactions: shouldRemove
					? withoutMine
					: [...withoutMine, { user_id: userId, emoji: reaction }],
			};
		},
		[currentUserId],
	);

	const handleToggleReaction = useCallback(
		async (
			message: Message,
			reaction = "👍",
			action: "toggle" | "remove" = "toggle",
		) => {
			if (!message.id) return;

			const key = messengerKeys.messages(
				String(conversation.id),
				MINI_MESSAGE_LIMIT,
				0,
			);
			const previousMessagesCache =
				queryClient.getQueryData<PaginatedResult<Message>>(key);
			const matchesMessage = (item: Message) =>
				(message.id > 0 && item.id === message.id) ||
				(Boolean(message.temp_id) && item.temp_id === message.temp_id);

			queryClient.setQueryData<PaginatedResult<Message>>(key, (old) => {
				if (!old) return old;
				return {
					...old,
					items: old.items.map((item) =>
						matchesMessage(item)
							? applyLocalReaction(item, reaction, action)
							: item,
					),
				};
			});

			try {
				if (action === "remove") {
					await messageActions.removeReaction.mutateAsync({
						messageId: message.id,
						reaction: reaction || message.my_reaction || undefined,
					});
					return;
				}

				if (message.my_reaction && message.my_reaction === reaction) {
					await messageActions.removeReaction.mutateAsync({
						messageId: message.id,
						reaction: message.my_reaction,
					});
				} else {
					await messageActions.setReaction.mutateAsync({
						messageId: message.id,
						reaction,
					});
				}
			} catch {
				queryClient.setQueryData(key, previousMessagesCache);
				open?.({ type: "error", message: "Không thể cập nhật cảm xúc" });
			}
		},
		[
			applyLocalReaction,
			conversation.id,
			messageActions.removeReaction,
			messageActions.setReaction,
			open,
			queryClient,
		],
	);

	const handleRetryMessage = useCallback(
		async (message: Message) => {
			const isMatch = (item: Message) =>
				(message.id > 0 && item.id === message.id) ||
				(Boolean(message.temp_id) && item.temp_id === message.temp_id);

			updateMessageInCache(isMatch, (item) => ({
				...item,
				pending: true,
				failed: false,
				status: "sending",
			}));

			try {
				const messageType = message.message_type || "text";
				let contentToRetry = message.content;
				let messagesPayload: SendMessagePayloadItem[] | undefined;
				let metadata = message.metadata;

				const isAttachment =
					messageType === "image" ||
					messageType === "video" ||
					messageType === "file";
				const contentLooksUploaded =
					String(contentToRetry).startsWith("http") ||
					String(contentToRetry).includes("/messenger/attachments/") ||
					String(contentToRetry).includes("messenger/attachments/");
				const needsReUpload =
					Boolean(message.file) &&
					(((messageType === "image" || messageType === "video") &&
						String(contentToRetry).startsWith("blob:")) ||
						(messageType === "file" && !contentLooksUploaded));

				if (needsReUpload) {
					if (!message.file) {
						throw new Error("Missing original file");
					}

					contentToRetry = await uploadMessageAttachment(
						conversation.id,
						message.file,
					);
					metadata = message.metadata;
					updateMessageInCache(isMatch, (item) => ({
						...item,
						content: contentToRetry,
						metadata: metadata ?? item.metadata,
					}));
				}

				if (isAttachment) {
					messagesPayload = [
						{
							type: messageType,
							content: contentToRetry,
							metadata,
						},
					];
				}

				const response = await sendMessage({
					conversation_id: conversation.id,
					content: contentToRetry,
					message_type: messageType,
					metadata,
					messages: messagesPayload,
					temp_id: message.temp_id,
					reply_to_message_id: message.reply_to_message_id,
				});

				updateMessageInCache(isMatch, (item) => ({
					...item,
					...response.message,
					temp_id: item.temp_id || response.message.temp_id || message.temp_id,
					pending: false,
					failed: false,
					status: "sent",
					metadata: response.message.metadata ?? item.metadata,
				}));
				updateConversationPreview(response.message);
				open?.({ type: "success", message: "Đã gửi lại tin nhắn" });
			} catch {
				updateMessageInCache(isMatch, (item) => ({
					...item,
					pending: false,
					failed: true,
					status: undefined,
				}));
				open?.({
					type: "error",
					message: "Không thể gửi lại tin nhắn. Vui lòng thử lại.",
				});
			}
		},
		[conversation.id, open, updateConversationPreview, updateMessageInCache],
	);

	const patchConversationCache = useCallback(
		(updater: (item: Conversation) => Conversation) => {
			queryClient.setQueriesData(
				{ queryKey: [...messengerKeys.all, "conversations"] },
				(oldData) => {
					const data = oldData as PaginatedResult<Conversation> | undefined;
					if (!data || !Array.isArray(data.items)) return oldData;
					return {
						...data,
						items: data.items.map((item) =>
							item.id === conversation.id ? updater(item) : item,
						),
					};
				},
			);
		},
		[conversation.id, queryClient],
	);

	const removeConversationFromCache = useCallback(() => {
		queryClient.setQueriesData(
			{ queryKey: [...messengerKeys.all, "conversations"] },
			(oldData) => {
				const data = oldData as PaginatedResult<Conversation> | undefined;
				if (!data || !Array.isArray(data.items)) return oldData;
				return {
					...data,
					items: data.items.filter((item) => item.id !== conversation.id),
					total: Math.max(0, data.total - 1),
				};
			},
		);
	}, [conversation.id, queryClient]);

	const closeActionsMenu = () => setActionsAnchor(null);

	const handleOpenNicknameDialog = () => {
		const target = nicknameTarget;
		if (!target) return;
		setNicknameTargetId(target.id);
		setNicknameValue(target.nickname || target.fullname || "");
		setNicknameOpen(true);
		closeActionsMenu();
	};

	const handleSaveNickname = async () => {
		const target = nicknameTarget;
		if (!target) return;
		try {
			await conversationActions.setNickname.mutateAsync({
				conversationId: conversation.id,
				targetUserId: target.id,
				nickname: nicknameValue.trim(),
			});
			patchConversationCache((item) => ({
				...item,
				participants: item.participants.map((participant) =>
					participant.id === target.id
						? { ...participant, nickname: nicknameValue.trim() || undefined }
						: participant,
				),
			}));
			open?.({ type: "success", message: "Đã cập nhật nickname" });
			setNicknameOpen(false);
		} catch {
			open?.({ type: "error", message: "Không thể cập nhật nickname" });
		}
	};

	const handleCreateGroup = async (name: string, participantIds: number[]) => {
		const initialIds = otherParticipants.map((participant) => participant.id);
		const allParticipantIds = Array.from(
			new Set([...initialIds, ...participantIds]),
		);
		if (allParticipantIds.length === 0) return;
		setCreatingGroup(true);
		try {
			const created = await createConversation({
				is_group: true,
				name,
				participant_ids: allParticipantIds,
			});
			queryClient.setQueryData<PaginatedResult<Conversation>>(
				messengerKeys.conversations(CONVERSATION_FETCH_LIMIT, 0),
				(old) =>
					old
						? {
								...old,
								items: [
									created,
									...old.items.filter((item) => item.id !== created.id),
								].slice(0, CONVERSATION_FETCH_LIMIT),
								total: Math.max(old.total, old.items.length + 1),
							}
						: {
								items: [created],
								total: 1,
								limit: CONVERSATION_FETCH_LIMIT,
								offset: 0,
								hasMore: false,
							},
			);
			open?.({ type: "success", message: "Đã tạo nhóm" });
			setCreateGroupOpen(false);
		} catch {
			open?.({ type: "error", message: "Không thể tạo nhóm" });
		} finally {
			setCreatingGroup(false);
		}
	};

	const handleArchiveConversation = async () => {
		closeActionsMenu();
		try {
			await conversationActions.archive.mutateAsync(conversation.id);
			removeConversationFromCache();
			onClose(conversation.id);
			open?.({ type: "success", message: "Đã lưu trữ cuộc trò chuyện" });
		} catch {
			open?.({ type: "error", message: "Không thể lưu trữ cuộc trò chuyện" });
		}
	};

	const handleDeleteConversation = async () => {
		closeActionsMenu();
		setConfirmAction("delete");
	};

	const handleConfirmAction = async () => {
		const action = confirmAction;
		if (!action) return;
		setConfirmAction(null);
		try {
			if (action === "delete") {
				await conversationActions.delete.mutateAsync(conversation.id);
			} else {
				await conversationActions.leave.mutateAsync(conversation.id);
			}
			removeConversationFromCache();
			onClose(conversation.id);
			open?.({
				type: "success",
				message:
					action === "delete" ? "Đã xóa cuộc trò chuyện" : "Đã rời khỏi nhóm",
			});
		} catch {
			open?.({
				type: "error",
				message:
					action === "delete"
						? "Không thể xóa cuộc trò chuyện"
						: "Không thể rời khỏi nhóm",
			});
		}
	};

	const handleLeaveConversation = async () => {
		closeActionsMenu();
		setConfirmAction("leave");
	};

	const handleChangeBackground = async (
		targetConversation: Conversation,
		config: {
			background: string;
			backgroundColor: string;
			incomingBubbleColor: string;
			outgoingBubbleColor: string;
			incomingTextColor: string;
			outgoingTextColor: string;
			presetId?: string;
			themeId?: number;
			themeUrl?: string | File;
		},
	) => {
		if (!config.themeId) return;
		await conversationActions.updateBackground.mutateAsync({
			conversationId: targetConversation.id,
			themeId: config.themeId,
			themeUrl: config.themeUrl,
			customIncomingBubbleColor: config.incomingBubbleColor,
			customOutgoingBubbleColor: config.outgoingBubbleColor,
			customIncomingTextColor: config.incomingTextColor,
			customOutgoingTextColor: config.outgoingTextColor,
		});
		patchConversationCache((item) => ({
			...item,
			theme_id: config.themeId,
			background: config.background,
			background_color: config.backgroundColor,
			incoming_bubble_color: config.incomingBubbleColor,
			outgoing_bubble_color: config.outgoingBubbleColor,
			incoming_text_color: config.incomingTextColor,
			outgoing_text_color: config.outgoingTextColor,
		}));
	};

	const handleChangeQuickReaction = async (
		targetConversation: Conversation,
		quickReaction: string,
	) => {
		await setQuickReaction(targetConversation.id, quickReaction);
		patchConversationCache((item) => ({
			...item,
			quick_reaction: quickReaction,
		}));
	};

	return (
		<Paper
			elevation={12}
			sx={{
				width: 380,
				height: 560,
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
				borderRadius: 2,
				bgcolor: "background.paper",
				border: "1px solid",
				borderColor: "divider",
				boxShadow: "0 28px 80px rgba(0,0,0,0.45)",
				maxWidth: "calc(100vw - 132px)",
				minWidth: 0,
				overflowX: "hidden",
				"& .message-list-viewport": {
					overflowX: "hidden",
				},
				"& .message-list-viewport > *": {
					maxWidth: "100%",
				},
			}}
		>
			<Box
				sx={{
					height: 56,
					display: "flex",
					alignItems: "center",
					gap: 1,
					px: 1.25,
					borderBottom: "1px solid",
					borderColor: "divider",
				}}
			>
				<Avatar src={avatar} alt={title} sx={{ width: 36, height: 36 }}>
					{title.charAt(0).toUpperCase()}
				</Avatar>
				<Typography
					fontWeight={800}
					noWrap
					sx={{ flex: 1, minWidth: 0, fontSize: 16 }}
				>
					{title}
				</Typography>
				<IconButton
					size="small"
					color="primary"
					onClick={(event) => setActionsAnchor(event.currentTarget)}
				>
					<KeyboardArrowDownIcon fontSize="small" />
				</IconButton>
				<IconButton size="small" color="primary">
					<CallIcon fontSize="small" />
				</IconButton>
				<IconButton size="small" color="primary">
					<VideocamIcon fontSize="small" />
				</IconButton>
				<IconButton
					size="small"
					color="primary"
					onClick={() => onMinimize(conversation.id)}
					sx={{
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<RemoveIcon fontSize="small" />
				</IconButton>
				<IconButton
					size="small"
					color="primary"
					onClick={() => onClose(conversation.id)}
				>
					<CloseIcon fontSize="small" />
				</IconButton>
			</Box>

			<Menu
				anchorEl={actionsAnchor}
				open={Boolean(actionsAnchor)}
				onClose={closeActionsMenu}
				slotProps={{
					paper: {
						sx: {
							minWidth: 260,
							bgcolor: "#242526",
							color: "#e4e6eb",
							borderRadius: 2,
							boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
							"& .MuiListItemIcon-root": {
								color: "inherit",
								minWidth: 38,
							},
						},
					},
				}}
			>
				<MenuItem
					onClick={() => {
						closeActionsMenu();
						navigate(`/messenger?conversationId=${conversation.id}`);
					}}
				>
					<ListItemIcon>
						<OpenInNewIcon fontSize="small" />
					</ListItemIcon>
					Open in Messenger
				</MenuItem>
				<Divider sx={{ borderColor: "rgba(255,255,255,0.14)" }} />
				<MenuItem
					onClick={() => {
						closeActionsMenu();
						setCustomizeOpen(true);
					}}
				>
					<ListItemIcon>
						<PaletteIcon fontSize="small" />
					</ListItemIcon>
					Theme
				</MenuItem>
				<MenuItem
					onClick={() => {
						closeActionsMenu();
						setCustomizeOpen(true);
					}}
				>
					<ListItemIcon>
						<ThumbUpIcon fontSize="small" />
					</ListItemIcon>
					Emoji
				</MenuItem>
				<MenuItem onClick={handleOpenNicknameDialog}>
					<ListItemIcon>
						<EditIcon fontSize="small" />
					</ListItemIcon>
					Nickname
				</MenuItem>
				<Divider sx={{ borderColor: "rgba(255,255,255,0.14)" }} />
				{conversation.is_group ? (
					<MenuItem onClick={handleLeaveConversation}>
						<ListItemIcon>
							<LogoutIcon fontSize="small" />
						</ListItemIcon>
						Leave group
					</MenuItem>
				) : (
					<MenuItem
						onClick={() => {
							closeActionsMenu();
							setCreateGroupOpen(true);
						}}
					>
						<ListItemIcon>
							<GroupAddIcon fontSize="small" />
						</ListItemIcon>
						Create group with...
					</MenuItem>
				)}
				<Divider sx={{ borderColor: "rgba(255,255,255,0.14)" }} />
				<MenuItem onClick={handleArchiveConversation}>
					<ListItemIcon>
						<ArchiveIcon fontSize="small" />
					</ListItemIcon>
					Archive
				</MenuItem>
				<MenuItem
					onClick={handleDeleteConversation}
					sx={{ color: "error.main" }}
				>
					<ListItemIcon sx={{ color: "error.main !important" }}>
						<DeleteIcon fontSize="small" />
					</ListItemIcon>
					Delete
				</MenuItem>
			</Menu>

			<MessageList
				messages={messages}
				conversation={conversation}
				chatBackground={miniTheme.chatBackground}
				incomingBubbleColor={miniTheme.incomingBubbleColor}
				outgoingBubbleColor={miniTheme.outgoingBubbleColor}
				incomingTextColor={miniTheme.incomingTextColor}
				outgoingTextColor={miniTheme.outgoingTextColor}
				loading={messagesQuery.isLoading}
				error={messagesQuery.isError ? "Không thể tải tin nhắn" : undefined}
				hasMore={Boolean(messagesQuery.data?.hasMore)}
				loadingMore={loadingOlderMessages}
				onLoadMore={loadOlderMessages}
				onToggleReaction={handleToggleReaction}
				onReplyMessage={setReplyingMessage}
				onRetryMessage={handleRetryMessage}
				ws={ws}
			/>

			<Box
				sx={{
					minWidth: 0,
					overflowX: "hidden",
					"& > div": {
						minWidth: 0,
						maxWidth: "100%",
						overflowX: "hidden",
					},
					"& > div > div": {
						minWidth: 0,
						maxWidth: "100%",
					},
					"& .composer-attachment-preview-list": {
						overflowX: "hidden",
						overflowY: "auto",
						flexWrap: "wrap",
						maxHeight: 132,
						pr: 0.5,
					},
				}}
			>
				<MessengerComposer
					key={conversation.id}
					conversationId={conversation.id}
					replyMessage={replyingMessage}
					replySenderName={replySenderName}
					onCancelReply={() => setReplyingMessage(null)}
					onSend={handleSend}
					quickReaction={conversation.quick_reaction}
					ws={ws}
					useDefaultTheme
				/>
			</Box>

			<Dialog
				open={Boolean(confirmAction)}
				onClose={() => setConfirmAction(null)}
				maxWidth="xs"
				fullWidth
			>
				<DialogTitle sx={{ fontWeight: 850 }}>
					{confirmAction === "delete"
						? "Xóa cuộc trò chuyện?"
						: "Rời khỏi nhóm?"}
				</DialogTitle>
				<DialogContent sx={{ color: "text.secondary" }}>
					{confirmAction === "delete"
						? "Cuộc trò chuyện này sẽ bị xóa khỏi danh sách của bạn."
						: "Bạn sẽ không còn nhận tin nhắn từ nhóm này sau khi rời nhóm."}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmAction(null)}>Hủy</Button>
					<Button
						variant="contained"
						color={confirmAction === "delete" ? "error" : "primary"}
						onClick={() => {
							void handleConfirmAction();
						}}
					>
						{confirmAction === "delete" ? "Xóa" : "Rời nhóm"}
					</Button>
				</DialogActions>
			</Dialog>

			<MessengerCustomizeDialog
				open={customizeOpen}
				conversation={conversation}
				initialThemePresetId={conversation.theme?.preset_id ?? ""}
				themes={themesQuery.data ?? []}
				onClose={() => setCustomizeOpen(false)}
				onRename={async (targetConversation, name) => {
					await conversationActions.rename.mutateAsync({
						conversationId: targetConversation.id,
						name,
					});
					patchConversationCache((item) => ({ ...item, name }));
				}}
				onChangeGroupAvatar={async (targetConversation, file) => {
					await conversationActions.updateAvatar.mutateAsync({
						conversationId: targetConversation.id,
						avatar: file,
					});
				}}
				onChangeBackground={handleChangeBackground}
				onChangeQuickReaction={handleChangeQuickReaction}
			/>

			<Dialog
				open={nicknameOpen}
				onClose={() => setNicknameOpen(false)}
				maxWidth="xs"
				fullWidth
			>
				<DialogTitle>Nickname</DialogTitle>
				<DialogContent sx={{ display: "grid", gap: 1.5, pt: 1 }}>
					{conversation.participants.length > 1 && (
						<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
							{conversation.participants.map((participant) => (
								<Button
									key={participant.id}
									size="small"
									variant={
										nicknameTarget?.id === participant.id
											? "contained"
											: "outlined"
									}
									onClick={() => {
										setNicknameTargetId(participant.id);
										setNicknameValue(
											participant.nickname || participant.fullname || "",
										);
									}}
								>
									{participant.nickname || participant.fullname || "User"}
								</Button>
							))}
						</Box>
					)}
					<TextField
						autoFocus
						label={nicknameTarget?.fullname || "Nickname"}
						value={nicknameValue}
						onChange={(event) => setNicknameValue(event.target.value)}
						fullWidth
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setNicknameOpen(false)}>Hủy</Button>
					<Button
						variant="contained"
						onClick={() => {
							void handleSaveNickname();
						}}
						disabled={!nicknameTarget}
					>
						Lưu
					</Button>
				</DialogActions>
			</Dialog>

			<CreateGroupDialog
				open={createGroupOpen}
				onClose={() => setCreateGroupOpen(false)}
				onCreateGroup={handleCreateGroup}
				loading={creatingGroup}
				preselectedParticipants={otherParticipants}
				currentUserId={Number(currentUserId)}
			/>
		</Paper>
	);
}

export function MiniMessenger() {
	const theme = useTheme();
	const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));
	const [openConversationIds, setOpenConversationIds] = useState<number[]>(
		readStoredOpenConversationIds,
	);
	const [dismissedConversationIds, setDismissedConversationIds] = useState<
		number[]
	>(readStoredDismissedConversationIds);
	const [pinnedRailConversationIds, setPinnedRailConversationIds] = useState<
		number[]
	>(readStoredRailConversationIds);
	const [railCleared, setRailCleared] = useState(readStoredRailCleared);
	const [newMessageOpen, setNewMessageOpen] = useState(false);
	const [creatingConversation, setCreatingConversation] = useState(false);
	const location = useLocation();
	const { data: currentUser } = useCurrentUser();
	const currentUserId = currentUser?.id;
	const { open } = useNotification();
	const { notify: notifyNewMessage } = useNewMessageNotification();
	const conversationsQuery = useMessengerConversations(
		CONVERSATION_FETCH_LIMIT,
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
	const missingConversationIds = useMemo(
		() =>
			Array.from(
				new Set([...openConversationIds, ...pinnedRailConversationIds]),
			).filter(
				(id) => !conversations.some((conversation) => conversation.id === id),
			),
		[conversations, openConversationIds, pinnedRailConversationIds],
	);
	const restoredConversationQueries = useQueries({
		queries: missingConversationIds.map((conversationId) => ({
			queryKey: messengerKeys.conversation(String(conversationId)),
			queryFn: () => getConversation(conversationId),
			staleTime: 30_000,
		})),
	});
	const restoredConversations = useMemo(
		() =>
			restoredConversationQueries
				.map((query) => query.data)
				.filter((conversation): conversation is Conversation =>
					Boolean(conversation),
				),
		[restoredConversationQueries],
	);
	const availableConversations = useMemo(() => {
		const byId = new Map<number, Conversation>();
		for (const conversation of [...conversations, ...restoredConversations]) {
			byId.set(
				conversation.id,
				hydrateConversationParticipantAvatars(conversation, usersForAvatar),
			);
		}
		return Array.from(byId.values());
	}, [conversations, restoredConversations, usersForAvatar]);
	const ws = useMessengerWebSocketConnection();
	const queryClient = useQueryClient();

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem(
			MINI_OPEN_WINDOWS_STORAGE_KEY,
			JSON.stringify(openConversationIds.slice(-MINI_WINDOW_LIMIT)),
		);
	}, [openConversationIds]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem(
			MINI_RAIL_CONVERSATIONS_STORAGE_KEY,
			JSON.stringify(pinnedRailConversationIds),
		);
	}, [pinnedRailConversationIds]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem(
			MINI_DISMISSED_CONVERSATIONS_STORAGE_KEY,
			JSON.stringify(dismissedConversationIds),
		);
	}, [dismissedConversationIds]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem(
			MINI_RAIL_CLEARED_STORAGE_KEY,
			railCleared ? "true" : "false",
		);
	}, [railCleared]);

	const openConversation = useCallback(
		(conversationId: number, keepInRail = false) => {
			setRailCleared(false);
			setDismissedConversationIds((prev) =>
				prev.filter((id) => id !== conversationId),
			);
			setPinnedRailConversationIds((prev) => {
				const without = prev.filter((id) => id !== conversationId);
				return keepInRail ? [...without, conversationId] : without;
			});
			setOpenConversationIds((prev) => {
				const next = [
					...prev.filter((id) => id !== conversationId),
					conversationId,
				];
				return next.slice(-MINI_WINDOW_LIMIT);
			});
		},
		[],
	);

	const minimizeConversation = useCallback((conversationId: number) => {
		setOpenConversationIds((prev) =>
			prev.filter((id) => id !== conversationId),
		);
	}, []);

	const closeConversation = useCallback((conversationId: number) => {
		setOpenConversationIds((prev) =>
			prev.filter((id) => id !== conversationId),
		);
		setPinnedRailConversationIds((prev) =>
			prev.filter((id) => id !== conversationId),
		);
		setDismissedConversationIds((prev) =>
			prev.includes(conversationId) ? prev : [...prev, conversationId],
		);
	}, []);

	const closeAllConversations = useCallback(() => {
		setDismissedConversationIds(
			conversations.map((conversation) => conversation.id),
		);
		setPinnedRailConversationIds([]);
		setOpenConversationIds([]);
		setRailCleared(true);
	}, [conversations]);

	const minimizeAllConversations = useCallback(() => {
		setOpenConversationIds([]);
	}, []);

	const dismissConversation = useCallback((conversationId: number) => {
		setOpenConversationIds((prev) =>
			prev.filter((id) => id !== conversationId),
		);
		setPinnedRailConversationIds((prev) =>
			prev.filter((id) => id !== conversationId),
		);
		setDismissedConversationIds((prev) =>
			prev.includes(conversationId) ? prev : [...prev, conversationId],
		);
	}, []);

	const handleSelectNewMessageUser = useCallback(
		async (user: User) => {
			const participantId = Number(user.id);
			if (!participantId || participantId === Number(currentUserId)) return;

			setCreatingConversation(true);
			try {
				const conversation = await createConversation({
					is_group: false,
					name: "",
					participant_ids: [participantId],
				});

				queryClient.setQueryData<PaginatedResult<Conversation>>(
					messengerKeys.conversations(CONVERSATION_FETCH_LIMIT, 0),
					(old) => {
						if (!old) {
							return {
								items: [conversation],
								total: 1,
								limit: CONVERSATION_FETCH_LIMIT,
								offset: 0,
								hasMore: false,
							};
						}

						const next = [
							conversation,
							...old.items.filter((item) => item.id !== conversation.id),
						].slice(0, CONVERSATION_FETCH_LIMIT);

						return { ...old, items: next };
					},
				);
				openConversation(conversation.id);
			} catch {
				open?.({ type: "error", message: "Không thể mở trò chuyện" });
			} finally {
				setCreatingConversation(false);
			}
		},
		[currentUserId, open, openConversation, queryClient],
	);

	useEffect(() => {
		const handleOpen = (event: Event) => {
			const detail = (event as CustomEvent<MiniMessengerOpenDetail>).detail;
			if (!detail?.conversationId) return;
			openConversation(detail.conversationId, Boolean(detail.keepInRail));
		};
		const handleCloseAll = () => closeAllConversations();

		window.addEventListener(MINI_MESSENGER_OPEN_EVENT, handleOpen);
		window.addEventListener(MINI_MESSENGER_CLOSE_ALL_EVENT, handleCloseAll);

		return () => {
			window.removeEventListener(MINI_MESSENGER_OPEN_EVENT, handleOpen);
			window.removeEventListener(
				MINI_MESSENGER_CLOSE_ALL_EVENT,
				handleCloseAll,
			);
		};
	}, [closeAllConversations, openConversation]);

	useEffect(() => {
		if (!ws) return;

		const handleConnected = () => {
			ws.listConversations({
				requestId: crypto.randomUUID(),
				limit: CONVERSATION_FETCH_LIMIT,
				page: 1,
			});
		};

		const handleConversationsListResult = (data: unknown) => {
			const parsed = parsePaginated(
				data,
				toConversation,
				CONVERSATION_FETCH_LIMIT,
				0,
			);
			queryClient.setQueryData(
				messengerKeys.conversations(CONVERSATION_FETCH_LIMIT, 0),
				parsed,
			);
		};

		const handleMessageCreated = (data: unknown) => {
			const msg = toMessage(data);
			if (!msg.conversation_id) return;

			const messagesKey = messengerKeys.messages(
				String(msg.conversation_id),
				MINI_MESSAGE_LIMIT,
				0,
			);

			queryClient.setQueryData<PaginatedResult<Message>>(messagesKey, (old) => {
				if (!old) return old;
				const messageSeq = msg.message_seq ?? msg.seq;
				const tempMatch = msg.temp_id
					? old.items.find((item) => item.temp_id === msg.temp_id)
					: undefined;
				if (tempMatch) {
					return {
						...old,
						items: old.items.map((item) =>
							item.temp_id === msg.temp_id
								? {
										...item,
										...msg,
										temp_id: item.temp_id,
										pending: false,
										failed: false,
										status: "sent",
										metadata: msg.metadata ?? item.metadata,
									}
								: item,
						),
					};
				}
				const exists = old.items.some(
					(item) =>
						(msg.id > 0 && item.id === msg.id) ||
						(messageSeq != null &&
							(item.message_seq === messageSeq || item.seq === messageSeq)),
				);
				if (exists) {
					return old;
				}

				return {
					...old,
					items: [...old.items, msg].slice(-MINI_MESSAGE_LIMIT),
					total: old.total + 1,
				};
			});

			queryClient.setQueryData<PaginatedResult<Conversation>>(
				messengerKeys.conversations(CONVERSATION_FETCH_LIMIT, 0),
				(old) => {
					if (!old) return old;

					const idx = old.items.findIndex(
						(item) => item.id === msg.conversation_id,
					);
					if (idx === -1) return old;

					const conversation = old.items[idx];
					const isMine = Number(msg.sender_id) === Number(currentUserId);
					const updated: Conversation = {
						...conversation,
						last_message_id: msg.id || conversation.last_message_id,
						last_message_content: msg.content,
						last_message_at: msg.created_at,
						last_message_sender_id: Number(msg.sender_id),
						last_message_type: msg.message_type,
						unread_count: isMine
							? conversation.unread_count
							: (conversation.unread_count ?? 0) + 1,
					};
					const next = [
						updated,
						...old.items.filter((_, index) => index !== idx),
					];

					return {
						...old,
						items: next.slice(0, CONVERSATION_FETCH_LIMIT),
					};
				},
			);
			ws.listConversations({
				requestId: crypto.randomUUID(),
				limit: CONVERSATION_FETCH_LIMIT,
				page: 1,
			});

			if (Number(msg.sender_id) !== Number(currentUserId)) {
				if (!location.pathname.startsWith("/messenger")) {
					const conversation = availableConversations.find(
						(item) => item.id === msg.conversation_id,
					);
					const senderParticipant = conversation?.participants.find(
						(participant) => Number(participant.id) === Number(msg.sender_id),
					);

					notifyNewMessage({
						senderName:
							senderParticipant?.nickname ||
							senderParticipant?.fullname ||
							msg.sender_name,
						conversationName: conversation?.is_group
							? getConversationTitle(conversation, currentUserId)
							: undefined,
						content: getMessagePreviewContent(msg),
						senderAvatar: resolveCdnUrl(senderParticipant?.avatar),
					});
				}

				if (openConversationIds.includes(msg.conversation_id)) return;

				if (openConversationIds.length > 0) {
					setRailCleared(false);
					setDismissedConversationIds((prev) =>
						prev.filter((id) => id !== msg.conversation_id),
					);
					setPinnedRailConversationIds((prev) => [
						msg.conversation_id,
						...prev.filter((id) => id !== msg.conversation_id),
					]);
					return;
				}

				openConversation(msg.conversation_id);
			}
		};

		const updateMessageCache = (
			conversationId: number,
			updater: (message: Message) => Message,
		) => {
			queryClient.setQueryData<PaginatedResult<Message>>(
				messengerKeys.messages(String(conversationId), MINI_MESSAGE_LIMIT, 0),
				(old) =>
					old
						? {
								...old,
								items: old.items.map(updater),
							}
						: old,
			);
		};

		const handleMessageUpdated = (data: unknown) => {
			const event = data as {
				id?: number;
				conversation_id?: number;
				content?: string;
				updated_at?: string;
			};
			if (!event.id || !event.conversation_id) return;

			updateMessageCache(event.conversation_id, (message) =>
				message.id === event.id
					? {
							...message,
							content: event.content ?? message.content,
							updated_at: event.updated_at ?? message.updated_at,
						}
					: message,
			);
		};

		const handleMessageDeleted = (data: unknown) => {
			const event = data as {
				message_id?: number;
				conversation_id?: number;
			};
			if (!event.message_id || !event.conversation_id) return;

			queryClient.setQueryData<PaginatedResult<Message>>(
				messengerKeys.messages(
					String(event.conversation_id),
					MINI_MESSAGE_LIMIT,
					0,
				),
				(old) =>
					old
						? {
								...old,
								items: old.items.filter(
									(message) => message.id !== event.message_id,
								),
								total: Math.max(0, old.total - 1),
							}
						: old,
			);
		};

		const handleReactionUpdated = (data: unknown) => {
			const event = data as {
				message_id?: number;
				conversation_id?: number;
				user_id?: number;
				reaction?: string;
			};
			if (!event.message_id || !event.conversation_id) return;

			const eventUserId = String(event.user_id ?? "");
			const isCurrentUser =
				eventUserId !== "" && eventUserId === String(currentUserId ?? "");

			updateMessageCache(event.conversation_id, (message) => {
				if (message.id !== event.message_id) return message;
				const withoutUser = (message.reactions ?? []).filter(
					(reaction) => String(reaction.user_id) !== eventUserId,
				);

				return {
					...message,
					my_reaction: isCurrentUser
						? (event.reaction ?? null)
						: message.my_reaction,
					reactions: event.reaction
						? [...withoutUser, { user_id: eventUserId, emoji: event.reaction }]
						: withoutUser,
				};
			});
		};

		const handleReactionRemoved = (data: unknown) => {
			const event = data as {
				message_id?: number;
				conversation_id?: number;
				user_id?: number;
			};
			if (!event.message_id || !event.conversation_id) return;

			const eventUserId = String(event.user_id ?? "");
			const isCurrentUser =
				eventUserId !== "" && eventUserId === String(currentUserId ?? "");

			updateMessageCache(event.conversation_id, (message) =>
				message.id === event.message_id
					? {
							...message,
							my_reaction: isCurrentUser ? null : message.my_reaction,
							reactions: (message.reactions ?? []).filter(
								(reaction) => String(reaction.user_id) !== eventUserId,
							),
						}
					: message,
			);
		};

		const handleMessageSeenSeq = (data: {
			user_id: number;
			conversation_id: number;
			last_read_seq: number;
			seen_at?: string;
		}) => {
			if (!data.conversation_id || !data.user_id || !data.last_read_seq) return;

			queryClient.setQueryData<PaginatedResult<Conversation>>(
				messengerKeys.conversations(CONVERSATION_FETCH_LIMIT, 0),
				(old) =>
					old
						? {
								...old,
								items: old.items.map((conversation) =>
									conversation.id === data.conversation_id
										? {
												...conversation,
												participants: conversation.participants.map(
													(participant) =>
														participant.id === Number(data.user_id)
															? {
																	...participant,
																	last_read_seq: Math.max(
																		participant.last_read_seq ?? 0,
																		data.last_read_seq,
																	),
																	last_read_at:
																		data.seen_at ||
																		participant.last_read_at ||
																		new Date().toISOString(),
																}
															: participant,
												),
											}
										: conversation,
								),
							}
						: old,
			);
		};

		const handlers = {
			onConnected: handleConnected,
			onConversationsListResult: handleConversationsListResult,
			onMessageCreated: handleMessageCreated,
			onMessageUpdated: handleMessageUpdated,
			onMessageDeleted: handleMessageDeleted,
			onReactionUpdated: handleReactionUpdated,
			onReactionRemoved: handleReactionRemoved,
			onMessageSeenSeq: handleMessageSeenSeq,
		};

		ws.addHandlers(handlers);
		if (ws.isConnected()) handleConnected();

		return () => ws.removeHandlers(handlers);
	}, [
		availableConversations,
		currentUserId,
		location.pathname,
		notifyNewMessage,
		openConversation,
		openConversationIds,
		queryClient,
		ws,
	]);

	const visibleWindowIds = openConversationIds.slice(-MINI_WINDOW_LIMIT);
	const windowConversations = visibleWindowIds
		.map((id) =>
			availableConversations.find((conversation) => conversation.id === id),
		)
		.filter((conversation): conversation is Conversation =>
			Boolean(conversation),
		);
	const visibleRailConversations = railCleared
		? []
		: pinnedRailConversationIds
				.map((id) =>
					availableConversations.find((conversation) => conversation.id === id),
				)
				.filter(
					(conversation): conversation is Conversation =>
						conversation !== undefined &&
						!dismissedConversationIds.includes(conversation.id),
				);
	const railConversations = visibleRailConversations.slice(
		0,
		CONVERSATION_DISPLAY_LIMIT,
	);
	const railConversationTotal = visibleRailConversations.length;

	if (
		!currentUserId ||
		isSmallScreen ||
		location.pathname.startsWith("/messenger")
	) {
		return null;
	}

	return (
		<>
			<Box
				sx={{
					position: "fixed",
					right: 96,
					bottom: 24,
					zIndex: (muiTheme) => muiTheme.zIndex.modal - 1,
					display: "flex",
					flexDirection: "row-reverse",
					alignItems: "flex-end",
					gap: 1.25,
					pointerEvents: "none",
					"& > *": { pointerEvents: "auto" },
				}}
			>
				{windowConversations.map((conversation) => (
					<MiniChatWindow
						key={conversation.id}
						conversation={conversation}
						currentUserId={currentUserId}
						onClose={closeConversation}
						onMinimize={minimizeConversation}
					/>
				))}
			</Box>

			<MiniConversationRail
				conversations={railConversations}
				currentUserId={currentUserId}
				total={railConversationTotal}
				openIds={openConversationIds}
				onOpen={openConversation}
				onDismiss={dismissConversation}
				onCloseAll={closeAllConversations}
				onMinimizeAll={minimizeAllConversations}
				onOpenNewMessage={() => setNewMessageOpen(true)}
			/>
			<UserSearchDialog
				open={newMessageOpen}
				onClose={() => setNewMessageOpen(false)}
				onSelect={(user) => {
					void handleSelectNewMessageUser(user);
				}}
				loading={creatingConversation}
				title="New message"
			/>
		</>
	);
}
