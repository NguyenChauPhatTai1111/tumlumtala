import { CreateGroupDialog, UserSearchDialog } from "@components/messenger";
import type {
	FilePreview,
	ImagePreview,
	VideoPreview,
} from "@components/messenger/composer/types";
import {
	buildGradientFromStops,
	isImageBackgroundValue,
	toRenderableChatBackground,
} from "@components/messenger/utils/background";
import type { ConversationThemeConfig } from "@components/messenger/utils/theme";
import { parseConversationThemeConfig } from "@components/messenger/utils/theme";
import {
	DEFAULT_BACKGROUND_COLOR,
	DEFAULT_INCOMING_BUBBLE_COLOR,
	DEFAULT_INCOMING_TEXT_COLOR,
	DEFAULT_OUTGOING_BUBBLE_COLOR,
	DEFAULT_OUTGOING_TEXT_COLOR,
	MESSAGE_PAGE_SIZE,
} from "@constants/messenger";
import { useConfirm } from "@hooks/common";
import { useCurrentUser } from "@hooks/common/useCurrentUser";
import { useNotification } from "@hooks/common/useNotification";
import { messengerKeys } from "@hooks/keys/messengerKeys";
import {
	useConversationUnread,
	useCreateMessengerConversation,
	useMessengerConversationActions,
	useMessengerConversations,
	useMessengerMessageActions,
	useMessengerMessages,
	useMessengerSearch,
	useMessengerSendMessage,
	useNewMessageNotification,
	useSendMessengerMessage,
} from "@hooks/messenger";
import { usePresence } from "@hooks/messenger/usePresence";
import { getConversations } from "@/services/messengerService";
import { Box, useTheme } from "@mui/material";
import { MessengerContent } from "@pages/messenger/components/MessengerContent";
import { MessengerSidebar } from "@pages/messenger/components/MessengerSidebar";
import { MessengerDialogs } from "@pages/messenger/dialogs/MessengerDialogs";
import { useMessengerPageState } from "@pages/messenger/hooks";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ChangeEvent, ReactNode, SyntheticEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useShowMessageToast } from "@/context/MessageToastContext";
import { MessengerEmojiProvider } from "@/context/MessengerEmojiContext";
import { useSharedMessengerWS } from "@/context/MessengerWebSocketContext";
import { useMobileVisualViewport } from "@/hooks/ui/useMobileVisualViewport";
import {
	getMessages,
	parsePaginated,
	searchConversationMessages,
	toActivityMessage,
	toConversation,
	toMessage,
} from "@/services/messengerService";
import { getActiveThemes } from "@/services/themeService";
import { speakText } from "@/services/ttsService";
import type { IUser } from "@/types";
import type {
	Conversation,
	Message,
	PaginatedResult,
	Participant,
	User,
} from "@/types/messenger";

