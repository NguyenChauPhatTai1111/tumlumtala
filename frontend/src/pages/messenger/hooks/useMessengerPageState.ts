import type {
	FilePreview,
	ImagePreview,
	VideoPreview,
} from "@components/messenger/composer/types";
import {
	buildGradientFromStops,
	clampStopPosition,
	isImageBackgroundValue,
	toRenderableChatBackground,
} from "@components/messenger/utils/background";
import { getReadableTextColor } from "@components/messenger/utils/color";
import {
	DEFAULT_BACKGROUND_COLOR,
	DEFAULT_GRADIENT_ANGLE,
	DEFAULT_INCOMING_BUBBLE_COLOR,
	DEFAULT_INCOMING_TEXT_COLOR,
	DEFAULT_OUTGOING_BUBBLE_COLOR,
	DEFAULT_OUTGOING_TEXT_COLOR,
	MESSAGE_PAGE_SIZE,
} from "@constants/messenger";
import { useMediaQuery, useTheme } from "@mui/material";
import type {
	ConversationConfirmDialogState,
	ConversationInputDialogState,
	ConversationThemeConfig,
	GradientStop,
} from "@pages/messenger/types/messenger";
import { useCallback, useRef, useState } from "react";
import type { Conversation, Message } from "@/types/messenger";

