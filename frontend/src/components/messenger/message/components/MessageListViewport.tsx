import { MessageListTypingIndicator } from "@components/messenger/typing/MessageListTypingIndicator";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import { Box, CircularProgress, IconButton, Typography } from "@mui/material";
import { useCurrentUser } from "@hooks/common/useCurrentUser";
import {
	type Dispatch,
	type RefObject,
	type SetStateAction,
	type UIEvent,
	useState,
} from "react";
import type { IUser } from "@/types";
import type { Conversation, Message } from "@/types/messenger";
import { formatTimestamp } from "@/utils";
import { ContextMenu, type MessageContextMenuState } from "./ContextMenu";
import { MessageListRow } from "./MessageListRow";

type SenderProfile = {
	name?: string;
	avatar?: string;
};

type SeenParticipant = {
	id: number;
	name?: string;
	avatar?: string;
	last_read_at?: string | null;
};

type MessageListViewportProps = {
	messageListRef: RefObject<HTMLDivElement | null>;
	messagesEndRef: RefObject<HTMLDivElement | null>;
	chatBackground?: string;
	hasImageBackground: boolean;
	loadingMore: boolean;
	sortedMessages: Message[];
	conversation?: Conversation;
	conversationAvatar?: string;
	currentUserId: string;
	currentUserNumericId: number;
	messagesById: Map<number, Message>;
	getSenderProfile: (senderId: string) => SenderProfile;
	getSeenParticipantsForMessage: (message: Message) => SeenParticipant[];
	seenReceipts: Map<number, unknown[]>;
	seenSeqByUser: Map<number, number>;
	maxSeenSeqFromReceiptsByUser: Map<number, number>;
	latestOutgoingMessageSeq: number;
	deliveredSeq: number;
	hasUnreadMessagesByBoundary: boolean;
	hasUnreadBoundaryById: boolean;
	unreadBoundarySeq: number;
	unreadDividerTargetMessageId: number | null;
	hoveredGroupStartMessageId: number | null;
	hoveredMessageId: number | null;
	highlightedMessageId: number | null;
	retryingMessageIds: Set<number>;
	outgoingBubbleColor?: string;
	incomingBubbleColor?: string;
	outgoingTextColor?: string;
	incomingTextColor?: string;
	overlayTextColor?: string;
	overlayMutedTextColor?: string;
	overlayBorderColor?: string;
	messageBlockGapMinutes: number;
	loadMoreTopThreshold: number;
	scrollToBottomInProgressRef: RefObject<boolean>;
	scrollToBottomTimeoutRef: RefObject<ReturnType<typeof setTimeout> | null>;
	typingParticipants: Array<{ id: number; name: string; avatar?: string }>;
	showScrollToBottomButton: boolean;
	onAutoScrollChange: (value: boolean) => void;
	onHideScrollToBottomButtonChange: (value: boolean) => void;
	onHoverMessageChange: Dispatch<SetStateAction<number | null>>;
	onRequestLoadMoreWithAnchor: () => boolean;
	onDeleteMessage?: (messageId: number) => void;
	onEditMessage?: (message: Message) => void;
	onToggleReaction?: (
		message: Message,
		reaction?: string,
		action?: "toggle" | "remove",
	) => void;
	onSpeakMessage?: (message: Message) => void | Promise<void>;
	onReplyMessage?: (message: Message) => void;
	onJumpToMessage: (messageId: number) => void;
	onViewHistories: (message: Message) => void;
	onRetryMessage: (message: Message) => Promise<void>;
	onScrollToBottom: () => void;
	onAvatarClick?: (anchor: HTMLElement, senderId: string) => void;
	formatTimestamp: (value: string) => string;
};

