import { MessageHistoryDialog } from "@components/messenger/dialogs/MessageHistoryDialog";
import { MessageListViewport } from "@components/messenger/message/components/MessageListViewport";
import type { MessageListProps } from "@components/messenger/types/messages";
import { useMessengerMessageListModel } from "@hooks/messenger";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useMessengerPresence } from "@/context/MessengerPresenceContext";
import { formatTimestamp } from "@/utils";

export const MessageList = ({
	messages,
	conversation,
	chatBackground,
	outgoingBubbleColor,
	incomingBubbleColor,
	outgoingTextColor,
	incomingTextColor,
	loading,
	error,
	loadingMore,
	onLoadMore,
	unreadBoundaryMessageId,
	showUnreadDivider,
	initialUnreadScrollMessageId,
	onInitialUnreadScrollHandled,
	onDeleteMessage,
	onEditMessage,
	onToggleReaction,
	onRetryMessage,
	onReplyMessage,
	onSpeakMessage,
	scrollToMessageId,
	onScrollToMessageHandled,
	onAvatarClick,
	ws,
}: MessageListProps) => {
	const onlineUserIds = useMessengerPresence();
	const {
		messageListRef,
		messagesEndRef,
		scrollToBottomTimeoutRef,
		scrollToBottomInProgressRef,
		sortedMessages,
		currentUserId,
		currentUserNumericId,
		overlayTextColor,
		overlayMutedTextColor,
		overlayBorderColor,
		conversationAvatar,
		messagesById,
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
		selectedHistories,
		historyDialogOpen,
		typingParticipants,
		showScrollToBottomButton,
		getSenderProfile,
		getSeenParticipantsForMessage,
		scrollToMessageAndHighlight,
		handleViewHistories,
		handleRetryMessage,
		handleScrollToBottom,
		requestLoadMoreWithAnchor,
		setAutoScroll,
		setHideScrollToBottomButton,
		setHoveredMessageId,
		setHistoryDialogOpen,
		loadMoreTopThreshold,
		messageBlockGapMinutes,
	} = useMessengerMessageListModel({
		messages,
		conversation,
		chatBackground,
		loading,
		loadingMore,
		onLoadMore,
		unreadBoundaryMessageId,
		showUnreadDivider,
		initialUnreadScrollMessageId,
		onInitialUnreadScrollHandled,
		onRetryMessage,
		scrollToMessageId,
		onScrollToMessageHandled,
		ws,
	});

	if (loading) {
		return (
			<Box
				sx={{
					flex: 1,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<CircularProgress />
			</Box>
		);
	}

	if (error) {
		return (
			<Box
				sx={{
					flex: 1,
					height: "100%",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					p: 2,
				}}
			>
				<Typography color="error">{error}</Typography>
			</Box>
		);
	}

	return (
		<Box
			sx={{
				flex: 1,
				display: "flex",
				flexDirection: "column",
				minHeight: 0,
				position: "relative",
			}}
		>
			<MessageHistoryDialog
				open={historyDialogOpen}
				histories={selectedHistories}
				onClose={() => setHistoryDialogOpen(false)}
			/>
			<MessageListViewport
				messageListRef={messageListRef}
				messagesEndRef={messagesEndRef}
				chatBackground={chatBackground}
				loadingMore={loadingMore}
				sortedMessages={sortedMessages}
				conversation={conversation}
				conversationAvatar={conversationAvatar}
				currentUserId={currentUserId}
				currentUserNumericId={currentUserNumericId}
				onlineUserIds={onlineUserIds}
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
				retryingMessageIds={retryingMessageIds}
				outgoingBubbleColor={outgoingBubbleColor}
				incomingBubbleColor={incomingBubbleColor}
				outgoingTextColor={outgoingTextColor}
				incomingTextColor={incomingTextColor}
				overlayTextColor={overlayTextColor}
				overlayMutedTextColor={overlayMutedTextColor}
				overlayBorderColor={overlayBorderColor}
				messageBlockGapMinutes={messageBlockGapMinutes}
				loadMoreTopThreshold={loadMoreTopThreshold}
				scrollToBottomInProgressRef={scrollToBottomInProgressRef}
				scrollToBottomTimeoutRef={scrollToBottomTimeoutRef}
				typingParticipants={typingParticipants}
				showScrollToBottomButton={showScrollToBottomButton}
				onAutoScrollChange={setAutoScroll}
				onHideScrollToBottomButtonChange={setHideScrollToBottomButton}
				onHoverMessageChange={setHoveredMessageId}
				onRequestLoadMoreWithAnchor={requestLoadMoreWithAnchor}
				onDeleteMessage={onDeleteMessage}
				onEditMessage={onEditMessage}
				onToggleReaction={onToggleReaction}
				onReplyMessage={onReplyMessage}
				onJumpToMessage={scrollToMessageAndHighlight}
				onSpeakMessage={onSpeakMessage}
				onViewHistories={handleViewHistories}
				onRetryMessage={handleRetryMessage}
				onScrollToBottom={handleScrollToBottom}
				onAvatarClick={onAvatarClick}
				formatTimestamp={formatTimestamp}
			/>
		</Box>
	);
};