export const useMessengerPageState = () => {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("md"));

	const [selectedConversationId, setSelectedConversationId] = useState<
		number | null
	>(null);
	const [justCreatedConversation, setJustCreatedConversation] =
		useState<Conversation | null>(null);
	const [pendingEmptyConversationId, setPendingEmptyConversationId] = useState<
		number | null
	>(null);
	const [_replyingMessage, setReplyingMessage] = useState<Message | null>(null);
	const [_editingMessage, setEditingMessage] = useState<Message | null>(null);
	const [conversationDrafts, setConversationDrafts] = useState<
		Record<
			number,
			{
				text: string;
				images: ImagePreview[];
				videos?: VideoPreview[];
				files?: FilePreview[];
			}
		>
	>({});
	const [openUserSearch, setOpenUserSearch] = useState(false);
	const [openAddMembersSearch, setOpenAddMembersSearch] = useState(false);
	const [openCreateGroupDialog, setOpenCreateGroupDialog] = useState(false);
	const [
		createGroupPreselectedParticipants,
		setCreateGroupPreselectedParticipants,
	] = useState<import("@/types/messenger").Participant[]>([]);
	const [showConversationList, setShowConversationList] = useState(true);
	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
	const [conversationTab, setConversationTab] = useState<
		"active" | "unread" | "archived"
	>("active");
	const [showInfoPanel, setShowInfoPanel] = useState(false);
	const [inputDialog, setInputDialog] =
		useState<ConversationInputDialogState | null>(null);
	const [confirmDialog, setConfirmDialog] =
		useState<ConversationConfirmDialogState | null>(null);
	const [searchedMessages, setSearchedMessages] = useState<Message[] | null>(
		null,
	);
	const [_searchKeyword, setSearchKeyword] = useState("");
	const [scrollToMessageId, setScrollToMessageId] = useState<number | null>(
		null,
	);
	const [olderMessages, setOlderMessages] = useState<Message[]>([]);
	const [pendingMessages, setPendingMessages] = useState<Message[]>([]);
	const [hasMoreOlderMessages, setHasMoreOlderMessages] = useState(true);
	const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
	const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
	const [_themePresetId, setThemePresetId] = useState("");
	const [backgroundColor, setBackgroundColor] = useState(
		DEFAULT_BACKGROUND_COLOR,
	);
	const gradientStopIdRef = useRef(100);
	const backgroundGradientAngle = DEFAULT_GRADIENT_ANGLE;
	const [backgroundGradientStops, setBackgroundGradientStops] = useState<
		GradientStop[]
	>([
		{ id: 1, color: "#ecf4ff", position: 0 },
		{ id: 2, color: "#d7e8ff", position: 100 },
	]);
	const [incomingBubbleColor, setIncomingBubbleColor] = useState(
		DEFAULT_INCOMING_BUBBLE_COLOR,
	);
	const [outgoingBubbleColor, setOutgoingBubbleColor] = useState(
		DEFAULT_OUTGOING_BUBBLE_COLOR,
	);
	const [incomingTextColor, setIncomingTextColor] = useState(
		DEFAULT_INCOMING_TEXT_COLOR,
	);
	const [outgoingTextColor, setOutgoingTextColor] = useState(
		DEFAULT_OUTGOING_TEXT_COLOR,
	);
	const [_conversationThemeOverrides, setConversationThemeOverrides] = useState<
		Record<number, ConversationThemeConfig>
	>({});
	const [avatarUploadConversationId, setAvatarUploadConversationId] = useState<
		number | null
	>(null);
	const [openingUnreadSnapshot, setOpeningUnreadSnapshot] = useState<{
		conversationId: number;
		lastReadSeq: number;
		unreadCount: number;
	} | null>(null);

	const unreadSearchDoneRef = useRef(false);
	const imageUploadInputRef = useRef<HTMLInputElement | null>(null);
	const groupAvatarInputRef = useRef<HTMLInputElement | null>(null);
	const shouldRestoreConversationListAfterPanelRef = useRef(false);
	const shouldRestoreSidebarCollapsedAfterPanelRef = useRef(false);
	const sidebarCollapsedBeforePanelRef = useRef(false);
	const showConversationListRef = useRef(showConversationList);
	const lastAutoReadMessageByConversationRef = useRef<Record<number, number>>(
		{},
	);
	const loadMoreInFlightRef = useRef(false);
	const nextOlderOffsetRef = useRef(MESSAGE_PAGE_SIZE);
	const unreadCursorSignatureRef = useRef<string | null>(null);

	const resetConversationThreadState = useCallback(() => {
		setOlderMessages([]);
		setPendingMessages([]);
		setHasMoreOlderMessages(true);
		setIsLoadingMoreMessages(false);
		loadMoreInFlightRef.current = false;
		nextOlderOffsetRef.current = MESSAGE_PAGE_SIZE;
		setReplyingMessage(null);
		setEditingMessage(null);
		unreadCursorSignatureRef.current = null;
	}, []);

	const resetResponsiveConversationState = useCallback(() => {
		setShowConversationList(true);
		shouldRestoreConversationListAfterPanelRef.current = false;
		shouldRestoreSidebarCollapsedAfterPanelRef.current = false;
		sidebarCollapsedBeforePanelRef.current = false;
	}, []);

	const clearJustCreatedConversation = useCallback(() => {
		setJustCreatedConversation(null);
	}, []);

	const _closeInputDialog = useCallback(() => {
		setSelectedImageFile(null);
		setThemePresetId("");
		setBackgroundColor(DEFAULT_BACKGROUND_COLOR);
		setIncomingBubbleColor(DEFAULT_INCOMING_BUBBLE_COLOR);
		setOutgoingBubbleColor(DEFAULT_OUTGOING_BUBBLE_COLOR);
		setIncomingTextColor(DEFAULT_INCOMING_TEXT_COLOR);
		setOutgoingTextColor(DEFAULT_OUTGOING_TEXT_COLOR);
		setInputDialog(null);
	}, []);

	const applyBackgroundGradientStops = useCallback(
		(nextStops: GradientStop[]) => {
			setBackgroundGradientStops(nextStops);
			const css = buildGradientFromStops(nextStops, backgroundGradientAngle);
			setBackgroundColor(css);
			setThemePresetId("");
			setSelectedImageFile(null);
			setInputDialog((prev) =>
				prev && prev.mode === "background" ? { ...prev, value: css } : prev,
			);
		},
		[],
	);

	const addBackgroundGradientStop = useCallback(() => {
		const nextStop: GradientStop = {
			id: gradientStopIdRef.current,
			color: "#ffffff",
			position: 50,
		};
		gradientStopIdRef.current += 1;
		applyBackgroundGradientStops([...backgroundGradientStops, nextStop]);
	}, [applyBackgroundGradientStops, backgroundGradientStops]);

	const removeBackgroundGradientStop = useCallback(
		(stopId: number) => {
			if (backgroundGradientStops.length <= 2) {
				return;
			}

			applyBackgroundGradientStops(
				backgroundGradientStops.filter((stop) => stop.id !== stopId),
			);
		},
		[applyBackgroundGradientStops, backgroundGradientStops],
	);

	const updateBackgroundGradientStop = useCallback(
		(stopId: number, patch: Partial<GradientStop>) => {
			applyBackgroundGradientStops(
				backgroundGradientStops.map((stop) =>
					stop.id === stopId
						? {
								...stop,
								...patch,
								position: clampStopPosition(patch.position ?? stop.position),
							}
						: stop,
				),
			);
		},
		[applyBackgroundGradientStops, backgroundGradientStops],
	);

	const selectedImagePreview = selectedImageFile
		? (inputDialog?.value ?? "")
		: "";

	const previewBackgroundRaw = selectedImagePreview || inputDialog?.value || "";
	const previewBackground = toRenderableChatBackground(
		previewBackgroundRaw,
		backgroundColor,
	);
	const previewIncomingTextColor = getReadableTextColor(incomingBubbleColor);
	const previewOutgoingTextColor = getReadableTextColor(outgoingBubbleColor);
	const _shouldShowBackgroundOverlay =
		isImageBackgroundValue(previewBackgroundRaw);

	const inputDialogTitle =
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

	const inputDialogLabel =
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

	return {
		// expose commonly used values with original names
		replyingMessage: _replyingMessage,
		editingMessage: _editingMessage,
		conversationThemeOverrides: _conversationThemeOverrides,
		// theme / responsive
		theme,
		isMobile,
		state: { selectedConversationId, isMobile },

		// conversation selection + thread state
		selectedConversationId,
		setSelectedConversationId,
		olderMessages,
		setOlderMessages,
		pendingMessages,
		setPendingMessages,
		hasMoreOlderMessages,
		setHasMoreOlderMessages,
		isLoadingMoreMessages,
		setIsLoadingMoreMessages,

		// dialog + UI flags
		inputDialog,
		setInputDialog,
		inputDialogTitle,
		inputDialogLabel,
		confirmDialog,
		setConfirmDialog,
		showConversationList,
		setShowConversationList,
		showInfoPanel,
		setShowInfoPanel,
		openUserSearch,
		setOpenUserSearch,
		openAddMembersSearch,
		setOpenAddMembersSearch,
		openCreateGroupDialog,
		setOpenCreateGroupDialog,
		createGroupPreselectedParticipants,
		setCreateGroupPreselectedParticipants,

		// conversation lists / tabs
		conversationTab,
		setConversationTab,

		// backgrounds / themes
		backgroundColor,
		setBackgroundColor,
		backgroundGradientAngle,
		backgroundGradientStops,
		setBackgroundGradientStops,
		applyBackgroundGradientStops,
		addBackgroundGradientStop,
		removeBackgroundGradientStop,
		updateBackgroundGradientStop,
		incomingBubbleColor,
		setIncomingBubbleColor,
		outgoingBubbleColor,
		setOutgoingBubbleColor,
		incomingTextColor,
		setIncomingTextColor,
		outgoingTextColor,
		setOutgoingTextColor,

		// preview / uploads
		selectedImageFile,
		setSelectedImageFile,
		themePresetId: _themePresetId,
		selectedImagePreview,
		previewBackground,
		previewBackgroundRaw,
		previewIncomingTextColor,
		previewOutgoingTextColor,

		// creation / pending state
		justCreatedConversation,
		setJustCreatedConversation,
		clearJustCreatedConversation,
		pendingEmptyConversationId,
		setPendingEmptyConversationId,
		avatarUploadConversationId,
		setAvatarUploadConversationId,
		openingUnreadSnapshot,
		setOpeningUnreadSnapshot,
		conversationDrafts,
		setConversationDrafts,
		isSidebarCollapsed,
		setIsSidebarCollapsed,

		// search / messages
		searchedMessages,
		setSearchedMessages,
		scrollToMessageId,
		setScrollToMessageId,

		// refs + helpers
		gradientStopIdRef,
		imageUploadInputRef,
		groupAvatarInputRef,
		showConversationListRef,
		sidebarCollapsedBeforePanelRef,
		shouldRestoreConversationListAfterPanelRef,
		shouldRestoreSidebarCollapsedAfterPanelRef,
		lastAutoReadMessageByConversationRef,
		loadMoreInFlightRef,
		nextOlderOffsetRef,
		unreadCursorSignatureRef,
		unreadSearchDoneRef,

		// actions
		resetConversationThreadState,
		resetResponsiveConversationState,

		// internal setters exposed
		setEditingMessage,
		setReplyingMessage,
		setThemePresetId,
		setConversationThemeOverrides,
		setSearchKeyword,
	};
};