export const MessageListViewport = ({
	messageListRef,
	messagesEndRef,
	chatBackground,
	hasImageBackground,
	loadingMore,
	sortedMessages,
	conversation,
	conversationAvatar,
	currentUserId,
	currentUserNumericId,
	messagesById,
	getSenderProfile,
	getSeenParticipantsForMessage,
	seenReceipts,
	seenSeqByUser,
	maxSeenSeqFromReceiptsByUser,
	latestOutgoingMessageSeq,
	deliveredSeq,
	hasUnreadMessagesByBoundary,
	hasUnreadBoundaryById,
	unreadBoundarySeq,
	unreadDividerTargetMessageId,
	hoveredGroupStartMessageId,
	hoveredMessageId,
	highlightedMessageId,
	retryingMessageIds,
	outgoingBubbleColor,
	incomingBubbleColor,
	outgoingTextColor,
	incomingTextColor,
	overlayTextColor,
	overlayMutedTextColor,
	overlayBorderColor,
	messageBlockGapMinutes,
	loadMoreTopThreshold,
	scrollToBottomInProgressRef,
	scrollToBottomTimeoutRef,
	typingParticipants,
	showScrollToBottomButton,
	onAutoScrollChange,
	onHideScrollToBottomButtonChange,
	onHoverMessageChange,
	onRequestLoadMoreWithAnchor,
	onDeleteMessage,
	onEditMessage,
	onToggleReaction,
	onReplyMessage,
	onJumpToMessage,
	onViewHistories,
	onRetryMessage,
	onScrollToBottom,
	onSpeakMessage,
	onAvatarClick,
}: MessageListViewportProps) => {
	const { data: currentUser } = useCurrentUser();
	const [ctxMenu, setCtxMenu] = useState<MessageContextMenuState | null>(null);

	const handleContextMenuOpen = (
		pos: { top: number; left: number },
		message: Message,
	) => setCtxMenu({ pos, message });

	const handleScroll = (event: UIEvent<HTMLDivElement>) => {
		const target = event.currentTarget;
		const isScrolledToBottom =
			target.scrollHeight - target.scrollTop - target.clientHeight < 50;
		onAutoScrollChange(isScrolledToBottom);

		if (scrollToBottomInProgressRef.current && isScrolledToBottom) {
			scrollToBottomInProgressRef.current = false;
			if (scrollToBottomTimeoutRef.current) {
				clearTimeout(scrollToBottomTimeoutRef.current);
				scrollToBottomTimeoutRef.current = null;
			}
		}

		if (!isScrolledToBottom && !scrollToBottomInProgressRef.current) {
			onHideScrollToBottomButtonChange(false);
		}

		const isNearTop =
			target.scrollTop <= loadMoreTopThreshold &&
			target.scrollHeight > target.clientHeight + 200;

		if (isNearTop && !loadingMore) {
			onRequestLoadMoreWithAnchor();
		}
	};

	return (
		<>
			<Box
				ref={messageListRef}
				className="message-list-viewport"
				sx={{
					height: "100%",
					...(chatBackground
						? {
								background: chatBackground,
								backgroundSize: "cover",
								backgroundPosition: "center",
							}
						: { backgroundColor: "background.default" }),
					position: "relative",
					...(hasImageBackground
						? {
								"&::before": {
									content: '""',
									position: "absolute",
									inset: 0,
									background: "rgba(14, 23, 38, 0.34)",
									zIndex: 0,
								},
								"& > *": {
									position: "relative",
									zIndex: 1,
								},
							}
						: null),
					display: "flex",
					overflowY: "auto",
					overflowX: "hidden",
					flexDirection: "column",
					scrollBehavior: "auto",
					pr: 0,
					pb: 2,
					pt: 0,
					zIndex: 100,
				}}
				onScroll={handleScroll}
			>
				{loadingMore && (
					<Box sx={{ display: "flex", justifyContent: "center", py: 0.5 }}>
						<CircularProgress size={24} />
					</Box>
				)}

				{sortedMessages.length === 0 ? (
					<Box
						sx={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							flex: 1,
						}}
					>
						<Typography color="text.secondary">
							Chưa có tin nhắn. Hãy gửi tin nhắn đầu tiên!
						</Typography>
					</Box>
				) : (
					sortedMessages.map((message, index) => (
						<MessageListRow
							key={message.temp_id || message.id}
							message={message}
							index={index}
							sortedMessages={sortedMessages}
							conversation={conversation}
							conversationAvatar={conversationAvatar}
							currentUserId={currentUserId}
							currentUserNumericId={currentUserNumericId}
							messagesById={messagesById}
							getSenderProfile={getSenderProfile}
							getSeenParticipantsForMessage={getSeenParticipantsForMessage}
							seenReceipts={seenReceipts}
							seenSeqByUser={seenSeqByUser}
							maxSeenSeqFromReceiptsByUser={maxSeenSeqFromReceiptsByUser}
							latestOutgoingMessageSeq={latestOutgoingMessageSeq}
							deliveredSeq={deliveredSeq}
							hasUnreadMessagesByBoundary={hasUnreadMessagesByBoundary}
							hasUnreadBoundaryById={hasUnreadBoundaryById}
							unreadBoundarySeq={unreadBoundarySeq}
							unreadDividerTargetMessageId={unreadDividerTargetMessageId}
							hoveredGroupStartMessageId={hoveredGroupStartMessageId}
							hoveredMessageId={hoveredMessageId}
							highlightedMessageId={highlightedMessageId}
							contextMenuMessageId={ctxMenu?.message.id ?? null}
							retryingMessageIds={retryingMessageIds}
							outgoingBubbleColor={outgoingBubbleColor}
							incomingBubbleColor={incomingBubbleColor}
							outgoingTextColor={outgoingTextColor}
							incomingTextColor={incomingTextColor}
							overlayTextColor={overlayTextColor}
							overlayMutedTextColor={overlayMutedTextColor}
							overlayBorderColor={overlayBorderColor}
							messageBlockGapMinutes={messageBlockGapMinutes}
							onHoverMessageChange={onHoverMessageChange}
							onDeleteMessage={onDeleteMessage}
							onEditMessage={onEditMessage}
							onToggleReaction={onToggleReaction}
							onReplyMessage={onReplyMessage}
							onSpeakMessage={onSpeakMessage}
							onJumpToMessage={onJumpToMessage}
							onViewHistories={onViewHistories}
							formatTimestamp={formatTimestamp}
							onRetryMessage={onRetryMessage}
							onContextMenuOpen={handleContextMenuOpen}
							onAvatarClick={onAvatarClick}
						/>
					))
				)}

				{typingParticipants.length > 0 && (
					<Box
						sx={{
							display: "flex",
							alignItems: "flex-end",
							px: 3,
							position: "sticky",
							bottom: 0,
							zIndex: 3,
							pointerEvents: "none",
						}}
					>
						<MessageListTypingIndicator users={typingParticipants} />
					</Box>
				)}

				<div ref={messagesEndRef} />
			</Box>

			<ContextMenu
				ctxMenu={ctxMenu}
				currentUser={currentUser}
				currentUserId={currentUserId}
				sortedMessages={sortedMessages}
				getSenderProfile={getSenderProfile}
				formatTimestamp={formatTimestamp}
				onClose={() => setCtxMenu(null)}
				onToggleReaction={onToggleReaction}
				onReplyMessage={onReplyMessage}
				onEditMessage={onEditMessage}
				onViewHistories={onViewHistories}
				onDeleteMessage={onDeleteMessage}
			/>

			{showScrollToBottomButton && (
				<Box
					sx={{
						position: "absolute",
						left: "50%",
						bottom: 10,
						transform: "translateX(-50%)",
						zIndex: 110,
						pointerEvents: "none",
					}}
				>
					<IconButton
						size="small"
						onClick={onScrollToBottom}
						sx={{
							pointerEvents: "auto",
							bgcolor: "background.paper",
							border: "1px solid",
							borderColor: "divider",
							boxShadow: 2,
							animation: "messengerScrollDownBounce 1.2s ease-in-out infinite",
							"@keyframes messengerScrollDownBounce": {
								"0%, 100%": { transform: "translateY(0)" },
								"50%": { transform: "translateY(4px)" },
							},
							"&:hover": { bgcolor: "action.hover" },
						}}
					>
						<KeyboardArrowDownRoundedIcon fontSize="small" />
					</IconButton>
				</Box>
			)}
		</>
	);
};
