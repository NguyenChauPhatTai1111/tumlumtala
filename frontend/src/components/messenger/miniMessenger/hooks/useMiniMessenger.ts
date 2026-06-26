import { useCurrentUser } from "@hooks/common/useCurrentUser";
import { useNotification } from "@hooks/common/useNotification";
import { messengerKeys } from "@hooks/keys/messengerKeys";
import {
	useMessengerConversations,
	useNewMessageNotification,
} from "@hooks/messenger";
import { useSharedMessengerWS } from "@/context/MessengerWebSocketContext";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { listUsers } from "@/api/userApi";
import {
	createConversation,
	getConversation,
	parsePaginated,
	toConversation,
	toMessage,
} from "@/services/messengerService";
import type { Conversation, Message, PaginatedResult, User } from "@/types/messenger";
import { resolveCdnUrl } from "@/utils/urlUtils";
import {
	MINI_MESSENGER_CLOSE_ALL_EVENT,
	MINI_MESSENGER_CLOSE_EVENT,
	MINI_MESSENGER_OPEN_EVENT,
	MINI_MESSENGER_TOGGLE_EVENT,
	type MiniMessengerCloseDetail,
	type MiniMessengerOpenDetail,
	type MiniMessengerToggleDetail,
} from "../../miniMessengerEvents";
import { hydrateConversationParticipantAvatars } from "../../utils/avatarHydration";
import { getConversationTitle, getMessagePreviewContent } from "../utils";

const CONVERSATION_FETCH_LIMIT = 10;
const MINI_MESSAGE_LIMIT = 30;
const MINI_WINDOW_LIMIT = 2;

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

function getHttpStatus(error: unknown) {
	return axios.isAxiosError(error) ? error.response?.status : undefined;
}

export function useMiniMessenger() {
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
	const [activeConversationId, setActiveConversationId] = useState<
		number | null
	>(null);

	const location = useLocation();
	const { data: currentUser } = useCurrentUser();
	const currentUserId = currentUser?.id;
	const { open } = useNotification();
	const { notify: notifyNewMessage } = useNewMessageNotification();
	const queryClient = useQueryClient();
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
				retry: (failureCount: number, error: unknown) => {
					const status = getHttpStatus(error);
					if (status === 403 || status === 404) return false;
					return failureCount < 1;
				},
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
	useEffect(() => {
		const unavailableIds = missingConversationIds.filter(
			(conversationId, index) => {
				const query = restoredConversationQueries[index];
				const status = getHttpStatus(query?.error);
				return query?.isError && (status === 403 || status === 404);
			},
		);
		if (unavailableIds.length === 0) return;

		const unavailable = new Set(unavailableIds);
		setOpenConversationIds((prev) => prev.filter((id) => !unavailable.has(id)));
		setPinnedRailConversationIds((prev) =>
			prev.filter((id) => !unavailable.has(id)),
		);
		setDismissedConversationIds((prev) =>
			prev.filter((id) => !unavailable.has(id)),
		);
		setActiveConversationId((prev) =>
			prev !== null && unavailable.has(prev) ? null : prev,
		);
		for (const conversationId of unavailableIds) {
			queryClient.removeQueries({
				queryKey: messengerKeys.conversation(String(conversationId)),
			});
		}
	}, [missingConversationIds, queryClient, restoredConversationQueries]);
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

	const ws = useSharedMessengerWS();

	// Persist state to localStorage
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

	// Custom event listeners (open/close/toggle from external sources)
	useEffect(() => {
		const handleOpen = (event: Event) => {
			const detail = (event as CustomEvent<MiniMessengerOpenDetail>).detail;
			if (!detail?.conversationId) return;
			openConversation(detail.conversationId, Boolean(detail.keepInRail));
			setActiveConversationId(detail.conversationId);
		};
		const handleClose = (event: Event) => {
			const detail = (event as CustomEvent<MiniMessengerCloseDetail>).detail;
			if (!detail?.conversationId) return;
			closeConversation(detail.conversationId);
			setActiveConversationId((prev) =>
				prev === detail.conversationId ? null : prev,
			);
		};
		const handleToggle = (event: Event) => {
			const detail = (event as CustomEvent<MiniMessengerToggleDetail>).detail;
			if (!detail?.conversationId) return;
			const currentIds = readStoredOpenConversationIds();
			if (currentIds.includes(detail.conversationId)) {
				closeConversation(detail.conversationId);
				setActiveConversationId((active) =>
					active === detail.conversationId ? null : active,
				);
			} else {
				openConversation(detail.conversationId, Boolean(detail.keepInRail));
				setActiveConversationId(detail.conversationId);
			}
		};
		const handleCloseAll = () => closeAllConversations();

		window.addEventListener(MINI_MESSENGER_OPEN_EVENT, handleOpen);
		window.addEventListener(MINI_MESSENGER_CLOSE_EVENT, handleClose);
		window.addEventListener(MINI_MESSENGER_TOGGLE_EVENT, handleToggle);
		window.addEventListener(MINI_MESSENGER_CLOSE_ALL_EVENT, handleCloseAll);

		return () => {
			window.removeEventListener(MINI_MESSENGER_OPEN_EVENT, handleOpen);
			window.removeEventListener(MINI_MESSENGER_CLOSE_EVENT, handleClose);
			window.removeEventListener(MINI_MESSENGER_TOGGLE_EVENT, handleToggle);
			window.removeEventListener(
				MINI_MESSENGER_CLOSE_ALL_EVENT,
				handleCloseAll,
			);
		};
	}, [closeAllConversations, closeConversation, openConversation]);

	// Escape key closes active conversation
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || !activeConversationId) return;
			closeConversation(activeConversationId);
			setActiveConversationId(null);
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [activeConversationId, closeConversation]);

	// WebSocket handlers
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

			queryClient.setQueryData<PaginatedResult<Message>>(
				messagesKey,
				(old) => {
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
								(item.message_seq === messageSeq ||
									item.seq === messageSeq)),
					);
					if (exists) {
						return old;
					}

					return {
						...old,
						items: [...old.items, msg].slice(-MINI_MESSAGE_LIMIT),
						total: old.total + 1,
					};
				},
			);

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
						(participant) =>
							Number(participant.id) === Number(msg.sender_id),
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
				messengerKeys.messages(
					String(conversationId),
					MINI_MESSAGE_LIMIT,
					0,
				),
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
						? [
								...withoutUser,
								{ user_id: eventUserId, emoji: event.reaction },
							]
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
			if (!data.conversation_id || !data.user_id || !data.last_read_seq)
				return;

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
					availableConversations.find(
						(conversation) => conversation.id === id,
					),
				)
				.filter(
					(conversation): conversation is Conversation =>
						conversation !== undefined &&
						!dismissedConversationIds.includes(conversation.id),
				);
	const railConversations = visibleRailConversations.slice(
		0,
		5, // CONVERSATION_DISPLAY_LIMIT
	);
	const railConversationTotal = visibleRailConversations.length;

	return {
		currentUserId,
		windowConversations,
		railConversations,
		railConversationTotal,
		openConversationIds,
		activeConversationId,
		setActiveConversationId,
		newMessageOpen,
		setNewMessageOpen,
		creatingConversation,
		location,
		isSmallScreen: false, // resolved in component using useMediaQuery
		openConversation,
		minimizeConversation,
		closeConversation,
		closeAllConversations,
		minimizeAllConversations,
		dismissConversation,
		handleSelectNewMessageUser,
	};
}
