import {
	MessageList,
	MessengerComposer,
	MessengerHeader,
} from "@components/messenger";
import { getVideoDuration } from "@components/messenger/composer/utils/videoValidation";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import PaletteIcon from "@mui/icons-material/Palette";
import RocketLaunchOutlinedIcon from "@mui/icons-material/RocketLaunchOutlined";
import SearchIcon from "@mui/icons-material/Search";
import {
	Box,
	Fade,
	ListItemIcon,
	Menu,
	MenuItem,
	Slide,
	Typography,
} from "@mui/material";
import MessengerCustomizeDialog from "@pages/messenger/dialogs/MessengerCustomizeDialog";
import { memo, useCallback, useRef, useState } from "react";
import type { MessengerWebSocketService } from "@/services/messengerWebSocketService";
import type { IUser } from "@/types";
import type {
	Conversation,
	Message,
	Participant,
	SendMessagePayloadItem,
} from "@/types/messenger";
import type { ITheme } from "@/types/theme";
import { MessengerLanding } from "./MessengerLanding";
import {
	MessengerInfoPanel,
	MessengerSearchDetailPanel,
} from "./MessengerPanels";
import { useGlobalCall } from "@/features/calls";
import { useSwipeBack } from "@/hooks/ui/useSwipeBack";

export type MessengerContentProps = {
	isMobile: boolean;
	showDetail: boolean;
	showOverlayBackdrop: boolean;
	showInfoPanel: boolean;
	shouldShowSearchDetailPanel: boolean;
	selectedConversation?: Conversation;
	selectedConversationId: number | null;
	currentUser?: IUser;
	searchAllKeyword: string;
	searchDetailResults: Message[];
	searchDetailLoading: boolean;
	displayedMessages: Message[];
	hasMoreMessages: boolean;
	messagesLoading: boolean;
	messagesError?: string;
	isLoadingMoreMessages: boolean;
	unreadBoundaryMessageId?: string;
	shouldShowUnreadDivider: boolean;
	initialUnreadScrollMessageId?: number;
	replySenderName: string;
	editingMessage: Message | null;
	replyingMessage: Message | null;
	useDefaultTheme: boolean;
	chatBackground?: string;
	chatSurface?: string;
	themePresetId?: string;
	themes?: ITheme[];
	incomingBubbleColor?: string;
	outgoingBubbleColor?: string;
	incomingTextColor?: string;
	outgoingTextColor?: string;
	overrideTextColor?: string;
	onBack: () => void;
	onToggleInfoPanel: () => void;
	onSearchConversation: () => void;
	onMuteConversation: () => void;
	onRestoreConversation: (id: number) => void;
	onDeleteConversation: (id: number) => void;
	onLoadMoreMessages: () => boolean;
	onDeleteMessage: (messageId: number) => void;
	onEditMessage: (message: Message) => void;
	onToggleReaction: (
		message: Message,
		reaction?: string,
		action?: "toggle" | "remove",
	) => Promise<void>;
	onSpeakMessage: (message: Message) => Promise<void>;
	onRetryMessage: (message: Message) => Promise<void>;
	onReplyMessage: (message: Message) => void;
	onCancelReply: () => void;
	onCancelEdit: () => void;
	draftText?: string;
	draftImages?: import("@components/messenger/composer/types").ImagePreview[];
	draftVideos?: import("@components/messenger/composer/types").VideoPreview[];
	draftFiles?: import("@components/messenger/composer/types").FilePreview[];
	onDraftChange?: (draft: {
		text: string;
		images: import("@components/messenger/composer/types").ImagePreview[];
		videos?: import("@components/messenger/composer/types").VideoPreview[];
		files?: import("@components/messenger/composer/types").FilePreview[];
	}) => void;
	onSend: (
		text: string | SendMessagePayloadItem[],
		type?: string,
		id?: number,
		options?: { tempId?: string; skipOptimistic?: boolean },
	) => Promise<boolean>;
	onCloseOverlayPanels: () => void;
	onCloseInfoPanel: () => void;
	onCloseSearchDetailPanel: () => void;
	onSelectSearchDetailMessage: (message: Message) => void;
	onRenameConversation: (
		conversation: Conversation,
		name: string,
	) => Promise<void>;
	onUploadGroupAvatar: (
		conversation: Conversation,
		file: File,
	) => Promise<void>;
	onSaveConversationBackground: (
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
	) => Promise<void>;
	onChangeQuickReaction: (
		conversation: Conversation,
		quickReaction: string,
	) => Promise<void>;
	onAddMember: (conversation: Conversation) => void;
	onLeaveConversation: (conversation: Conversation) => void;
	onEditMemberNickname: (participant: Participant) => void;
	onRemoveMember: (participant: Participant) => void;
	onStartDirectConversation?: (participant: Participant) => void;
	onCreateGroupWithUser?: (participant: Participant) => void;
	onSearchDetailKeywordChange: (value: string) => void;
	onLoadMoreSearchDetail: () => void;
	hasMoreSearchDetail: boolean;
	scrollToMessageId?: number | null;
	onScrollToMessageHandled: () => void;
	ws?: MessengerWebSocketService | null;
};