export default function MessengerPage() {
	const { open } = useNotification();
	const { data: currentUser } = useCurrentUser();
	const currentUserId = currentUser?.id;
	const theme = useTheme();
	const confirm = useConfirm();
	const showToast = useShowMessageToast();
	const { notify: notifyNewMessage } = useNewMessageNotification();
	const {
		// theme/responsive
		isMobile,

		// selection + thread
		selectedConversationId,
		setSelectedConversationId,
		justCreatedConversation,
		setJustCreatedConversation,
		pendingEmptyConversationId,
		setPendingEmptyConversationId,
		replyingMessage,
		setReplyingMessage,
		editingMessage,
		setEditingMessage,

		// UI flags / dialogs
		openUserSearch,
		setOpenUserSearch,
		openAddMembersSearch,
		setOpenAddMembersSearch,
		openCreateGroupDialog,
		setOpenCreateGroupDialog,
		createGroupPreselectedParticipants,
		setCreateGroupPreselectedParticipants,
		showConversationList,
		setShowConversationList,
		showInfoPanel,
		setShowInfoPanel,
		conversationTab,
		setConversationTab,
		inputDialog,
		setInputDialog,
		confirmDialog,
		setConfirmDialog,

		// messages / search
		searchedMessages,
		setSearchedMessages,
		setSearchKeyword,
		scrollToMessageId,
		setScrollToMessageId,
		olderMessages,
		setOlderMessages,
		pendingMessages,
		setPendingMessages,
		hasMoreOlderMessages,
		setHasMoreOlderMessages,
		isLoadingMoreMessages,
		setIsLoadingMoreMessages,

		// background / preview
		setSelectedImageFile,
		themePresetId,
		setThemePresetId,
		setBackgroundColor,
		backgroundGradientAngle,
		backgroundGradientStops,
		incomingBubbleColor,
		setIncomingBubbleColor,
		outgoingBubbleColor,
		setOutgoingBubbleColor,
		setIncomingTextColor,
		setOutgoingTextColor,
		selectedImagePreview,

		// other state & refs
		conversationThemeOverrides,
		setConversationThemeOverrides,
		avatarUploadConversationId,
		setAvatarUploadConversationId,
		openingUnreadSnapshot,
		setOpeningUnreadSnapshot,
		conversationDrafts,
		setConversationDrafts,
		isSidebarCollapsed,
		setIsSidebarCollapsed,
		unreadSearchDoneRef,
		groupAvatarInputRef,
		shouldRestoreConversationListAfterPanelRef,
		shouldRestoreSidebarCollapsedAfterPanelRef,
		sidebarCollapsedBeforePanelRef,
		showConversationListRef,
		lastAutoReadMessageByConversationRef,
		loadMoreInFlightRef,
		nextOlderOffsetRef,
		unreadCursorSignatureRef,
		resetConversationThreadState,
		resetResponsiveConversationState,
		clearJustCreatedConversation,
	} = useMessengerPageState();

	type ConversationDraft = {
		text: string;
		images: ImagePreview[];
		videos: VideoPreview[];
		files: FilePreview[];
	};

	const {
		keyword: searchAllKeyword,
		setKeyword: setSearchAllKeyword,
		globalResults: searchAllResults,
		setGlobalResults: setSearchAllResults,
		userResults: searchAllUserResults,
		setUserResults: setSearchAllUserResults,
		loading: searchAllLoading,
		active: searchAllActive,
		setActive: setSearchAllActive,
		detailConversationId: searchDetailConversationId,
		setDetailConversationId: setSearchDetailConversationId,
		detailResults: searchDetailResults,
		setDetailResults: setSearchDetailResults,
		detailLoading: searchDetailLoading,
		detailHasMore: hasMoreSearchDetail,
		detailSource: searchDetailSource,
		setDetailSource: setSearchDetailSource,
		clear: resetSearchResults,
		loadConversationDetail: loadConversationSearchDetails,
		loadMoreConversationDetail: loadMoreConversationSearchDetails,
	} = useMessengerSearch();

	// theme and isMobile come from useMessengerPageState

	const conversationsQuery = useMessengerConversations(20);
	const themesQuery = useQuery({
		queryKey: ["themes", "active"],
		queryFn: getActiveThemes,
	});
	const createConversation = useCreateMessengerConversation();
	const sendMessageMutation = useSendMessengerMessage();
	const actions = useMessengerConversationActions();
	const markReadAction = actions.markRead;
	const patchParticipantSeenSeq = actions.patchParticipantSeenSeq;
	const messageActions = useMessengerMessageActions(
		selectedConversationId ?? undefined,
	);
	const ws = useSharedMessengerWS();
	const onlineUserIds = usePresence(ws);
	const queryClient = useQueryClient();
	const selectedConversationIdRef = useRef<number | null>(null);
	const mobileViewport = useMobileVisualViewport(isMobile);

	const setConversationDraft = useCallback(
		(
			conversationId: number | null,
			draft: {
				text: string;
				images: ImagePreview[];
				videos?: VideoPreview[];
				files?: FilePreview[];
			},
		) => {
			if (!conversationId) {
				return;
			}

			setConversationDrafts((prev) => {
				const existingDraft = prev[conversationId];
				const text = draft.text;
				const images = draft.images;
				const videos = draft.videos ?? [];
				const files = draft.files ?? [];

				if (
					!text.trim() &&
					images.length === 0 &&
					videos.length === 0 &&
					files.length === 0
				) {
					if (!existingDraft) {
						return prev;
					}
					const next = { ...prev };
					delete next[conversationId];
					return next;
				}

				const areImagesEqual =
					existingDraft?.images?.length === images.length &&
					existingDraft?.images?.every(
						(image, index) =>
							image.preview === images[index]?.preview &&
							image.file === images[index]?.file,
					);

				const areVideosEqual =
					existingDraft?.videos?.length === videos.length &&
					existingDraft?.videos?.every(
						(v, i) => v.preview === videos[i]?.preview,
					);

				const areFilesEqual =
					existingDraft?.files?.length === files.length &&
					existingDraft?.files?.every((f, i) => f.name === files[i]?.name);

				if (
					existingDraft?.text === text &&
					areImagesEqual &&
					areVideosEqual &&
					areFilesEqual
				) {
					return prev;
				}

				return { ...prev, [conversationId]: { text, images, videos, files } };
			});
		},
		[setConversationDrafts],
	);

	const handleDraftChange = useCallback(
		(draft: {
			text: string;
			images: ImagePreview[];
			videos?: VideoPreview[];
			files?: FilePreview[];
		}) => {
			if (selectedConversationId !== null) {
				setConversationDraft(selectedConversationId, draft);
			}
		},
		[selectedConversationId, setConversationDraft],
	);

	const { sendMessage, retryMessage } = useMessengerSendMessage({
		selectedConversationId,
		currentUserId: currentUser?.id,
		replyingMessage,
		editingMessage,
		sendMessageMutation,
		messageActions,
		pendingEmptyConversationId,
		setPendingMessages,
		setEditingMessage,
		setReplyingMessage,
		setPendingEmptyConversationId,
		open,
	});

	const PAGE_SIZE = 20;
	const [extraConversations, setExtraConversations] = useState<Conversation[]>(
		[],
	);
	const [hasMoreConversations, setHasMoreConversations] = useState(true);
	const [loadingMoreConversations, setLoadingMoreConversations] = useState(false);
	const loadMoreConversationsInFlight = useRef(false);
	// Track offset via ref — independent of React Query cache size (WS may grow cache)
	const conversationsOffsetRef = useRef(0);
	const conversationsHasMoreRef = useRef(true);
	const baseConversationsRef = useRef<Conversation[]>([]);
	const loadedConversationIdsRef = useRef<Set<number>>(new Set());

	useEffect(() => {
		if (conversationsQuery.data) {
			// Page 1 can be refreshed by WS; keep already appended pages unless
			// an appended item moved into the refreshed first page.
			const pageOneItems = conversationsQuery.data.items;
			const pageOneIds = new Set(pageOneItems.map((c) => c.id));
			baseConversationsRef.current = pageOneItems;
			conversationsHasMoreRef.current = conversationsQuery.data.hasMore;
			setExtraConversations((prev) => {
				const next = prev.filter((c) => !pageOneIds.has(c.id));
				conversationsOffsetRef.current = Math.max(
					conversationsOffsetRef.current,
					pageOneItems.length + next.length,
				);
				return next.length === prev.length ? prev : next;
			});
		}
	}, [conversationsQuery.data]);

	const conversations = useMemo(() => {
		const base = conversationsQuery.data?.items ?? [];
		const baseIds = new Set(base.map((c) => c.id));
		const extras = extraConversations.filter((c) => !baseIds.has(c.id));
		return [...base, ...extras];
	}, [conversationsQuery.data?.items, extraConversations]);

	useEffect(() => {
		loadedConversationIdsRef.current = new Set(conversations.map((c) => c.id));
	}, [conversations]);

	const handleLoadMoreConversations = useCallback(async () => {
		if (loadMoreConversationsInFlight.current) return;
		if (!conversationsHasMoreRef.current) return;
		loadMoreConversationsInFlight.current = true;
		setLoadingMoreConversations(true);
		try {
			const currentOffset = conversationsOffsetRef.current;
			const result = await getConversations({
				limit: PAGE_SIZE,
				offset: currentOffset,
			});
			conversationsOffsetRef.current = currentOffset + result.items.length;
			conversationsHasMoreRef.current = result.hasMore;
			setHasMoreConversations(result.hasMore);
			if (result.items.length > 0) {
				const existingIds = loadedConversationIdsRef.current;
				const newItemCount = result.items.filter(
					(item) => !existingIds.has(item.id),
				).length;
				if (newItemCount === 0) {
					conversationsHasMoreRef.current = false;
					setHasMoreConversations(false);
					return;
				}
				setExtraConversations((prev) => {
					const baseIds = new Set(baseConversationsRef.current.map((c) => c.id));
					const next = [...prev];
					for (const item of result.items) {
						if (baseIds.has(item.id)) continue;
						const existingIndex = next.findIndex((c) => c.id === item.id);
						if (existingIndex >= 0) {
							next[existingIndex] = { ...next[existingIndex], ...item };
						} else {
							next.push(item);
						}
					}
					return next;
				});
			}
		} finally {
			loadMoreConversationsInFlight.current = false;
			setLoadingMoreConversations(false);
		}
	}, []);

	const [searchParams, setSearchParams] = useSearchParams();
	useEffect(() => {
		const paramId = Number(searchParams.get("conversationId"));
		if (!paramId || conversations.length === 0) return;
		const found = conversations.find((c) => c.id === paramId);
		if (!found) return;
		setSelectedConversationId(found.id);
		if (isMobile) {
			setShowConversationList(false);
		}
		setSearchParams((prev) => {
			prev.delete("conversationId");
			return prev;
		}, { replace: true });
	}, [searchParams, conversations, isMobile, setSelectedConversationId, setShowConversationList, setSearchParams]);

	const conversationsWithDrafts = useMemo(
		() =>
			conversations.map((conversation) => ({
				...conversation,
				draftText: conversationDrafts[conversation.id]?.text,
				draftImageCount:
					conversationDrafts[conversation.id]?.images.length ?? 0,
				draftVideoCount:
					conversationDrafts[conversation.id]?.videos?.length ?? 0,
				draftFileCount: conversationDrafts[conversation.id]?.files?.length ?? 0,
				hasSending: pendingMessages.some(
					(m) => m.conversation_id === conversation.id && m.pending === true,
				),
			})),
		[conversations, conversationDrafts, pendingMessages],
	);

	const emptyDraft = useMemo(
		() => ({
			text: "",
			images: [] as ImagePreview[],
			videos: [] as VideoPreview[],
			files: [] as FilePreview[],
		}),
		[],
	);

	const currentDraft = (
		selectedConversationId
			? (conversationDrafts[selectedConversationId] ?? emptyDraft)
			: emptyDraft
	) as ConversationDraft;

	const isConversationVisible = useCallback(
		(conversation: Conversation) =>
			conversation.is_group ||
			(conversation.last_message_content ?? "").trim().length > 0,
		[],
	);

	const activeConversations = useMemo(
		() =>
			conversationsWithDrafts.filter(
				(item) => !item.is_archived && isConversationVisible(item),
			),
		[conversationsWithDrafts, isConversationVisible],
	);
	const archivedConversations = useMemo(
		() =>
			conversationsWithDrafts.filter(
				(item) => item.is_archived && isConversationVisible(item),
			),
		[conversationsWithDrafts, isConversationVisible],
	);

	const unreadConversations = useMemo(
		() =>
			conversationsWithDrafts.filter(
				(item) =>
					!item.is_archived &&
					isConversationVisible(item) &&
					Number(item.unread_count) > 0,
			),
		[conversationsWithDrafts, isConversationVisible],
	);
	const visibleConversations =
		conversationTab === "active"
			? activeConversations
			: conversationTab === "unread"
				? unreadConversations
				: archivedConversations;
	const isNotificationsEnabled = useCallback(
		(conversation?: Conversation) =>
			conversation?.notifications_enabled ?? false,
		[],
	);

	const selectedConversation = useMemo(() => {
		if (!selectedConversationId) {
			return undefined;
		}

		const foundConversation = conversationsWithDrafts.find(
			(item) => item.id === selectedConversationId,
		);
		if (foundConversation) {
			return foundConversation;
		}

		if (justCreatedConversation?.id === selectedConversationId) {
			return justCreatedConversation;
		}

		return undefined;
	}, [
		selectedConversationId,
		justCreatedConversation,
		conversationsWithDrafts,
	]);

	const selectedConversationTheme = useMemo(() => {
		if (!selectedConversation) {
			return {
				background: undefined as string | undefined,
				backgroundColor: undefined as string | undefined,
				incomingBubbleColor: undefined as string | undefined,
				outgoingBubbleColor: undefined as string | undefined,
				incomingTextColor: undefined as string | undefined,
				outgoingTextColor: undefined as string | undefined,
				presetId: "",
				themeUrl: undefined as string | undefined,
			};
		}

		const parsed = parseConversationThemeConfig(
			selectedConversation.background,
		);
		const themeData = selectedConversation.theme;
		const persisted = {
			background:
				selectedConversation.theme_url ||
				themeData?.background ||
				parsed.background ||
				selectedConversation.background,
			themeUrl: selectedConversation.theme_url,
			backgroundColor:
				themeData?.background_color ||
				parsed.backgroundColor ||
				selectedConversation.background_color,
			incomingBubbleColor:
				themeData?.incoming_bubble_color ||
				parsed.incomingBubbleColor ||
				selectedConversation.incoming_bubble_color,
			outgoingBubbleColor:
				themeData?.outgoing_bubble_color ||
				(parsed.outgoingBubbleColor ??
					selectedConversation.outgoing_bubble_color),
			incomingTextColor:
				themeData?.incoming_text_color ||
				selectedConversation.incoming_text_color,
			outgoingTextColor:
				themeData?.outgoing_text_color ||
				selectedConversation.outgoing_text_color,
			presetId: themeData?.preset_id || parsed.presetId,
			themeId: selectedConversation.theme_id ?? themeData?.id,
		};
		const override = conversationThemeOverrides[selectedConversation.id] ?? {};
		const merged = { ...persisted, ...override };

		const hasTheme = Boolean(merged.background || merged.backgroundColor);

		return {
			background: merged.background || undefined,
			themeUrl: merged.themeUrl,
			backgroundColor: hasTheme
				? merged.backgroundColor || undefined
				: undefined,
			incomingBubbleColor: hasTheme
				? merged.incomingBubbleColor || DEFAULT_INCOMING_BUBBLE_COLOR
				: undefined,
			outgoingBubbleColor: hasTheme
				? merged.outgoingBubbleColor || DEFAULT_OUTGOING_BUBBLE_COLOR
				: undefined,
			incomingTextColor:
				merged.incomingTextColor ??
				(theme.palette.mode === "dark" ? "#f8fafc" : "#1e293b"),
			outgoingTextColor:
				merged.outgoingTextColor ??
				(theme.palette.mode === "dark" ? "#ffffff" : "#ffffff"),
			presetId: merged.presetId || "",
			themeId: merged.themeId,
		};
	}, [selectedConversation, conversationThemeOverrides, theme.palette.mode]);

	const replySenderName = useMemo(() => {
		if (!replyingMessage || !selectedConversation) {
			return "";
		}

		const senderId = Number(replyingMessage.sender_id);
		if (Number(currentUser?.id) === senderId) {
			return currentUser?.fullname || "Bạn";
		}

		const participant = selectedConversation.participants.find(
			(item) => item.id === senderId,
		);
		return participant?.nickname || participant?.fullname || "Người dùng";
	}, [
		replyingMessage,
		selectedConversation,
		currentUser?.id,
		currentUser?.fullname,
	]);

	const messagesQuery = useMessengerMessages(
		selectedConversationId ?? undefined,
		MESSAGE_PAGE_SIZE,
		0,
	);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			resetConversationThreadState();
		}, 0);

		return () => window.clearTimeout(timeoutId);
	}, [resetConversationThreadState]);

	useEffect(() => {
		if (!selectedConversationId) {
			return;
		}

		const currentUserParticipant = selectedConversation?.participants.find(
			(p) => p.id === Number(currentUser?.id),
		);
		const lastReadSeq = currentUserParticipant?.last_read_seq;

		const signature = `${selectedConversationId}:${lastReadSeq ?? "none"}:${selectedConversation?.unread_count ?? 0}`;
		if (unreadCursorSignatureRef.current === signature) {
			return;
		}

		unreadCursorSignatureRef.current = signature;
		unreadSearchDoneRef.current = false;
	}, [
		selectedConversationId,
		selectedConversation?.participants,
		selectedConversation?.unread_count,
		currentUser?.id,
		unreadCursorSignatureRef,
		unreadSearchDoneRef,
	]);

	useEffect(() => {
		if (olderMessages.length > 0) {
			return;
		}

		const latestCount = messagesQuery.data?.items?.length ?? 0;
		if (latestCount > 0) {
			nextOlderOffsetRef.current = latestCount;
		}
	}, [
		messagesQuery.data?.items?.length,
		olderMessages.length,
		nextOlderOffsetRef,
	]);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			if (searchedMessages || olderMessages.length > 0) {
				return;
			}

			const latestCount = messagesQuery.data?.items?.length ?? 0;
			resetSearchResults();
			if (latestCount > 0 && latestCount < MESSAGE_PAGE_SIZE) {
				return;
			}

			setHasMoreOlderMessages(true);
		}, 0);

		return () => window.clearTimeout(timeoutId);
	}, [
		messagesQuery.data?.items?.length,
		olderMessages.length,
		searchedMessages,
		resetSearchResults,
		setHasMoreOlderMessages,
	]);

	const handleLoadMoreMessages = useCallback(() => {
		if (!selectedConversationId || searchedMessages) {
			return false;
		}

		if (isLoadingMoreMessages || loadMoreInFlightRef.current) {
			return false;
		}

		if (!hasMoreOlderMessages) {
			return false;
		}

		const latestCount = messagesQuery.data?.items?.length ?? MESSAGE_PAGE_SIZE;
		if (nextOlderOffsetRef.current < latestCount) {
			nextOlderOffsetRef.current = latestCount;
		}

		const offset = nextOlderOffsetRef.current;

		loadMoreInFlightRef.current = true;
		setIsLoadingMoreMessages(true);
		const conversationId = selectedConversationId;

		void getMessages(conversationId, {
			limit: MESSAGE_PAGE_SIZE,
			offset,
		})
			.then((response) => {
				setOlderMessages((prev) => {
					const dedupedMap = new Map<string | number, Message>();
					for (const msg of [...prev, ...response.items]) {
						const key = msg.id > 0 ? msg.id : msg.temp_id;
						if (key) dedupedMap.set(key, msg);
					}
					return Array.from(dedupedMap.values());
				});
				if (response.items.length > 0) {
					nextOlderOffsetRef.current = offset + response.items.length;
				}

				const canLoadMore = response.items.length > 0 && response.hasMore;
				setHasMoreOlderMessages(canLoadMore);
			})
			.finally(() => {
				loadMoreInFlightRef.current = false;
				setIsLoadingMoreMessages(false);
			});

		return true;
	}, [
		hasMoreOlderMessages,
		isLoadingMoreMessages,
		loadMoreInFlightRef,
		messagesQuery.data?.items?.length,
		nextOlderOffsetRef,
		searchedMessages,
		selectedConversationId,
		setHasMoreOlderMessages,
		setIsLoadingMoreMessages,
		setOlderMessages,
	]);

	useEffect(() => {
		const realTempIds = new Set(
			(messagesQuery.data?.items ?? []).map((m) => m.temp_id).filter(Boolean),
		);

		if (realTempIds.size === 0) {
			return;
		}

		setPendingMessages((prev) =>
			prev.filter(
				// Only remove messages that are still in-flight (pending:true).
				// Confirmed messages (pending:false) stay so their temp_id key is stable —
				// removing them causes a React key change (temp_id → real id) which triggers
				// an unmount/remount and produces visible jitter.
				(message) =>
					!message.temp_id ||
					!realTempIds.has(message.temp_id) ||
					!message.pending,
			),
		);
	}, [messagesQuery.data?.items, setPendingMessages]);

	useEffect(() => {
		if (!selectedConversationId) {
			return;
		}

		const messages = messagesQuery.data?.items ?? [];
		if (messages.length === 0) {
			return;
		}

		const latestMessage = messages.reduce((latest, current) => {
			if (!latest) {
				return current;
			}

			const latestCreatedAt = new Date(latest.created_at).getTime();
			const currentCreatedAt = new Date(current.created_at).getTime();
			if (!Number.isFinite(currentCreatedAt)) {
				return latest;
			}

			if (
				!Number.isFinite(latestCreatedAt) ||
				currentCreatedAt > latestCreatedAt
			) {
				return current;
			}

			return latest;
		}, messages[0]);

		if (!latestMessage) {
			return;
		}

		const currentUserIdValue = String(currentUserId ?? "");
		const isIncomingMessage =
			String(latestMessage.sender_id) !== currentUserIdValue;
		const isUnread = !latestMessage.is_read;
		if (!isIncomingMessage || !isUnread) {
			return;
		}

		const lastAutoReadMessageSeq =
			lastAutoReadMessageByConversationRef.current[selectedConversationId];
		const messageSeq = latestMessage.message_seq ?? latestMessage.seq;
		if (lastAutoReadMessageSeq === messageSeq) {
			return;
		}

		if (Number.isFinite(messageSeq)) {
			lastAutoReadMessageByConversationRef.current[selectedConversationId] =
				messageSeq as number;
		}

		const lastMessageSenderId = Number(latestMessage.sender_id);
		void markReadAction.mutateAsync({
			conversationId: selectedConversationId,
			lastReadSeq: Number.isFinite(messageSeq as number)
				? (messageSeq as number)
				: undefined,
			lastMessageAt: latestMessage.created_at,
			lastMessageContent: latestMessage.content,
			lastMessageSenderId: Number.isFinite(lastMessageSenderId)
				? lastMessageSenderId
				: undefined,
			currentUserId: Number(currentUserId),
		});
	}, [
		selectedConversationId,
		messagesQuery.data?.items,
		currentUserId,
		markReadAction,
		lastAutoReadMessageByConversationRef,
	]);

	// On WS connect → request conversations list; when conversation selected → request messages list.
	useEffect(() => {
		if (!ws) return;

		const handleConnected = () => {
			ws.listConversations({
				requestId: crypto.randomUUID(),
				limit: 20,
				page: 1,
			});

			// If a conversation was already selected (e.g. on reconnect or initial load
			// where ws instance was set before connection opened), reload its messages.
			const convId = selectedConversationIdRef.current;
			if (convId) {
				ws.listMessages({
					requestId: crypto.randomUUID(),
					conversationId: convId,
					limit: MESSAGE_PAGE_SIZE,
					page: 1,
					offset: 0,
				});
				ws.joinRoom(convId, MESSAGE_PAGE_SIZE, 0);
			}
		};

		// Parse and set conversations list result into React Query cache.
		const handleConversationsListResult = (data: unknown) => {
			const parsed = parsePaginated(data, toConversation, 20, 0);
			queryClient.setQueryData(messengerKeys.conversations(20, 0), parsed);
		};

		// Parse and set messages list result into React Query cache.
		const handleMessagesListResult = (data: unknown) => {
			const raw = data as Record<string, unknown>;
			const conversationId = Number(raw.conversation_id ?? 0);
			if (!conversationId) return;

			const parsed = parsePaginated(data, toMessage, MESSAGE_PAGE_SIZE, 0);

			// Merge activity messages so they appear inline with real messages.
			const activitiesRaw = Array.isArray(raw.activities) ? raw.activities : [];
			const activityMessages = activitiesRaw.map(toActivityMessage);
			const mergedItems = [...parsed.items, ...activityMessages].sort(
				(a, b) => {
					const ta = new Date(a.created_at).getTime();
					const tb = new Date(b.created_at).getTime();
					return ta !== tb ? ta - tb : 0;
				},
			);

			queryClient.setQueryData(
				messengerKeys.messages(String(conversationId), MESSAGE_PAGE_SIZE, 0),
				{ ...parsed, items: mergedItems },
			);
		};

		const handlers = {
			onConnected: handleConnected,
			onConversationsListResult: handleConversationsListResult,
			onMessagesListResult: handleMessagesListResult,
		};
		ws.addHandlers(handlers);

		// If already connected when this effect runs, trigger immediately.
		if (ws.isConnected()) {
			handleConnected();
		}

		return () => ws.removeHandlers(handlers);
	}, [ws, queryClient]);

	// When a conversation is selected: join its room for real-time events.
	// History is loaded via HTTP (useMessengerMessages). WS messages.list is
	// reserved for the reconnect path in handleConnected.
	useEffect(() => {
		if (!ws || !selectedConversationId) return;
		ws.joinRoom(selectedConversationId, MESSAGE_PAGE_SIZE, 0);
	}, [ws, selectedConversationId]);

	// Handle real-time events: new messages, conversation/participant updates, seen receipts.
	useEffect(() => {
		if (!ws) return;

		const handleMessageCreated = (data: unknown) => {
			const msg = data as {
				id?: number;
				conversation_id?: number;
				sender_id?: number | string;
				message_seq?: number;
				seq?: number;
				content?: string;
				message_type?: string;
				created_at?: string;
				last_message_at?: string;
				last_message_content?: string;
			};
			const conversationId = msg?.conversation_id;
			if (!conversationId) return;

			// Append the new message directly into the messages cache (no REST re-fetch).
			const messagesKey = messengerKeys.messages(
				String(conversationId),
				MESSAGE_PAGE_SIZE,
				0,
			);
			queryClient.setQueryData<PaginatedResult<Message>>(messagesKey, (old) => {
				if (!old) return old;
				const newMsg = toMessage(msg);
				const messageSeq = newMsg.message_seq ?? newMsg.seq ?? 0;
				const exists = old.items.some(
					(m) =>
						(newMsg.id > 0 && m.id === newMsg.id) ||
						(newMsg.temp_id &&
							newMsg.temp_id !== "" &&
							m.temp_id === newMsg.temp_id) ||
						(messageSeq > 0 &&
							(m.message_seq === messageSeq || m.seq === messageSeq)),
				);
				if (exists) return old;
				return { ...old, items: [...old.items, newMsg], total: old.total + 1 };
			});

			// Update conversation in-place: last_message fields + move to top.
			// Avoids a full conversations.list WS round-trip on every new message.
			const conversationsKey = messengerKeys.conversations(20, 0);
			queryClient.setQueryData<PaginatedResult<Conversation>>(
				conversationsKey,
				(old) => {
					if (!old) return old;
					const idx = old.items.findIndex((c) => c.id === conversationId);
					if (idx === -1) return old;
					const conv = old.items[idx];
					const isSender =
						msg.sender_id != null &&
						Number(msg.sender_id) === Number(currentUserId);
					const isCurrentConversation =
						conversationId === selectedConversationIdRef.current;
					const updated: Conversation = {
						...conv,
						last_message_id: msg.id ?? conv.last_message_id,
						last_message_content:
							msg.content ??
							msg.last_message_content ??
							conv.last_message_content,
						last_message_at:
							msg.created_at ?? msg.last_message_at ?? conv.last_message_at,
						last_message_sender_id:
							msg.sender_id != null
								? Number(msg.sender_id)
								: conv.last_message_sender_id,
						last_message_type: msg.message_type ?? conv.last_message_type,
						unread_count:
							isSender || isCurrentConversation
								? conv.unread_count
								: (conv.unread_count ?? 0) + 1,
					};
					const others = old.items.filter((_, i) => i !== idx);
					return { ...old, items: [updated, ...others] };
				},
			);

			// Play sound + flash title + desktop popup for incoming messages from others.
			const isSenderCurrentUser =
				msg.sender_id != null &&
				Number(msg.sender_id) === Number(currentUserId);
			const isViewingConversation =
				conversationId === selectedConversationIdRef.current &&
				document.hasFocus();
			if (!isSenderCurrentUser && !isViewingConversation) {
				const conv = conversations.find((c) => c.id === conversationId);
				const senderParticipant = conv?.participants?.find(
					(p) => p.id === Number(msg.sender_id),
				);
				notifyNewMessage({
					senderName: senderParticipant?.fullname,
					conversationName: conv?.is_group ? conv.name : undefined,
					content: msg.content,
					senderAvatar: senderParticipant?.avatar,
				});
			}

			// Auto mark-as-read if the user is currently viewing this conversation.
			if (conversationId === selectedConversationIdRef.current) {
				void markReadAction.mutateAsync({
					conversationId,
					lastReadSeq: Number.isFinite(msg.message_seq ?? msg.seq)
						? (msg.message_seq ?? msg.seq)
						: undefined,
					lastMessageAt: msg.created_at ?? msg.last_message_at,
					lastMessageContent: msg.content ?? msg.last_message_content,
					lastMessageSenderId:
						msg.sender_id != null ? Number(msg.sender_id) : undefined,
					currentUserId: Number(currentUserId),
				});
			}
		};

		const handleMessageUpdated = (data: unknown) => {
			const event = data as {
				id?: number;
				conversation_id?: number;
				content?: string;
				updated_at?: string;
			};
			if (!event.id || !event.conversation_id) return;
			const applyUpdate = (m: Message): Message =>
				m.id === event.id
					? {
							...m,
							content: event.content ?? m.content,
							updated_at: event.updated_at ?? m.updated_at,
						}
					: m;
			const key = messengerKeys.messages(
				String(event.conversation_id),
				MESSAGE_PAGE_SIZE,
				0,
			);
			queryClient.setQueryData<PaginatedResult<Message>>(key, (old) => {
				if (!old) return old;
				return { ...old, items: old.items.map(applyUpdate) };
			});
			setOlderMessages((prev) => prev.map(applyUpdate));
		};

		const handleMessageDeleted = (data: unknown) => {
			const event = data as {
				message_id?: number;
				conversation_id?: number;
			};
			if (!event.message_id || !event.conversation_id) return;
			const key = messengerKeys.messages(
				String(event.conversation_id),
				MESSAGE_PAGE_SIZE,
				0,
			);
			queryClient.setQueryData<PaginatedResult<Message>>(key, (old) => {
				if (!old) return old;
				const items = old.items.filter((m) => m.id !== event.message_id);
				return { ...old, items, total: Math.max(0, old.total - 1) };
			});
			setOlderMessages((prev) => prev.filter((m) => m.id !== event.message_id));
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
			const key = messengerKeys.messages(
				String(event.conversation_id),
				MESSAGE_PAGE_SIZE,
				0,
			);
			queryClient.setQueryData<PaginatedResult<Message>>(key, (old) => {
				if (!old) return old;
				return {
					...old,
					items: old.items.map((m) => {
						if (m.id !== event.message_id) return m;
						const withoutUser = (m.reactions ?? []).filter(
							(r) => String(r.user_id) !== eventUserId,
						);
						return {
							...m,
							my_reaction: isCurrentUser
								? (event.reaction ?? null)
								: m.my_reaction,
							reactions: event.reaction
								? [
										...withoutUser,
										{ user_id: eventUserId, emoji: event.reaction },
									]
								: withoutUser,
						};
					}),
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
			const key = messengerKeys.messages(
				String(event.conversation_id),
				MESSAGE_PAGE_SIZE,
				0,
			);
			queryClient.setQueryData<PaginatedResult<Message>>(key, (old) => {
				if (!old) return old;
				return {
					...old,
					items: old.items.map((m) => {
						if (m.id !== event.message_id) return m;
						return {
							...m,
							my_reaction: isCurrentUser ? null : m.my_reaction,
							reactions: (m.reactions ?? []).filter(
								(r) => String(r.user_id) !== eventUserId,
							),
						};
					}),
				};
			});
		};

		const handleConversationOrParticipantUpdated = (data: unknown) => {
			const event = data as { conversation_id?: number };
			const conversationId = event?.conversation_id;
			if (!conversationId) return;

			// Refresh conversations list via WS (group rename, avatar, membership changes).
			ws.listConversations({
				requestId: crypto.randomUUID(),
				limit: 20,
				page: 1,
			});

			if (conversationId === selectedConversationIdRef.current) {
				void markReadAction.mutateAsync({
					conversationId,
					lastReadSeq: undefined,
					lastMessageAt: undefined,
					lastMessageContent: undefined,
					lastMessageSenderId: undefined,
					currentUserId: Number(currentUserId),
				});
			}
		};

		const handleMessageSeenSeq = (data: {
			user_id: number;
			conversation_id: number;
			last_read_seq: number;
		}) => {
			if (!data.conversation_id || !data.user_id || !data.last_read_seq) return;
			if (data.user_id === Number(currentUserId)) return;
			patchParticipantSeenSeq(
				data.conversation_id,
				data.user_id,
				data.last_read_seq,
			);
		};

		const handleActivityCreated = (data: unknown) => {
			const raw = data as Record<string, unknown>;
			const conversationId = Number(raw.conversation_id ?? 0);
			if (!conversationId) return;
			const messagesKey = messengerKeys.messages(
				String(conversationId),
				MESSAGE_PAGE_SIZE,
				0,
			);
			queryClient.setQueryData<PaginatedResult<Message>>(messagesKey, (old) => {
				if (!old) return old;
				const actMsg = toActivityMessage(raw);
				const exists = old.items.some((m) => m.id === actMsg.id && m.activity_type);
				if (exists) return old;
				const merged = [...old.items, actMsg].sort((a, b) => {
					const ta = new Date(a.created_at).getTime();
					const tb = new Date(b.created_at).getTime();
					return ta - tb;
				});
				return { ...old, items: merged };
			});
		};

		const handlers = {
			onMessageCreated: handleMessageCreated,
			onMessageUpdated: handleMessageUpdated,
			onMessageDeleted: handleMessageDeleted,
			onReactionUpdated: handleReactionUpdated,
			onReactionRemoved: handleReactionRemoved,
			onConversationUpdated: handleConversationOrParticipantUpdated,
			onParticipantUpdated: handleConversationOrParticipantUpdated,
			onMessageSeenSeq: handleMessageSeenSeq,
			onActivityCreated: handleActivityCreated,
		};
		ws.addHandlers(handlers);
		return () => ws.removeHandlers(handlers);
	}, [
		ws,
		queryClient,
		conversations,
		currentUserId,
		markReadAction,
		notifyNewMessage,
		patchParticipantSeenSeq,
		setOlderMessages,
	]);

	useEffect(() => {
		showConversationListRef.current = showConversationList;
	}, [showConversationList, showConversationListRef]);

	useEffect(() => {
		selectedConversationIdRef.current = selectedConversationId ?? null;
	}, [selectedConversationId]);

	useEffect(() => {
		const hasSearchPanel = Boolean(
			selectedConversation &&
				searchDetailConversationId &&
				selectedConversation.id === searchDetailConversationId,
		);

		if (!showInfoPanel && !hasSearchPanel) {
			sidebarCollapsedBeforePanelRef.current = isSidebarCollapsed;
		}
	}, [
		showInfoPanel,
		selectedConversation,
		searchDetailConversationId,
		isSidebarCollapsed,
		sidebarCollapsedBeforePanelRef,
	]);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			if (!isMobile) {
				resetResponsiveConversationState();
				return;
			}

			setIsSidebarCollapsed(false);
			setShowInfoPanel(false);

			if (!selectedConversationId) {
				resetResponsiveConversationState();
			}
		}, 0);

		return () => window.clearTimeout(timeoutId);
	}, [
		isMobile,
		resetResponsiveConversationState,
		selectedConversationId,
		setShowInfoPanel,
		setIsSidebarCollapsed,
	]);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			if (!selectedConversationId || !justCreatedConversation) {
				return;
			}

			const existsInFetchedList = conversations.some(
				(item) => item.id === selectedConversationId,
			);

			if (existsInFetchedList) {
				clearJustCreatedConversation();
			}
		}, 0);

		return () => window.clearTimeout(timeoutId);
	}, [
		clearJustCreatedConversation,
		conversations,
		selectedConversationId,
		justCreatedConversation,
	]);

	const cleanupPendingEmptyConversationIfNeeded = useCallback(
		async (nextConversationId?: number | null) => {
			if (
				!pendingEmptyConversationId ||
				pendingEmptyConversationId === nextConversationId
			) {
				return;
			}

			const isPendingConversationSelected =
				selectedConversationId === pendingEmptyConversationId;

			if (!isPendingConversationSelected) {
				return;
			}

			try {
				await actions.delete.mutateAsync(pendingEmptyConversationId);

				setPendingEmptyConversationId(null);

				setJustCreatedConversation((current) =>
					current?.id === pendingEmptyConversationId ? null : current,
				);
			} catch {
				open?.({
					type: "error",
					message: "Không thể xóa cuộc trò chuyện rỗng",
				});
			}
		},
		[
			pendingEmptyConversationId,
			selectedConversationId,
			actions.delete,
			setPendingEmptyConversationId,
			setJustCreatedConversation,
			open,
		],
	);

	const handleSelectUser = async (user: User) => {
		try {
			const participantId = Number(user.id);
			if (!Number.isFinite(participantId)) {
				throw new Error("Invalid participant id");
			}

			const userName = user.first_name || user.username;
			const currentUserId = Number(currentUser?.id ?? 0);

			// Check if direct conversation with this participant already exists.
			const existingConversation = conversations.find(
				(conv) =>
					!conv.is_group &&
					conv.participants.some(
						(participant) => participant.id === participantId,
					) &&
					(!Number.isFinite(currentUserId) ||
						currentUserId <= 0 ||
						conv.participants.some(
							(participant) => participant.id === currentUserId,
						)),
			);

			if (existingConversation) {
				setJustCreatedConversation(null);
				await handleSelectConversation(existingConversation.id);
				return;
			}

			const conversation = await createConversation.mutateAsync({
				is_group: false,
				name: userName || "Cuộc trò chuyện mới",
				participant_ids: [participantId],
			});

			await cleanupPendingEmptyConversationIfNeeded(conversation.id);
			setJustCreatedConversation(conversation);
			setPendingEmptyConversationId(conversation.id);
			setSelectedConversationId(conversation.id);
			setReplyingMessage(null);
			setEditingMessage(null);
			if (isMobile) {
				shouldRestoreConversationListAfterPanelRef.current = false;
				setShowConversationList(false);
			}

			await conversationsQuery.refetch();
		} catch {
			open?.({ type: "error", message: "Không thể mở cuộc trò chuyện" });
		}
	};

	// sendMessage and retryMessage are provided by useMessengerSendMessage

	const handleRestore = async (conversation: Conversation) => {
		try {
			await actions.restore.mutateAsync(conversation.id);
			open?.({ type: "success", message: "Đã khôi phục cuộc trò chuyện" });
		} catch {
			open?.({ type: "error", message: "Không thể khôi phục cuộc trò chuyện" });
		}
	};

	const shouldShowSearchDetailPanel = Boolean(
		selectedConversation &&
			searchDetailConversationId &&
			selectedConversation.id === searchDetailConversationId,
	);
	const shouldReopenInfoPanelAfterSearchRef = useRef(false);

	const closeConversationListForPanelIfNeeded = useCallback(() => {
		if (!showConversationListRef.current) {
			if (!showInfoPanel && !shouldShowSearchDetailPanel) {
				shouldRestoreConversationListAfterPanelRef.current = false;
			}
			return;
		}

		shouldRestoreConversationListAfterPanelRef.current = true;
		setShowConversationList(false);
	}, [
		showInfoPanel,
		shouldShowSearchDetailPanel,
		setShowConversationList,
		shouldRestoreConversationListAfterPanelRef,
		showConversationListRef,
	]);

	const restoreConversationListAfterPanelIfNeeded = useCallback(() => {
		if (!shouldRestoreConversationListAfterPanelRef.current) {
			return;
		}

		shouldRestoreConversationListAfterPanelRef.current = false;
		setShowConversationList(true);
	}, [setShowConversationList, shouldRestoreConversationListAfterPanelRef]);

	const collapseSidebarForPanel = useCallback(() => {
		if (!showInfoPanel && !shouldShowSearchDetailPanel) {
			sidebarCollapsedBeforePanelRef.current = isSidebarCollapsed;
			shouldRestoreSidebarCollapsedAfterPanelRef.current = !isSidebarCollapsed;
		}

		setIsSidebarCollapsed(true);
	}, [
		showInfoPanel,
		shouldShowSearchDetailPanel,
		isSidebarCollapsed,
		setIsSidebarCollapsed,
		shouldRestoreSidebarCollapsedAfterPanelRef,
		sidebarCollapsedBeforePanelRef,
	]);

	const restoreSidebarAfterPanelIfNeeded = useCallback(() => {
		if (shouldRestoreSidebarCollapsedAfterPanelRef.current) {
			shouldRestoreSidebarCollapsedAfterPanelRef.current = false;
			setIsSidebarCollapsed(false);
			return;
		}

		setIsSidebarCollapsed(sidebarCollapsedBeforePanelRef.current);
	}, [
		setIsSidebarCollapsed,
		shouldRestoreSidebarCollapsedAfterPanelRef,
		sidebarCollapsedBeforePanelRef,
	]);

	const handleToggleInfoPanel = useCallback(() => {
		if (!showInfoPanel) {
			closeConversationListForPanelIfNeeded();
			collapseSidebarForPanel();
			setShowInfoPanel(true);
			return;
		}

		setShowInfoPanel(false);
		if (!shouldShowSearchDetailPanel) {
			restoreSidebarAfterPanelIfNeeded();
			restoreConversationListAfterPanelIfNeeded();
		}
	}, [
		showInfoPanel,
		shouldShowSearchDetailPanel,
		setShowInfoPanel,
		closeConversationListForPanelIfNeeded,
		collapseSidebarForPanel,
		restoreSidebarAfterPanelIfNeeded,
		restoreConversationListAfterPanelIfNeeded,
	]);

	const handleCloseInfoPanel = useCallback(() => {
		setShowInfoPanel(false);
		if (!shouldShowSearchDetailPanel) {
			restoreSidebarAfterPanelIfNeeded();
			restoreConversationListAfterPanelIfNeeded();
		}
	}, [
		shouldShowSearchDetailPanel,
		setShowInfoPanel,
		restoreConversationListAfterPanelIfNeeded,
		restoreSidebarAfterPanelIfNeeded,
	]);

	const handleMuteConversation = useCallback(() => {
		if (!selectedConversation) {
			return;
		}

		setConfirmDialog({
			mode: "notifications",
			conversation: selectedConversation,
		});
	}, [selectedConversation, setConfirmDialog]);

	const handleSearchConversation = useCallback(() => {
		if (!selectedConversation) {
			return;
		}

		closeConversationListForPanelIfNeeded();
		collapseSidebarForPanel();
		setSearchAllActive(false);
		setSearchDetailSource("conversation");
		setSearchDetailConversationId(selectedConversation.id);
		if (showInfoPanel) {
			shouldReopenInfoPanelAfterSearchRef.current = true;
			setShowInfoPanel(false);
		}
		if (searchAllKeyword.trim().length >= 2) {
			void loadConversationSearchDetails(
				selectedConversation.id,
				searchAllKeyword,
			);
		} else {
			setSearchDetailResults([]);
		}
	}, [
		selectedConversation,
		searchAllKeyword,
		showInfoPanel,
		loadConversationSearchDetails,
		setSearchDetailConversationId,
		setSearchAllActive,
		closeConversationListForPanelIfNeeded,
		setSearchDetailSource,
		setShowInfoPanel,
		collapseSidebarForPanel,
		setSearchDetailResults,
	]);

	const handleArchiveToggle = useCallback(
		async (conversation: Conversation) => {
			try {
				if (conversation.is_archived) {
					await actions.restore.mutateAsync(conversation.id);
					if (conversationTab === "active") {
						setSelectedConversationId(null);
					}
				} else {
					await actions.archive.mutateAsync(conversation.id);
					if (conversationTab === "active") {
						setSelectedConversationId(null);
					}
				}
				if (isMobile) {
					setShowConversationList(true);
				}
			} catch {
				open?.({
					type: "error",
					message: "Không thể cập nhật trạng thái lưu trữ",
				});
			}
		},
		[
			actions.archive,
			actions.restore,
			conversationTab,
			isMobile,
			open,
			setSelectedConversationId,
			setShowConversationList,
		],
	);

	const handleConversationTabChange = useCallback(
		(_event: SyntheticEvent, value: "active" | "unread" | "archived") => {
			setConversationTab(value);
		},
		[setConversationTab],
	);

	const handleSelectConversation = useCallback(
		async (conversationId: number) => {
			await cleanupPendingEmptyConversationIfNeeded(conversationId);
			setJustCreatedConversation(null);
			setSelectedConversationId(conversationId);
			setShowInfoPanel(false);
			setReplyingMessage(null);
			setEditingMessage(null);
			setSearchedMessages(null);
			setSearchKeyword("");
			if (isMobile) {
				shouldRestoreConversationListAfterPanelRef.current = false;
				setShowConversationList(false);
			}

			const conversation = conversations.find(
				(item) => item.id === conversationId,
			);

			const isReactionNotify = (() => {
				if (conversation?.last_message_type !== "reaction") return false;
				try {
					const meta = JSON.parse(conversation.last_message_metadata ?? "{}");
					return meta.react_to_user === Number(currentUserId);
				} catch {
					return false;
				}
			})();

			if (!conversation || conversation.unread_count <= 0 || isReactionNotify) {
				setOpeningUnreadSnapshot(null);
				if (conversation && isReactionNotify && conversation.unread_count > 0) {
					await markReadAction.mutateAsync({
						conversationId,
						lastReadSeq: undefined,
						lastMessageAt: conversation.last_message_at,
						lastMessageContent: conversation.last_message_content,
						lastMessageSenderId: conversation.last_message_sender_id,
						currentUserId: Number(currentUserId),
					});
				}
				return;
			}

			const currentUserParticipant = conversation.participants.find(
				(participant) => participant.id === Number(currentUserId),
			);
			const lastReadSeq = Number(
				currentUserParticipant?.last_read_seq ??
					conversation.last_read_message_id ??
					0,
			);
			setOpeningUnreadSnapshot({
				conversationId,
				lastReadSeq: Number.isFinite(lastReadSeq) ? lastReadSeq : 0,
				unreadCount: Number(conversation.unread_count || 0),
			});

			// Get latest message seq to send as last_read_seq
			const messages = messagesQuery.data?.items ?? [];
			let latestMessageSeq: number | undefined;

			if (messages.length > 0) {
				const sortedMessages = [...messages].sort(
					(a, b) =>
						(a.message_seq ?? a.seq ?? 0) - (b.message_seq ?? b.seq ?? 0),
				);
				const latestMessage = sortedMessages[sortedMessages.length - 1];
				latestMessageSeq = latestMessage?.message_seq ?? latestMessage?.seq;
			}

			await markReadAction.mutateAsync({
				conversationId,
				lastReadSeq: Number.isFinite(latestMessageSeq as number)
					? (latestMessageSeq as number)
					: undefined,
				lastMessageAt: conversation.last_message_at,
				lastMessageContent: conversation.last_message_content,
				lastMessageSenderId: conversation.last_message_sender_id,
				currentUserId: Number(currentUserId),
			});
		},
		[
			cleanupPendingEmptyConversationIfNeeded,
			conversations,
			currentUserId,
			markReadAction,
			messagesQuery.data?.items,
			isMobile,
			setSelectedConversationId,
			setShowInfoPanel,
			setOpeningUnreadSnapshot,
			shouldRestoreConversationListAfterPanelRef,
			setSearchKeyword,
			setJustCreatedConversation,
			setEditingMessage,
			setShowConversationList,
			setReplyingMessage,
			setSearchedMessages,
		],
	);

	const handleDelete = useCallback(
		async (conversationId: number) => {
			const confirmed = await confirm({
				title: "Xóa cuộc trò chuyện",
				description: "Bạn có chắc chắn muốn xóa cuộc trò chuyện này không?",
				variant: "danger",
				confirmText: "Xóa",
				cancelText: "Hủy",
			});
			if (!confirmed) {
				return;
			}

			try {
				await actions.delete.mutateAsync(conversationId);

				if (selectedConversationId === conversationId) {
					setSelectedConversationId(null);
					setPendingEmptyConversationId((current) =>
						current === conversationId ? null : current,
					);
					setShowInfoPanel(false);
					setSearchedMessages(null);
					setSearchKeyword("");
					setReplyingMessage(null);
					setEditingMessage(null);
					setSearchDetailConversationId(null);
					setSearchDetailSource(null);
					setSearchDetailResults([]);

					if (isMobile) {
						setShowConversationList(true);
					}
				}

				open?.({ type: "success", message: "Đã xóa cuộc trò chuyện" });
			} catch {
				open?.({ type: "error", message: "Không thể xóa cuộc trò chuyện" });
			}
		},
		[
			confirm,
			actions.delete,
			selectedConversationId,
			open,
			isMobile,
			setSearchKeyword,
			setPendingEmptyConversationId,
			setSearchDetailConversationId,
			setSelectedConversationId,
			setReplyingMessage,
			setSearchDetailSource,
			setShowInfoPanel,
			setShowConversationList,
			setSearchDetailResults,
			setSearchedMessages,
			setEditingMessage,
		],
	);

	const handleSaveConversationName = useCallback(
		async (conversation: Conversation, name: string) => {
			const trimmedName = name.trim();
			if (!trimmedName) {
				open?.({
					type: "error",
					message: "Tên cuộc trò chuyện không được để trống",
				});
				return;
			}

			try {
				await actions.rename.mutateAsync({
					conversationId: conversation.id,
					name: trimmedName,
				});
				open?.({ type: "success", message: "Đã cập nhật tên cuộc trò chuyện" });
				await conversationsQuery.refetch();
			} catch {
				open?.({
					type: "error",
					message: "Không thể cập nhật tên cuộc trò chuyện",
				});
			}
		},
		[actions.rename, open, conversationsQuery],
	);

	const handleUploadGroupAvatar = useCallback(
		async (conversation: Conversation, file: File) => {
			if (!file.type.startsWith("image/")) {
				open?.({ type: "error", message: "Vui lòng chọn file hình ảnh" });
				return;
			}

			try {
				await actions.updateAvatar.mutateAsync({
					conversationId: conversation.id,
					avatar: file,
				});
				open?.({ type: "success", message: "Đã cập nhật hình nhóm" });
				await conversationsQuery.refetch();
			} catch {
				open?.({ type: "error", message: "Không thể cập nhật hình nhóm" });
			}
		},
		[actions.updateAvatar, open, conversationsQuery],
	);

	const handleSaveConversationBackground = useCallback(
		async (
			conversation: Conversation,
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
			if (!config.themeId) {
				open?.({ type: "error", message: "Vui lòng chọn theme" });
				return;
			}

			try {
				await actions.updateBackground.mutateAsync({
					conversationId: conversation.id,
					themeId: config.themeId,
					themeUrl: config.themeUrl,
					customIncomingBubbleColor: config.incomingBubbleColor || undefined,
					customOutgoingBubbleColor: config.outgoingBubbleColor || undefined,
					customIncomingTextColor: config.incomingTextColor || undefined,
					customOutgoingTextColor: config.outgoingTextColor || undefined,
				});

				setConversationThemeOverrides((prev) => ({
					...prev,
					[conversation.id]: {
						...config,
						themeUrl:
							typeof config.themeUrl === "string" ? config.themeUrl : undefined,
					},
				}));
				await conversationsQuery.refetch();
				open?.({ type: "success", message: "Đã cập nhật background" });
			} catch {
				open?.({ type: "error", message: "Không thể cập nhật background" });
			}
		},
		[
			actions.updateBackground,
			conversationsQuery,
			open,
			setConversationThemeOverrides,
		],
	);

	const handleChangeQuickReaction = useCallback(
		async (conversation: Conversation, quickReaction: string) => {
			if (!quickReaction.trim()) {
				open?.({ type: "error", message: "Biểu cảm không được để trống" });
				return;
			}

			try {
				const messengerService = await import("@/services/messengerService");
				await messengerService.setQuickReaction(conversation.id, quickReaction);
				await conversationsQuery.refetch();
				open?.({ type: "success", message: "Đã cập nhật biểu cảm" });
			} catch {
				open?.({ type: "error", message: "Không thể cập nhật biểu cảm" });
			}
		},
		[open, conversationsQuery],
	);

	const handleAddMember = useCallback(
		async (conversation: Conversation) => {
			if (!conversation.is_group) {
				return;
			}

			setInputDialog({
				mode: "addMembers",
				conversation,
				value: "",
				selectedUsers: [],
			});
		},
		[setInputDialog],
	);

	const handleOpenCreateGroupDialog = useCallback(() => {
		setCreateGroupPreselectedParticipants([]);
		setOpenCreateGroupDialog(true);
	}, [setCreateGroupPreselectedParticipants, setOpenCreateGroupDialog]);

	const handleCreateGroupWithUser = useCallback(
		(participant: Participant) => {
			setCreateGroupPreselectedParticipants([participant]);
			setOpenCreateGroupDialog(true);
			setShowInfoPanel(false);
		},
		[
			setCreateGroupPreselectedParticipants,
			setOpenCreateGroupDialog,
			setShowInfoPanel,
		],
	);

	const handleCreateGroup = useCallback(
		async (name: string, participantIds: number[]) => {
			try {
				const conversation = await createConversation.mutateAsync({
					is_group: true,
					name: name || "Nhóm mới",
					participant_ids: participantIds,
				});
				setOpenCreateGroupDialog(false);
				await cleanupPendingEmptyConversationIfNeeded(conversation.id);
				setJustCreatedConversation(conversation);
				setSelectedConversationId(conversation.id);
				setReplyingMessage(null);
				setEditingMessage(null);
				if (isMobile) {
					shouldRestoreConversationListAfterPanelRef.current = false;
					setShowConversationList(false);
				}
				await conversationsQuery.refetch();
				open?.({ type: "success", message: "Đã tạo nhóm trò chuyện" });
			} catch {
				open?.({ type: "error", message: "Không thể tạo nhóm trò chuyện" });
			}
		},
		[
			createConversation,
			setOpenCreateGroupDialog,
			cleanupPendingEmptyConversationIfNeeded,
			setJustCreatedConversation,
			setSelectedConversationId,
			setReplyingMessage,
			setEditingMessage,
			isMobile,
			shouldRestoreConversationListAfterPanelRef,
			setShowConversationList,
			conversationsQuery,
			open,
		],
	);

	const handleStartDirectConversation = useCallback(
		async (participant: Participant) => {
			if (Number(currentUser?.id) === participant.id) return;
			try {
				const res = await createConversation.mutateAsync({
					is_group: false,
					name: "",
					participant_ids: [participant.id],
				});
				const conv =
					typeof res === "object" && res !== null && "conversation" in res
						? (res as { conversation?: Conversation }).conversation
						: (res as Conversation);
				if (conv?.id) {
					await handleSelectConversation(conv.id);
					setShowInfoPanel(false);
				}
			} catch {
				open?.({ type: "error", message: "Không thể mở trò chuyện trực tiếp" });
			}
		},
		[
			currentUser?.id,
			createConversation,
			handleSelectConversation,
			open,
			setShowInfoPanel,
		],
	);

	const handleToggleNotifications = useCallback(
		async (conversation: Conversation) => {
			setConfirmDialog({
				mode: "notifications",
				conversation,
			});
		},
		[setConfirmDialog],
	);

	const handleLeaveConversation = useCallback(
		async (conversation: Conversation) => {
			if (!conversation.is_group) {
				return;
			}

			setConfirmDialog({
				mode: "leave",
				conversation,
			});
		},
		[setConfirmDialog],
	);

	const handleSelectSearchConversationGroup = useCallback(
		async (conversationId: number) => {
			await handleSelectConversation(conversationId);
			closeConversationListForPanelIfNeeded();
			collapseSidebarForPanel();
			setSearchAllActive(false);
			setSearchDetailSource("global");
			setScrollToMessageId(null);
			setSearchDetailConversationId(conversationId);
			await loadConversationSearchDetails(conversationId, searchAllKeyword);
		},
		[
			handleSelectConversation,
			setSearchAllActive,
			setSearchDetailSource,
			setScrollToMessageId,
			setSearchDetailConversationId,
			loadConversationSearchDetails,
			searchAllKeyword,
			collapseSidebarForPanel,
			closeConversationListForPanelIfNeeded,
		],
	);

	const handleSelectSearchDetailMessage = useCallback(
		async (message: Message) => {
			if (selectedConversationId !== message.conversation_id) {
				await handleSelectConversation(message.conversation_id);
			}

			setScrollToMessageId(message.id);
		},
		[selectedConversationId, handleSelectConversation, setScrollToMessageId],
	);

	const handleCloseSearchDetailPanel = useCallback(() => {
		const shouldReopenInfoPanel = shouldReopenInfoPanelAfterSearchRef.current;
		shouldReopenInfoPanelAfterSearchRef.current = false;

		setSearchDetailConversationId(null);
		setSearchDetailSource(null);
		setSearchDetailResults([]);
		if (
			searchDetailSource === "global" &&
			searchAllKeyword.trim().length >= 2
		) {
			setSearchAllActive(true);
		}

		if (shouldReopenInfoPanel) {
			setShowInfoPanel(true);
			return;
		}

		if (!showInfoPanel) {
			restoreSidebarAfterPanelIfNeeded();
			restoreConversationListAfterPanelIfNeeded();
		}
	}, [
		searchDetailSource,
		searchAllKeyword,
		setSearchDetailConversationId,
		setSearchDetailSource,
		setSearchDetailResults,
		setSearchAllActive,
		setShowInfoPanel,
		showInfoPanel,
		restoreSidebarAfterPanelIfNeeded,
		restoreConversationListAfterPanelIfNeeded,
	]);

	const handleCloseOverlayPanels = useCallback(() => {
		const hasInfoPanel = showInfoPanel;
		const hasSearchPanel = shouldShowSearchDetailPanel;

		if (hasInfoPanel) {
			setShowInfoPanel(false);
		}

		const shouldReopenInfoPanel = shouldReopenInfoPanelAfterSearchRef.current;
		if (hasSearchPanel) {
			setSearchDetailConversationId(null);
			setSearchDetailSource(null);
			setSearchDetailResults([]);
			if (
				searchDetailSource === "global" &&
				searchAllKeyword.trim().length >= 2
			) {
				setSearchAllActive(true);
			}
		}

		if (shouldReopenInfoPanel) {
			shouldReopenInfoPanelAfterSearchRef.current = false;
			setShowInfoPanel(true);
			return;
		}

		if (!hasInfoPanel && !hasSearchPanel) {
			return;
		}

		restoreSidebarAfterPanelIfNeeded();
		restoreConversationListAfterPanelIfNeeded();
	}, [
		showInfoPanel,
		shouldShowSearchDetailPanel,
		searchDetailSource,
		searchAllKeyword,
		setSearchDetailConversationId,
		setSearchDetailSource,
		setSearchDetailResults,
		setSearchAllActive,
		setShowInfoPanel,
		restoreSidebarAfterPanelIfNeeded,
		restoreConversationListAfterPanelIfNeeded,
	]);

	const handleSetNickname = useCallback(
		async (conversation: Conversation, participant: Participant) => {
			setInputDialog({
				mode: "nickname",
				conversation,
				participant,
				value: "",
			});
		},
		[setInputDialog],
	);

	const handleEditMemberNickname = useCallback(
		(participant: Participant) => {
			if (!selectedConversation) {
				return;
			}

			handleSetNickname(selectedConversation, participant);
		},
		[selectedConversation, handleSetNickname],
	);

	const handleRemoveMember = useCallback(
		(participant: Participant) => {
			if (!selectedConversation) {
				return;
			}

			setConfirmDialog({
				mode: "removeMember",
				conversation: selectedConversation,
				targetParticipant: participant,
			});
		},
		[selectedConversation, setConfirmDialog],
	);

	const handleAddMemberUserSearch = useCallback(
		(user: User) => {
			setInputDialog((prev) => {
				if (prev?.mode !== "addMembers") {
					return prev;
				}

				// Check if user is already selected or is already a participant
				const isAlreadySelected = prev.selectedUsers?.some(
					(u) => u.id === user.id,
				);
				const isAlreadyParticipant = prev.conversation.participants.some(
					(p) => p.id === Number(user.id),
				);

				if (isAlreadySelected || isAlreadyParticipant) {
					open?.({
						type: "error",
						message:
							"Người dùng này đã được chọn hoặc đã là thành viên của nhóm",
					});
					return prev;
				}

				return {
					...prev,
					selectedUsers: [...(prev.selectedUsers || []), user],
				};
			});
			setOpenAddMembersSearch(false);
		},
		[open, setOpenAddMembersSearch, setInputDialog],
	);

	const _handleRemoveSelectedUser = useCallback(
		(userId: string) => {
			setInputDialog((prev) => {
				if (prev?.mode !== "addMembers") {
					return prev;
				}

				return {
					...prev,
					selectedUsers: (prev.selectedUsers || []).filter(
						(u) => u.id !== userId,
					),
				};
			});
		},
		[setInputDialog],
	);

	const closeInputDialog = useCallback(() => {
		setSelectedImageFile(null);
		setThemePresetId("");
		setBackgroundColor(DEFAULT_BACKGROUND_COLOR);
		setIncomingBubbleColor(DEFAULT_INCOMING_BUBBLE_COLOR);
		setOutgoingBubbleColor(DEFAULT_OUTGOING_BUBBLE_COLOR);
		setIncomingTextColor(DEFAULT_INCOMING_TEXT_COLOR);
		setOutgoingTextColor(DEFAULT_OUTGOING_TEXT_COLOR);
		setInputDialog(null);
	}, [
		setInputDialog,
		setBackgroundColor,
		setIncomingBubbleColor,
		setIncomingTextColor,
		setOutgoingBubbleColor,
		setOutgoingTextColor,
		setSelectedImageFile,
		setThemePresetId,
	]);

	const handleGroupAvatarFileSelected = useCallback(
		async (event: ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			event.target.value = "";

			if (!file || !avatarUploadConversationId) {
				setAvatarUploadConversationId(null);
				return;
			}

			if (!file.type.startsWith("image/")) {
				open?.({ type: "error", message: "Vui lòng chọn file hình ảnh" });
				setAvatarUploadConversationId(null);
				return;
			}

			try {
				await actions.updateAvatar.mutateAsync({
					conversationId: avatarUploadConversationId,
					avatar: file,
				});
				open?.({ type: "success", message: "Đã cập nhật hình nhóm" });
			} catch {
				open?.({ type: "error", message: "Không thể cập nhật hình nhóm" });
			} finally {
				setAvatarUploadConversationId(null);
			}
		},
		[
			avatarUploadConversationId,
			actions.updateAvatar,
			open,
			setAvatarUploadConversationId,
		],
	);

	const _handleImageFileSelected = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			if (!file) {
				return;
			}

			if (!file.type.startsWith("image/")) {
				open?.({ type: "error", message: "Vui lòng chọn file hình ảnh" });
				event.target.value = "";
				return;
			}

			const reader = new FileReader();
			reader.onload = () => {
				const result = typeof reader.result === "string" ? reader.result : "";
				setSelectedImageFile(file);
				setThemePresetId("");
				setInputDialog((prev) => (prev ? { ...prev, value: result } : prev));
				open?.({ type: "success", message: "Đã chọn hình" });
			};
			reader.onerror = () => {
				open?.({ type: "error", message: "Không thể đọc hình đã chọn" });
			};
			reader.readAsDataURL(file);
			event.target.value = "";
		},
		[open, setSelectedImageFile, setThemePresetId, setInputDialog],
	);

	const closeConfirmDialog = useCallback(() => {
		setConfirmDialog(null);
	}, [setConfirmDialog]);

	const handleInputDialogValueChange = useCallback(
		(value: string) => {
			setInputDialog((prev) => (prev ? { ...prev, value } : prev));
		},
		[setInputDialog],
	);

	const _submitInputDialog = useCallback(async () => {
		if (!inputDialog) {
			return;
		}

		try {
			if (inputDialog.mode === "rename") {
				const name = inputDialog.value.trim();
				if (!name) {
					open?.({
						type: "error",
						message: "Tên cuộc trò chuyện không được để trống",
					});
					return;
				}
				await actions.rename.mutateAsync({
					conversationId: inputDialog.conversation.id,
					name,
				});
				open?.({ type: "success", message: "Đã cập nhật tên cuộc trò chuyện" });
			}

			if (inputDialog.mode === "addMembers") {
				const selectedUsers = inputDialog.selectedUsers || [];
				if (selectedUsers.length === 0) {
					open?.({
						type: "error",
						message: "Vui lòng chọn ít nhất một người dùng",
					});
					return;
				}

				const userIds = selectedUsers
					.map((u) => Number(u.id))
					.filter(Number.isFinite);
				await actions.addMembers.mutateAsync({
					conversationId: inputDialog.conversation.id,
					userIds,
				});
				open?.({ type: "success", message: "Đã thêm thành viên vào nhóm" });
			}

			if (inputDialog.mode === "background") {
				const selectedTheme = (themesQuery.data ?? []).find(
					(item) => item.preset_id === themePresetId,
				);
				if (!selectedTheme) {
					open?.({ type: "error", message: "Vui lòng chọn theme" });
					return;
				}
				const backgroundInput = inputDialog.value.trim();
				const generatedBackground = buildGradientFromStops(
					backgroundGradientStops,
					backgroundGradientAngle,
				);
				const resolvedBackground =
					selectedImagePreview || backgroundInput || generatedBackground;

				if (!resolvedBackground) {
					open?.({ type: "error", message: "Background không được để trống" });
					return;
				}

				const themeConfig: ConversationThemeConfig = {
					background: resolvedBackground,
					backgroundColor: resolvedBackground,
					incomingBubbleColor,
					outgoingBubbleColor,
					incomingTextColor:
						inputDialog.conversation.incoming_text_color ||
						DEFAULT_INCOMING_TEXT_COLOR,
					outgoingTextColor:
						inputDialog.conversation.outgoing_text_color ||
						DEFAULT_OUTGOING_TEXT_COLOR,
					presetId: themePresetId || undefined,
					themeId: selectedTheme.id,
				};

				await actions.updateBackground.mutateAsync({
					conversationId: inputDialog.conversation.id,
					themeId: selectedTheme.id,
					customIncomingBubbleColor: incomingBubbleColor || undefined,
					customOutgoingBubbleColor: outgoingBubbleColor || undefined,
					customIncomingTextColor: themeConfig.incomingTextColor || undefined,
					customOutgoingTextColor: themeConfig.outgoingTextColor || undefined,
				});

				setConversationThemeOverrides((prev) => ({
					...prev,
					[inputDialog.conversation.id]: themeConfig,
				}));

				await conversationsQuery.refetch();
				open?.({ type: "success", message: "Đã cập nhật background" });
			}

			if (inputDialog.mode === "nickname") {
				const participant = inputDialog.participant;
				if (!participant) {
					return;
				}
				await actions.setNickname.mutateAsync({
					conversationId: inputDialog.conversation.id,
					targetUserId: participant.id,
					nickname: inputDialog.value.trim(),
				});
				open?.({ type: "success", message: "Đã cập nhật biệt danh" });
			}

			if (inputDialog.mode === "searchMessages") {
				const keyword = inputDialog.value.trim();
				if (!keyword) {
					open?.({
						type: "error",
						message: "Từ khóa tìm kiếm không được để trống",
					});
					return;
				}

				const response = await searchConversationMessages(
					inputDialog.conversation.id,
					keyword,
					50,
				);
				setSearchedMessages(response.items);
				setSearchKeyword(keyword);
				open?.({
					type: "success",
					message: `Tìm thấy ${response.items.length} tin nhắn`,
				});
			}

			closeInputDialog();
		} catch {
			open?.({ type: "error", message: "Không thể thực hiện thao tác" });
		}
	}, [
		inputDialog,
		actions.rename,
		open,
		actions.addMembers,
		backgroundGradientStops,
		backgroundGradientAngle,
		selectedImagePreview,
		themesQuery.data,
		incomingBubbleColor,
		outgoingBubbleColor,
		themePresetId,
		actions.updateBackground,
		conversationsQuery,
		actions.setNickname,
		closeInputDialog,
		setSearchedMessages,
		setSearchKeyword,
		setConversationThemeOverrides,
	]);

	const submitConfirmDialog = useCallback(
		async (confirmed: boolean) => {
			if (!confirmDialog) {
				return;
			}

			try {
				if (confirmDialog.mode === "leave") {
					if (!confirmed) {
						closeConfirmDialog();
						return;
					}

					await actions.leave.mutateAsync(confirmDialog.conversation.id);
					if (selectedConversationId === confirmDialog.conversation.id) {
						setSelectedConversationId(null);
					}
					open?.({ type: "success", message: "Đã rời khỏi cuộc trò chuyện" });
				}

				if (confirmDialog.mode === "removeMember") {
					if (!confirmed) {
						closeConfirmDialog();
						return;
					}

					if (!confirmDialog.targetParticipant) {
						closeConfirmDialog();
						return;
					}

					try {
						await actions.removeMember.mutateAsync({
							conversationId: confirmDialog.conversation.id,
							userId: confirmDialog.targetParticipant.id,
						});
						open?.({
							type: "success",
							message: `Đã xóa ${confirmDialog.targetParticipant.nickname || confirmDialog.targetParticipant.fullname || "thành viên"} khỏi nhóm`,
						});
						await conversationsQuery.refetch();
					} catch (error: unknown) {
						const errorMessage =
							error instanceof Error
								? error.message
								: "Không thể xóa thành viên khỏi nhóm";
						open?.({
							type: "error",
							message: errorMessage,
						});
					}
				}

				if (confirmDialog.mode === "notifications") {
					if (!confirmed) {
						closeConfirmDialog();
						return;
					}

					const nextEnabled = !isNotificationsEnabled(
						confirmDialog.conversation,
					);
					await actions.updateNotifications.mutateAsync({
						conversationId: confirmDialog.conversation.id,
						enabled: nextEnabled,
					});
					open?.({
						type: "success",
						message: nextEnabled ? "Đã bật thông báo" : "Đã tắt thông báo",
					});
				}

				closeConfirmDialog();
			} catch {
				open?.({ type: "error", message: "Không thể thực hiện thao tác" });
			}
		},
		[
			confirmDialog,
			closeConfirmDialog,
			actions.leave,
			selectedConversationId,
			actions.removeMember,
			conversationsQuery,
			open,
			actions.updateNotifications,
			setSelectedConversationId,
			isNotificationsEnabled,
		],
	);

	const handleDeleteMessage = useCallback(
		async (messageId: number) => {
			const confirmed = await confirm({
				title: "Xóa tin nhắn",
				description: "Bạn có chắc chắn muốn xóa tin nhắn này không?",
				variant: "danger",
				confirmText: "Xóa",
				cancelText: "Hủy",
			});
			if (!confirmed) return;

			try {
				await messageActions.deleteMessage.mutateAsync(messageId);
				setOlderMessages((prev) => prev.filter((m) => m.id !== messageId));
				open?.({ type: "success", message: "Đã xóa tin nhắn" });
			} catch {
				open?.({ type: "error", message: "Không thể xóa tin nhắn" });
			}
		},
		[confirm, messageActions.deleteMessage, open, setOlderMessages],
	);

	const handleSpeakMessage = useCallback(async (message: Message) => {
		try {
			await speakText(message.content);
		} catch (err) {
			console.error("TTS error:", err);
		}
	}, []);

	const handleEditMessage = useCallback(
		(message: Message) => {
			setReplyingMessage(null);
			setEditingMessage(message);
		},
		[setReplyingMessage, setEditingMessage],
	);

	const handleReplyMessage = useCallback(
		(message: Message) => {
			setEditingMessage(null);
			setReplyingMessage(message);
		},
		[setEditingMessage, setReplyingMessage],
	);

	const handleCancelReply = useCallback(() => {
		setReplyingMessage(null);
	}, [setReplyingMessage]);

	const handleCancelEdit = useCallback(() => {
		setEditingMessage(null);
	}, [setEditingMessage]);

	const applyLocalReaction = useCallback(
		(
			target: Message,
			reaction: string,
			action: "toggle" | "remove" = "toggle",
		): Message => {
			const userId = String(currentUser?.id ?? "");
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
		[currentUser?.id],
	);

	const handleToggleReaction = useCallback(
		async (
			message: Message,
			reaction = "👍",
			action: "toggle" | "remove" = "toggle",
		) => {
			const previousPendingMessages = pendingMessages;
			const messageId = Number(message.id);
			const messagesQueryKey =
				selectedConversationId != null
					? messengerKeys.messages(
							String(selectedConversationId),
							MESSAGE_PAGE_SIZE,
							0,
						)
					: null;
			const previousMessagesCache = messagesQueryKey
				? queryClient.getQueryData<PaginatedResult<Message>>(messagesQueryKey)
				: undefined;
			const matchesMessage = (item: Message) =>
				(messageId > 0 && item.id === messageId) ||
				(Boolean(message.temp_id) && item.temp_id === message.temp_id);

			setPendingMessages((prev) =>
				prev.map((item) =>
					matchesMessage(item)
						? applyLocalReaction(item, reaction, action)
						: item,
				),
			);
			if (messagesQueryKey) {
				queryClient.setQueryData<PaginatedResult<Message>>(
					messagesQueryKey,
					(current) =>
						current
							? {
									...current,
									items: current.items.map((item) =>
										matchesMessage(item)
											? applyLocalReaction(item, reaction, action)
											: item,
									),
								}
							: current,
				);
			}

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
				setPendingMessages(previousPendingMessages);
				if (messagesQueryKey) {
					queryClient.setQueryData(messagesQueryKey, previousMessagesCache);
				}
				open?.({ type: "error", message: "Không thể cập nhật cảm xúc" });
			}
		},
		[
			applyLocalReaction,
			messageActions.removeReaction,
			messageActions.setReaction,
			open,
			pendingMessages,
			queryClient,
			selectedConversationId,
			setPendingMessages,
		],
	);

	const handleBackToConversationList = useCallback(() => {
		shouldRestoreConversationListAfterPanelRef.current = false;
		shouldRestoreSidebarCollapsedAfterPanelRef.current = false;
		sidebarCollapsedBeforePanelRef.current = false;
		setShowConversationList(true);
		setSearchAllKeyword("");
		setSearchAllActive(false);
		setSearchAllResults([]);
		setSearchAllUserResults([]);
		setSearchDetailConversationId(null);
		setSearchDetailSource(null);
		setSearchDetailResults([]);
	}, [
		setShowConversationList,
		setSearchAllKeyword,
		setSearchAllActive,
		setSearchAllResults,
		setSearchAllUserResults,
		setSearchDetailConversationId,
		setSearchDetailSource,
		setSearchDetailResults,
		sidebarCollapsedBeforePanelRef,
		shouldRestoreSidebarCollapsedAfterPanelRef,
		shouldRestoreConversationListAfterPanelRef,
	]);

	const handleExitSidebarSearch = useCallback(() => {
		shouldRestoreConversationListAfterPanelRef.current = false;
		shouldRestoreSidebarCollapsedAfterPanelRef.current = false;
		sidebarCollapsedBeforePanelRef.current = false;
		setSearchAllKeyword("");
		setSearchAllActive(false);
		setSearchAllResults([]);
		setSearchAllUserResults([]);
		setSearchDetailConversationId(null);
		setSearchDetailSource(null);
		setSearchDetailResults([]);
		setShowConversationList(true);
	}, [
		setSearchAllKeyword,
		setSearchAllActive,
		setSearchAllResults,
		setSearchAllUserResults,
		setSearchDetailConversationId,
		setSearchDetailSource,
		setSearchDetailResults,
		setShowConversationList,
		sidebarCollapsedBeforePanelRef,
		shouldRestoreSidebarCollapsedAfterPanelRef,
		shouldRestoreConversationListAfterPanelRef,
	]);

	const showSidebar =
		!isMobile || !selectedConversation || showConversationList;
	const showDetail =
		!isMobile || (!!selectedConversation && !showConversationList);
	const showOverlayBackdrop = showInfoPanel || shouldShowSearchDetailPanel;
	const displayedMessages = useMemo(() => {
		if (searchedMessages) {
			return searchedMessages;
		}

		const latestMessages = messagesQuery.data?.items ?? [];
		const sessionMessages = pendingMessages.filter(
			(m) => m.conversation_id === selectedConversationId,
		);

		// Sử dụng Map để lọc trùng ID/TempID giữa olderMessages và latestMessages
		const historicalMap = new Map<string | number, Message>();
		for (const msg of [...olderMessages, ...latestMessages]) {
			const key = msg.id > 0 ? msg.id : msg.temp_id;
			if (key) historicalMap.set(key, msg);
		}

		// Xác định các tin nhắn đã có trong session để tránh lặp khi query refetch
		const sessionTempIds = new Set(
			sessionMessages.map((m) => m.temp_id).filter(Boolean),
		);
		const sessionIds = new Set(
			sessionMessages.map((m) => m.id).filter((id) => id > 0),
		);

		const filteredHistorical = Array.from(historicalMap.values()).filter(
			(m) => !sessionTempIds.has(m.temp_id) && !sessionIds.has(m.id),
		);

		return [...filteredHistorical, ...sessionMessages];
	}, [
		searchedMessages,
		messagesQuery.data?.items,
		olderMessages,
		pendingMessages,
		selectedConversationId,
	]);

	const hasMoreMessages = !searchedMessages && hasMoreOlderMessages;

	const shouldShowUnreadDividerForSelected =
		Boolean(selectedConversation) &&
		(Number(selectedConversation?.unread_count || 0) > 0 ||
			(openingUnreadSnapshot?.conversationId === selectedConversation?.id &&
				Number(openingUnreadSnapshot?.unreadCount || 0) > 0));

	const { unreadBoundaryMessageId, initialUnreadScrollMessageId } =
		useConversationUnread({
			selectedConversation,
			displayedMessages,
			messagesLoading: messagesQuery.isLoading,
			isLoadingMoreMessages,
			hasMoreOlderMessages,
			handleLoadMoreMessages,
			openingUnreadSnapshot,
			currentUserId: currentUser?.id,
		});

	const shouldShowSearchAllResults = searchAllActive;
	const isSidebarSearching = Boolean(
		searchAllKeyword.trim() ||
			shouldShowSearchAllResults ||
			searchDetailConversationId,
	);

	const _renderHighlightedText = (text: string, keyword: string): ReactNode => {
		const normalizedKeyword = keyword.trim();
		if (!normalizedKeyword) {
			return text;
		}

		const escapedKeyword = normalizedKeyword.replace(
			/[.*+?^${}()|[\]\\]/g,
			"\\$&",
		);
		const parts = text.split(new RegExp(`(${escapedKeyword})`, "ig"));
		let offset = 0;
		return parts.map((part) => {
			const key = `${part}-${offset}`;
			offset += part.length;

			return part.toLowerCase() === normalizedKeyword.toLowerCase() ? (
				<Box
					key={key}
					component="mark"
					sx={{
						px: 0.25,
						borderRadius: 0.5,
						bgcolor: "warning.light",
					}}
				>
					{part}
				</Box>
			) : (
				<Box key={key} component="span">
					{part}
				</Box>
			);
		});
	};

	const searchGroupedResults = useMemo(() => {
		const groups = new Map<number, Message[]>();
		searchAllResults.forEach((item) => {
			const current = groups.get(item.conversation_id) ?? [];
			current.push(item);
			groups.set(item.conversation_id, current);
		});

		return Array.from(groups.entries())
			.map(([conversationId, messages]) => {
				const sorted = [...messages].sort(
					(a, b) =>
						new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
				);
				return {
					conversationId,
					totalMatched: messages.length,
					latestMessage: sorted[0],
				};
			})
			.sort(
				(a, b) =>
					new Date(b.latestMessage?.created_at ?? 0).getTime() -
					new Date(a.latestMessage?.created_at ?? 0).getTime(),
			);
	}, [searchAllResults]);

	const getConversationDisplayName = (
		conversation: Conversation | undefined,
		fallbackConversationId: number,
	) => {
		if (!conversation) {
			return `Conversation #${fallbackConversationId}`;
		}

		if (conversation.is_group) {
			return conversation.name || `Nhóm #${conversation.id}`;
		}

		const currentUserId = Number(currentUser?.id ?? 0);
		const otherMember = conversation.participants?.find(
			(member) => member.id !== currentUserId,
		);
		return (
			otherMember?.nickname ||
			otherMember?.fullname ||
			conversation.name ||
			`Conversation #${fallbackConversationId}`
		);
	};

	const _inputDialogTitle =
		inputDialog?.mode === "rename"
			? "Đổi tên cuộc trò chuyện"
			: inputDialog?.mode === "addMembers"
				? "Thêm thành viên"
				: inputDialog?.mode === "background"
					? "Tùy chỉnh giao diện"
					: inputDialog?.mode === "nickname"
						? `Đặt biệt danh cho ${inputDialog.participant?.fullname || "thành viên"}`
						: inputDialog?.mode === "searchMessages"
							? "Tìm kiếm tin nhắn"
							: "";

	const _inputDialogLabel =
		inputDialog?.mode === "rename"
			? "Tên cuộc trò chuyện"
			: inputDialog?.mode === "addMembers"
				? "User IDs (phân tách bằng dấu phẩy)"
				: inputDialog?.mode === "background"
					? "Theme/Background"
					: inputDialog?.mode === "nickname"
						? "Biệt danh"
						: inputDialog?.mode === "searchMessages"
							? "Nhập từ khóa"
							: "";
	const _isImageUploadMode = inputDialog?.mode === "background";
	const previewBackgroundRaw = inputDialog?.value || "";
	const _shouldShowBackgroundOverlay =
		isImageBackgroundValue(previewBackgroundRaw);
	const previewConversation =
		inputDialog?.mode === "background" ? inputDialog.conversation : undefined;
	const _previewConversationName = previewConversation
		? getConversationDisplayName(previewConversation, previewConversation.id)
		: "Cuộc trò chuyện";

	return (
		<MessengerEmojiProvider>
			<Box
				sx={{
					display: "flex",
					position: isMobile ? "fixed" : "absolute",
					inset: isMobile ? "auto" : 0,
					top: isMobile ? `${mobileViewport?.offsetTop ?? 0}px` : undefined,
					left: isMobile ? 0 : undefined,
					right: isMobile ? 0 : undefined,
					height: isMobile
						? mobileViewport?.height
							? `${mobileViewport.height}px`
							: "100dvh"
						: undefined,
					overflow: "hidden",
					overscrollBehavior: "contain",
				}}
			>
				{showSidebar && (
					<MessengerSidebar
						isMobile={isMobile}
						isSidebarCollapsed={isSidebarCollapsed}
						conversationTab={conversationTab}
						activeConversations={activeConversations}
						unreadConversations={unreadConversations}
						archivedConversations={archivedConversations}
						visibleConversations={visibleConversations}
						selectedConversationId={selectedConversationId}
						currentUserId={Number(currentUser?.id ?? 0)}
						onlineUserIds={onlineUserIds}
						ws={ws}
						searchAllKeyword={searchAllKeyword}
						searchAllLoading={searchAllLoading}
						isSidebarSearching={isSidebarSearching}
						searchGroupedResults={searchGroupedResults}
						searchAllUserResults={searchAllUserResults}
						onSearchKeywordChange={(value) => {
							setSearchAllKeyword(value);
							if (!value.trim()) {
								setSearchAllActive(false);
								setSearchAllResults([]);
								setSearchDetailConversationId(null);
								setSearchDetailResults([]);
							}
						}}
						onExitSidebarSearch={handleExitSidebarSearch}
						onChangeConversationTab={handleConversationTabChange}
						onSelectSearchConversationGroup={
							handleSelectSearchConversationGroup
						}
						onSelectUser={handleSelectUser}
						onOpenUserSearch={() => setOpenUserSearch(true)}
						onOpenCreateGroupDialog={handleOpenCreateGroupDialog}
						onSelectConversation={handleSelectConversation}
						onArchiveToggle={handleArchiveToggle}
						onDelete={handleDelete}
						onToggleNotifications={handleToggleNotifications}
						onLeaveConversation={handleLeaveConversation}
						onToggleSidebarCollapse={() =>
							setIsSidebarCollapsed((prev) => !prev)
						}
						loading={conversationsQuery.isLoading}
						hasMoreConversations={hasMoreConversations}
						loadingMoreConversations={loadingMoreConversations}
						onLoadMoreConversations={handleLoadMoreConversations}
					/>
				)}

				<MessengerContent
					isMobile={isMobile}
					showDetail={showDetail}
					showOverlayBackdrop={showOverlayBackdrop}
					showInfoPanel={showInfoPanel}
					shouldShowSearchDetailPanel={shouldShowSearchDetailPanel}
					selectedConversation={selectedConversation}
					selectedConversationId={selectedConversationId}
					currentUser={currentUser}
					searchAllKeyword={searchAllKeyword}
					searchDetailResults={searchDetailResults}
					searchDetailLoading={searchDetailLoading}
					displayedMessages={displayedMessages}
					hasMoreMessages={hasMoreMessages}
					messagesLoading={messagesQuery.isLoading}
					messagesError={messagesQuery.error?.message}
					isLoadingMoreMessages={
						searchedMessages ? false : isLoadingMoreMessages
					}
					unreadBoundaryMessageId={unreadBoundaryMessageId ?? undefined}
					shouldShowUnreadDivider={shouldShowUnreadDividerForSelected}
					initialUnreadScrollMessageId={
						initialUnreadScrollMessageId ?? undefined
					}
					replySenderName={replySenderName}
					editingMessage={editingMessage}
					replyingMessage={replyingMessage}
					useDefaultTheme={
						!selectedConversationTheme.backgroundColor ||
						isImageBackgroundValue(selectedConversationTheme.background)
					}
					chatBackground={toRenderableChatBackground(
						selectedConversationTheme.background,
						selectedConversationTheme.backgroundColor,
					)}
					chatSurface={selectedConversationTheme.backgroundColor}
					themePresetId={selectedConversationTheme.presetId}
					themes={themesQuery.data ?? []}
					incomingBubbleColor={selectedConversationTheme.incomingBubbleColor}
					outgoingBubbleColor={selectedConversationTheme.outgoingBubbleColor}
					incomingTextColor={selectedConversationTheme.incomingTextColor}
					outgoingTextColor={selectedConversationTheme.outgoingTextColor}
					onBack={handleBackToConversationList}
					onToggleInfoPanel={handleToggleInfoPanel}
					onSearchConversation={handleSearchConversation}
					onMuteConversation={handleMuteConversation}
					onRestoreConversation={(id) => {
						const conv = conversations.find((c) => c.id === id);
						if (conv) handleRestore(conv);
					}}
					onDeleteConversation={handleDelete}
					onLoadMoreMessages={handleLoadMoreMessages}
					onDeleteMessage={handleDeleteMessage}
					onEditMessage={handleEditMessage}
					onToggleReaction={handleToggleReaction}
					onRetryMessage={retryMessage}
					onSpeakMessage={handleSpeakMessage}
					onReplyMessage={handleReplyMessage}
					onCancelReply={handleCancelReply}
					onCancelEdit={handleCancelEdit}
					onSend={sendMessage}
					onCloseOverlayPanels={handleCloseOverlayPanels}
					onCloseInfoPanel={handleCloseInfoPanel}
					onCloseSearchDetailPanel={handleCloseSearchDetailPanel}
					onSelectSearchDetailMessage={handleSelectSearchDetailMessage}
					onRenameConversation={handleSaveConversationName}
					onUploadGroupAvatar={handleUploadGroupAvatar}
					onSaveConversationBackground={handleSaveConversationBackground}
					onChangeQuickReaction={handleChangeQuickReaction}
					onAddMember={handleAddMember}
					onLeaveConversation={handleLeaveConversation}
					onEditMemberNickname={handleEditMemberNickname}
					onRemoveMember={handleRemoveMember}
					onStartDirectConversation={handleStartDirectConversation}
					onCreateGroupWithUser={handleCreateGroupWithUser}
					onSearchDetailKeywordChange={(value) => setSearchAllKeyword(value)}
					onLoadMoreSearchDetail={loadMoreConversationSearchDetails}
					hasMoreSearchDetail={hasMoreSearchDetail}
					scrollToMessageId={scrollToMessageId}
					onScrollToMessageHandled={() => setScrollToMessageId(null)}
					draftText={currentDraft.text}
					draftImages={currentDraft.images}
					draftVideos={currentDraft.videos}
					draftFiles={currentDraft.files}
					onDraftChange={handleDraftChange}
					ws={ws}
				/>

				<input
					ref={groupAvatarInputRef}
					type="file"
					accept="image/*"
					hidden
					onChange={handleGroupAvatarFileSelected}
				/>

				{/* User search dialog */}
				<UserSearchDialog
					open={openUserSearch}
					onClose={() => setOpenUserSearch(false)}
					onSelect={handleSelectUser}
					loading={createConversation.isPending}
				/>

				{/* Add members search dialog */}
				<UserSearchDialog
					open={openAddMembersSearch}
					onClose={() => setOpenAddMembersSearch(false)}
					onSelect={handleAddMemberUserSearch}
				/>

				{/* Create group dialog */}
				<CreateGroupDialog
					open={openCreateGroupDialog}
					onClose={() => setOpenCreateGroupDialog(false)}
					onCreateGroup={handleCreateGroup}
					loading={createConversation.isPending}
					preselectedParticipants={createGroupPreselectedParticipants}
					currentUserId={Number(currentUser?.id ?? 0)}
				/>

				<MessengerDialogs
					confirmDialog={confirmDialog}
					onCloseConfirmDialog={closeConfirmDialog}
					onSubmitConfirmDialog={submitConfirmDialog}
					isNotificationsEnabled={isNotificationsEnabled}
					inputDialog={inputDialog}
					onCloseInputDialog={closeInputDialog}
					onSubmitInputDialog={_submitInputDialog}
					onInputDialogValueChange={handleInputDialogValueChange}
					onAddMemberUser={handleAddMemberUserSearch}
					onRemoveSelectedUser={_handleRemoveSelectedUser}
				/>
			</Box>
		</MessengerEmojiProvider>
	);
}
