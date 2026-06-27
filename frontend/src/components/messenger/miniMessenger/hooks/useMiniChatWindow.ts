import { toRenderableChatBackground } from "@components/messenger/utils/background";
import { parseConversationThemeConfig } from "@components/messenger/utils/theme";
import {
	DEFAULT_INCOMING_BUBBLE_COLOR,
	DEFAULT_OUTGOING_BUBBLE_COLOR,
} from "@constants/messenger";
import { useNotification } from "@hooks/common/useNotification";
import { messengerKeys } from "@hooks/keys/messengerKeys";
import {
	useMessengerConversationActions,
	useMessengerMessageActions,
	useMessengerMessages,
} from "@hooks/messenger";
import { useSharedMessengerWS } from "@/context/MessengerWebSocketContext";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	createConversation,
	getMessages,
	sendMessage,
	setQuickReaction,
	uploadMessageAttachment,
} from "@/services/messengerService";
import { getActiveThemes } from "@/services/themeService";
import type {
	Conversation,
	Message,
	PaginatedResult,
	SendMessagePayloadItem,
} from "@/types/messenger";
import { getMessageSenderName } from "../utils";

const CONVERSATION_FETCH_LIMIT = 10;
const MINI_MESSAGE_LIMIT = 30;
const MAX_FILE_SIZE_MB = 100;
const SPAM_INTERVAL_MS = 1000;
const REACTION_SPAM_INTERVAL_MS = 300;

export function getMiniConversationTheme(conversation: Conversation) {
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

export function useMiniChatWindow({
	conversation,
	currentUserId,
	onClose,
}: {
	conversation: Conversation;
	currentUserId?: number | string;
	onClose: (conversationId: number) => void;
}) {
	const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
	const [replyingMessage, setReplyingMessage] = useState<Message | null>(null);
	const [actionsAnchor, setActionsAnchor] = useState<HTMLElement | null>(null);
	const [customizeOpen, setCustomizeOpen] = useState(false);
	const [nicknameOpen, setNicknameOpen] = useState(false);
	const [nicknameTargetId, setNicknameTargetId] = useState<number | null>(null);
	const [nicknameValue, setNicknameValue] = useState("");
	const [createGroupOpen, setCreateGroupOpen] = useState(false);
	const [confirmAction, setConfirmAction] = useState<"delete" | "leave" | null>(null);
	const [creatingGroup, setCreatingGroup] = useState(false);

	// Spam detection: track timestamp of last sent message and last reaction
	const lastSentAtRef = useRef<number>(0);
	const lastReactionAtRef = useRef<number>(0);

	const queryClient = useQueryClient();
	const { open } = useNotification();
	const navigate = useNavigate();
	const ws = useSharedMessengerWS();
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
			// Spam detection: block if sent less than SPAM_INTERVAL_MS ago
			const now = Date.now();
			if (now - lastSentAtRef.current < SPAM_INTERVAL_MS) {
				open?.({
					type: "error",
					message: "Bạn đang gửi tin nhắn quá nhanh. Vui lòng chờ một chút.",
				});
				return false;
			}

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

			// Mark timestamp after passing spam check, before async work
			lastSentAtRef.current = now;

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

			const now = Date.now();
			if (now - lastReactionAtRef.current < REACTION_SPAM_INTERVAL_MS) {
				open?.({
					type: "error",
					message: "Bạn đang thả cảm xúc quá nhanh. Vui lòng chờ một chút.",
				});
				return;
			}
			lastReactionAtRef.current = now;

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

	const handleDeleteConversation = () => {
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

	const handleLeaveConversation = () => {
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

	const handleNavigateToMessenger = () => {
		navigate(`/messenger?conversationId=${conversation.id}`);
	};

	const handleRename = async (
		targetConversation: Conversation,
		name: string,
	) => {
		await conversationActions.rename.mutateAsync({
			conversationId: targetConversation.id,
			name,
		});
		patchConversationCache((item) => ({ ...item, name }));
	};

	const handleChangeGroupAvatar = async (
		targetConversation: Conversation,
		file: File,
	) => {
		await conversationActions.updateAvatar.mutateAsync({
			conversationId: targetConversation.id,
			avatar: file,
		});
	};

	return {
		// State
		loadingOlderMessages,
		replyingMessage,
		setReplyingMessage,
		actionsAnchor,
		setActionsAnchor,
		customizeOpen,
		setCustomizeOpen,
		nicknameOpen,
		setNicknameOpen,
		nicknameTargetId,
		setNicknameTargetId,
		nicknameValue,
		setNicknameValue,
		createGroupOpen,
		setCreateGroupOpen,
		confirmAction,
		setConfirmAction,
		creatingGroup,
		// Derived
		messages,
		miniTheme,
		replySenderName,
		otherParticipants,
		nicknameTarget,
		messagesQuery,
		themesQuery,
		ws,
		// Handlers
		loadOlderMessages,
		handleSend,
		handleToggleReaction,
		handleRetryMessage,
		handleSaveNickname,
		handleCreateGroup,
		handleArchiveConversation,
		handleDeleteConversation,
		handleConfirmAction,
		handleLeaveConversation,
		handleChangeBackground,
		handleChangeQuickReaction,
		handleNavigateToMessenger,
		handleRename,
		handleChangeGroupAvatar,
		patchConversationCache,
		closeActionsMenu: () => setActionsAnchor(null),
	};
}