export const MessengerContent = memo(
	({
		isMobile,
		showDetail,
		showOverlayBackdrop,
		showInfoPanel,
		shouldShowSearchDetailPanel,
		selectedConversation,
		currentUser,
		selectedConversationId,
		draftText,
		draftImages,
		draftVideos,
		draftFiles,
		onDraftChange,
		searchAllKeyword,
		searchDetailResults,
		searchDetailLoading,
		displayedMessages,
		hasMoreMessages,
		messagesLoading,
		messagesError,
		isLoadingMoreMessages,
		unreadBoundaryMessageId,
		shouldShowUnreadDivider,
		initialUnreadScrollMessageId,
		replySenderName,
		editingMessage,
		replyingMessage,
		useDefaultTheme,
		chatBackground,
		chatSurface,
		themePresetId,
		themes,
		incomingBubbleColor,
		outgoingBubbleColor,
		incomingTextColor,
		outgoingTextColor,
		overrideTextColor,
		onBack,
		onToggleInfoPanel,
		onSearchConversation,
		onMuteConversation,
		onRestoreConversation,
		onDeleteConversation,
		onLoadMoreMessages,
		onDeleteMessage,
		onEditMessage,
		onToggleReaction,
		onSpeakMessage,
		onRetryMessage,
		onReplyMessage,
		onCancelReply,
		onCancelEdit,
		onSend,
		onCloseOverlayPanels,
		onCloseInfoPanel,
		onCloseSearchDetailPanel,
		onSelectSearchDetailMessage,
		onRenameConversation,
		onUploadGroupAvatar,
		onSaveConversationBackground,
		onChangeQuickReaction,
		onAddMember,
		onLeaveConversation,
		onEditMemberNickname,
		onRemoveMember,
		onStartDirectConversation,
		onCreateGroupWithUser,
		onSearchDetailKeywordChange,
		onLoadMoreSearchDetail,
		hasMoreSearchDetail,
		scrollToMessageId,
		onScrollToMessageHandled,
		ws,
	}: MessengerContentProps) => {
		const [contextMenuPos, setContextMenuPos] = useState<{
			top: number;
			left: number;
		} | null>(null);
		const [customizeOpen, setCustomizeOpen] = useState(false);
		const [isDragOverMessages, setIsDragOverMessages] = useState(false);
		const messageDragCounterRef = useRef(0);
		const [avatarMenuAnchor, setAvatarMenuAnchor] =
			useState<HTMLElement | null>(null);
		const [avatarMenuParticipant, setAvatarMenuParticipant] =
			useState<Participant | null>(null);
		const { startConversationCall, callState } = useGlobalCall();

		const swipeBack = useSwipeBack({
			onSwipe: onBack,
			disabled: !isMobile || !selectedConversation,
		});
		const isInActiveCall = [
			"permission_checking",
			"calling",
			"ringing",
			"connecting",
			"connected",
			"reconnecting",
		].includes(callState);
		const callDisabled =
			isInActiveCall ||
			!selectedConversation ||
			selectedConversation.is_group ||
			selectedConversation.participants.filter(
				(participant) => Number(participant.id) !== Number(currentUser?.id),
			).length !== 1;

		const handleAvatarClick = useCallback(
			(anchor: HTMLElement, senderId: string) => {
				if (!selectedConversation) return;
				const participant = selectedConversation.participants.find(
					(p) => String(p.id) === senderId,
				);
				if (!participant) return;
				setAvatarMenuAnchor(anchor);
				setAvatarMenuParticipant(participant);
			},
			[selectedConversation],
		);

		const handleCloseAvatarMenu = useCallback(() => {
			setAvatarMenuAnchor(null);
			setAvatarMenuParticipant(null);
		}, []);

		const handleMessageDragEnter = useCallback(
			(e: React.DragEvent<HTMLDivElement>) => {
				e.preventDefault();
				e.stopPropagation();
				messageDragCounterRef.current += 1;
				if (e.dataTransfer.types.includes("Files")) {
					setIsDragOverMessages(true);
				}
			},
			[],
		);

		const handleMessageDragLeave = useCallback(
			(e: React.DragEvent<HTMLDivElement>) => {
				e.preventDefault();
				e.stopPropagation();
				messageDragCounterRef.current -= 1;
				if (messageDragCounterRef.current === 0) {
					setIsDragOverMessages(false);
				}
			},
			[],
		);

		const handleMessageDragOver = useCallback(
			(e: React.DragEvent<HTMLDivElement>) => {
				e.preventDefault();
				e.stopPropagation();
			},
			[],
		);

		const handleMessageDrop = useCallback(
			async (e: React.DragEvent<HTMLDivElement>) => {
				e.preventDefault();
				e.stopPropagation();
				messageDragCounterRef.current = 0;
				setIsDragOverMessages(false);

				if (!selectedConversationId) return;

				const files = Array.from(e.dataTransfer.files);
				if (!files.length) return;

				await Promise.all(
					files.map(async (file) => {
						const type = file.type.startsWith("image/")
							? "image"
							: file.type.startsWith("video/")
								? "video"
								: "file";
						const duration =
							type === "video"
								? await getVideoDuration(file).catch(() => undefined)
								: undefined;
						return onSend([
							{
								type,
								content: file.name,
								file,
								metadata: {
									original_name: file.name,
									size: file.size,
									mime_type: file.type,
									...(duration
										? { duration: Math.round(duration * 1000) }
										: {}),
								},
							},
						]);
					}),
				);
			},
			[selectedConversationId, onSend],
		);

		if (!showDetail) {
			return null;
		}

		return (
			<Box
				ref={swipeBack.ref}
				sx={{
					display: "flex",
					flex: 1,
					minWidth: 0,
					position: "relative",
					height: "100%",
					overflow: "hidden",
				}}
			>
				<Fade in={showOverlayBackdrop} timeout={180} mountOnEnter unmountOnExit>
					<Box
						onClick={onCloseOverlayPanels}
						sx={{
							position: "absolute",
							inset: 0,
							bgcolor: "rgba(0,0,0,0.45)",
							zIndex: 110,
						}}
					/>
				</Fade>
				<Box
					sx={{
						flex: 1,
						display: "flex",
						flexDirection: "column",
						height: "100%",
						overflow: "hidden",
						...(chatBackground
							? {
									background: chatBackground,
									backgroundSize: "cover",
									backgroundPosition: "center",
								}
							: { bgcolor: "background.paper" }),
						minWidth: 0,
						minHeight: 0,
					}}
				>
					{!selectedConversation ? (
						<MessengerLanding />
					) : (
						<>
							<MessengerHeader
								conversation={selectedConversation}
								currentUser={currentUser}
								useDefaultTheme={useDefaultTheme}
								chatSurface={chatSurface}
								overrideTextColor={overrideTextColor}
								outgoingTextColor={outgoingTextColor}
								onRestore={(id) => onRestoreConversation(id)}
								onDelete={onDeleteConversation}
								onInfo={onToggleInfoPanel}
								onSearch={onSearchConversation}
								onMute={onMuteConversation}
								onAudioCall={() => startConversationCall(selectedConversation, "audio")}
								onVideoCall={() => startConversationCall(selectedConversation, "video")}
								callDisabled={callDisabled}
								callDisabledReason={
									isInActiveCall
										? "Bạn đang trong một cuộc gọi khác"
										: "Chỉ hỗ trợ cuộc trò chuyện 1-1"
								}
								showBackButton={isMobile}
								onBack={onBack}
							/>
							<Box
								sx={{
									flex: 1,
									minHeight: 0,
									display: "flex",
									flexDirection: "column",
									position: "relative",
								}}
								onContextMenu={(e) => {
									e.preventDefault();
									setContextMenuPos({ top: e.clientY, left: e.clientX });
								}}
								onDragEnter={handleMessageDragEnter}
								onDragLeave={handleMessageDragLeave}
								onDragOver={handleMessageDragOver}
								onDrop={handleMessageDrop}
							>
								{isDragOverMessages && (
									<Box
										sx={{
											position: "absolute",
											inset: 0,
											zIndex: 200,
											display: "flex",
											flexDirection: "column",
											alignItems: "center",
											justifyContent: "center",
											gap: 1,
											bgcolor: (theme) =>
												theme.palette.mode === "dark"
													? "rgba(15,30,60,0.92)"
													: "rgba(235,245,255,0.95)",
											border: "2px dashed",
											borderColor: "primary.main",
											borderRadius: 2,
											pointerEvents: "none",
										}}
									>
										<RocketLaunchOutlinedIcon
											sx={{ fontSize: 40, color: "primary.main" }}
										/>
										<Typography
											variant="subtitle1"
											fontWeight={700}
											color="primary.main"
										>
											Gửi nhanh
										</Typography>
										<Typography variant="body2" color="text.secondary">
											Thả File hoặc Ảnh vào đây để gửi nhanh
										</Typography>
									</Box>
								)}
								<MessageList
									currentUser={currentUser}
									messages={displayedMessages}
									conversation={selectedConversation}
									chatBackground={chatBackground}
									incomingBubbleColor={incomingBubbleColor}
									outgoingBubbleColor={outgoingBubbleColor}
									incomingTextColor={incomingTextColor}
									outgoingTextColor={outgoingTextColor}
									loading={messagesLoading}
									error={messagesError}
									hasMore={hasMoreMessages}
									loadingMore={isLoadingMoreMessages}
									onLoadMore={onLoadMoreMessages}
									unreadBoundaryMessageId={unreadBoundaryMessageId ?? undefined}
									showUnreadDivider={shouldShowUnreadDivider}
									initialUnreadScrollMessageId={
										initialUnreadScrollMessageId ?? undefined
									}
									onInitialUnreadScrollHandled={onScrollToMessageHandled}
									onDeleteMessage={onDeleteMessage}
									onEditMessage={onEditMessage}
									onToggleReaction={onToggleReaction}
									onSpeakMessage={onSpeakMessage}
									onRetryMessage={onRetryMessage}
									onReplyMessage={onReplyMessage}
									scrollToMessageId={scrollToMessageId ?? undefined}
									onScrollToMessageHandled={onScrollToMessageHandled}
									onAvatarClick={handleAvatarClick}
									ws={ws}
								/>
							</Box>
							<MessengerComposer
								key={selectedConversationId ?? "none"}
								disabled={!selectedConversation}
								focusKey={selectedConversationId}
								replyMessage={replyingMessage}
								replySenderName={replySenderName}
								editingMessage={editingMessage}
								outgoingTextColor={outgoingTextColor}
								useDefaultTheme={useDefaultTheme}
								chatSurface={chatBackground}
								conversationId={selectedConversationId ?? undefined}
								draftText={draftText}
								draftImages={draftImages}
								draftVideos={draftVideos}
								draftFiles={draftFiles}
								onDraftChange={onDraftChange}
								ws={ws}
								onCancelReply={onCancelReply}
								onCancelEdit={onCancelEdit}
								onSend={onSend}
								quickReaction={selectedConversation.quick_reaction}
							/>
						</>
					)}
				</Box>

				<Menu
					open={Boolean(contextMenuPos)}
					onClose={() => setContextMenuPos(null)}
					anchorReference="anchorPosition"
					anchorPosition={contextMenuPos ?? undefined}
					transformOrigin={{ horizontal: "left", vertical: "top" }}
				>
					<MenuItem
						onClick={() => {
							setContextMenuPos(null);
							onMuteConversation();
						}}
					>
						<ListItemIcon>
							{selectedConversation?.notifications_enabled ? (
								<NotificationsOffIcon fontSize="small" />
							) : (
								<NotificationsActiveIcon fontSize="small" />
							)}
						</ListItemIcon>
						{selectedConversation?.notifications_enabled
							? "Tắt thông báo"
							: "Bật thông báo"}
					</MenuItem>
					<MenuItem
						onClick={() => {
							setContextMenuPos(null);
							onSearchConversation();
						}}
					>
						<ListItemIcon>
							<SearchIcon fontSize="small" />
						</ListItemIcon>
						Tìm kiếm
					</MenuItem>
					<MenuItem
						onClick={() => {
							setContextMenuPos(null);
							setCustomizeOpen(true);
						}}
					>
						<ListItemIcon>
							<PaletteIcon fontSize="small" />
						</ListItemIcon>
						Tùy chỉnh
					</MenuItem>
					{selectedConversation?.is_group && (
						<MenuItem
							onClick={() => {
								setContextMenuPos(null);
								if (selectedConversation) onAddMember(selectedConversation);
							}}
						>
							<ListItemIcon>
								<GroupAddIcon fontSize="small" />
							</ListItemIcon>
							Thêm thành viên
						</MenuItem>
					)}
				</Menu>

				<Menu
					anchorEl={avatarMenuAnchor}
					open={Boolean(avatarMenuAnchor)}
					onClose={handleCloseAvatarMenu}
				>
					{avatarMenuParticipant &&
						selectedConversation?.is_group &&
						Number(avatarMenuParticipant.id) !== Number(currentUser?.id) && (
							<MenuItem
								onClick={() => {
									handleCloseAvatarMenu();
									if (avatarMenuParticipant)
										onStartDirectConversation?.(avatarMenuParticipant);
								}}
							>
								Trò chuyện trực tiếp
							</MenuItem>
						)}
					<MenuItem
						onClick={() => {
							handleCloseAvatarMenu();
							if (avatarMenuParticipant)
								onEditMemberNickname(avatarMenuParticipant);
						}}
					>
						Đổi nickname
					</MenuItem>
					{avatarMenuParticipant &&
						selectedConversation?.is_group &&
						selectedConversation.created_by === Number(currentUser?.id) &&
						Number(avatarMenuParticipant.id) !== Number(currentUser?.id) && (
							<MenuItem
								onClick={() => {
									handleCloseAvatarMenu();
									if (avatarMenuParticipant)
										onRemoveMember(avatarMenuParticipant);
								}}
								sx={{ color: "error.main" }}
							>
								Xóa khỏi nhóm
							</MenuItem>
						)}
				</Menu>

				{selectedConversation && (
					<MessengerCustomizeDialog
						key={`ctx-customize-${selectedConversation.id}`}
						open={customizeOpen}
						conversation={selectedConversation}
						initialThemePresetId={themePresetId}
						themes={themes}
						onClose={() => setCustomizeOpen(false)}
						onRename={onRenameConversation}
						onChangeGroupAvatar={onUploadGroupAvatar}
						onChangeBackground={onSaveConversationBackground}
						onChangeQuickReaction={onChangeQuickReaction}
					/>
				)}

				<Slide
					direction="left"
					in={Boolean(showInfoPanel && selectedConversation)}
					timeout={220}
					mountOnEnter
					unmountOnExit
				>
					<Box
						sx={{
							position: "absolute",
							right: 0,
							top: 0,
							bottom: 0,
							zIndex: 120,
							width: isMobile ? "100%" : 360,
							maxWidth: "100%",
						}}
					>
						<MessengerInfoPanel
							open={Boolean(showInfoPanel && selectedConversation)}
							conversation={selectedConversation}
							currentUser={currentUser}
							themePresetId={themePresetId}
							themes={themes}
							onClose={onCloseInfoPanel}
							onDeleteConversation={onDeleteConversation}
							onMute={onMuteConversation}
							onSearch={onSearchConversation}
							onRename={onRenameConversation}
							onChangeGroupAvatar={onUploadGroupAvatar}
							onChangeBackground={onSaveConversationBackground}
							onChangeQuickReaction={onChangeQuickReaction}
							onAddMember={onAddMember}
							onLeaveConversation={onLeaveConversation}
							onEditMemberNickname={onEditMemberNickname}
							onRemoveMember={onRemoveMember}
							onStartDirectConversation={onStartDirectConversation}
							onCreateGroupWithUser={onCreateGroupWithUser}
						/>
					</Box>
				</Slide>

				<Slide
					direction="left"
					in={shouldShowSearchDetailPanel}
					timeout={220}
					mountOnEnter
					unmountOnExit
				>
					<Box
						sx={{
							position: "absolute",
							right: 0,
							top: 0,
							bottom: 0,
							zIndex: 130,
							width: isMobile ? "100%" : 360,
							maxWidth: "100%",
						}}
					>
						<MessengerSearchDetailPanel
							open={shouldShowSearchDetailPanel}
							selectedConversation={selectedConversation}
							currentUser={currentUser}
							searchAllKeyword={searchAllKeyword}
							searchDetailResults={searchDetailResults}
							searchDetailLoading={searchDetailLoading}
							hasMoreSearchDetail={hasMoreSearchDetail}
							onKeywordChange={onSearchDetailKeywordChange}
							onClose={onCloseSearchDetailPanel}
							onSelectMessage={onSelectSearchDetailMessage}
							onLoadMoreSearchDetail={onLoadMoreSearchDetail}
						/>
					</Box>
				</Slide>

			</Box>
		);
	},
);
