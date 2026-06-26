import { AdminKeyBadge } from "@components/messenger/AdminKeyBadge";
import type { MessageListRowProps } from "@components/messenger/types/messages";
import { buildGeneratedAvatar } from "@components/messenger/utils/avatar";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import ErrorIcon from "@mui/icons-material/Error";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import RefreshIcon from "@mui/icons-material/Refresh";
import ReplyIcon from "@mui/icons-material/Reply";
import {
	Avatar,
	Box,
	CircularProgress,
	IconButton,
	Tooltip,
	Typography,
} from "@mui/material";
import { memo } from "react";
import { formatTimestampV2, resolveCdnUrl } from "@/utils";
import { MessageListBubble } from "./MessageListBubble";

export const MessageListRow = memo(
	({
		message,
		index,
		sortedMessages,
		conversation,
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
		contextMenuMessageId,
		retryingMessageIds,
		outgoingBubbleColor,
		incomingBubbleColor,
		outgoingTextColor,
		incomingTextColor,
		overlayTextColor,
		overlayMutedTextColor,
		overlayBorderColor,
		messageBlockGapMinutes,
		onHoverMessageChange,
		onDeleteMessage,
		onEditMessage,
		onToggleReaction,
		onReplyMessage,
		onJumpToMessage,
		onViewHistories,
		onRetryMessage,
		onContextMenuOpen,
		onSpeakMessage,
		onAvatarClick,
	}: MessageListRowProps) => {
		const isCurrentUserSender =
			Boolean(currentUserId) &&
			currentUserId !== "undefined" &&
			String(message.sender_id) === String(currentUserId);
		const senderProfile = getSenderProfile(message.sender_id);
		const isSenderAdmin =
			conversation?.is_group === true &&
			conversation.participants?.some(
				(p) =>
					String(p.id) === message.sender_id &&
					(p.role === "admin" || p.id === conversation.created_by),
			);
		const senderAvatarSrc =
			resolveCdnUrl(senderProfile.avatar) ||
			buildGeneratedAvatar(senderProfile.name);
		const senderFallback = (senderProfile.name || "U")
			.slice(0, 1)
			.toUpperCase();
		const repliedMessage = message.reply_to_message_id
			? messagesById.get(message.reply_to_message_id)
			: undefined;
		const repliedSenderProfile = repliedMessage
			? getSenderProfile(repliedMessage.sender_id)
			: undefined;
		const previousMessage = index > 0 ? sortedMessages[index - 1] : null;
		const nextMessage =
			index < sortedMessages.length - 1 ? sortedMessages[index + 1] : null;
		const currentTime = new Date(message.created_at).getTime();
		const previousTime = previousMessage
			? new Date(previousMessage.created_at).getTime()
			: currentTime;
		const nextTime = nextMessage
			? new Date(nextMessage.created_at).getTime()
			: currentTime;
		const gapFromPreviousMinutes = previousMessage
			? (currentTime - previousTime) / (1000 * 60)
			: Number.POSITIVE_INFINITY;
		const gapToNextMinutes = nextMessage
			? (nextTime - currentTime) / (1000 * 60)
			: Number.POSITIVE_INFINITY;
		const hasLargeGapFromPrevious =
			gapFromPreviousMinutes > messageBlockGapMinutes;
		const hasLargeGapToNext = gapToNextMinutes > messageBlockGapMinutes;
		const isDifferentSender =
			!previousMessage || previousMessage.sender_id !== message.sender_id;
		const currentMessageSeq = Number(
			message.message_seq ?? message.seq ?? message.id,
		);
		const previousMessageSeq = previousMessage
			? Number(
					previousMessage.message_seq ??
						previousMessage.seq ??
						previousMessage.id,
				)
			: Number.NaN;
		const _nextMessageSeq = nextMessage
			? Number(nextMessage.message_seq ?? nextMessage.seq ?? nextMessage.id)
			: Number.NaN;
		const canCompareUnreadBoundaryById =
			hasUnreadBoundaryById &&
			Number.isFinite(unreadBoundarySeq) &&
			Number.isFinite(currentMessageSeq);
		const isCurrentMessageUnreadById =
			canCompareUnreadBoundaryById &&
			!isCurrentUserSender &&
			currentMessageSeq > unreadBoundarySeq;
		const wasPreviousMessageUnreadById =
			canCompareUnreadBoundaryById &&
			previousMessage &&
			String(previousMessage.sender_id) !== String(currentUserId) &&
			Number.isFinite(previousMessageSeq) &&
			previousMessageSeq > unreadBoundarySeq;
		const hasUnreadBreakBeforeCurrent =
			canCompareUnreadBoundaryById &&
			isCurrentMessageUnreadById &&
			!wasPreviousMessageUnreadById;
		const isDifferentBlockFromPrevious =
			isDifferentSender ||
			hasLargeGapFromPrevious ||
			hasUnreadBreakBeforeCurrent;
		const isLastInSenderGroup =
			!nextMessage ||
			nextMessage.sender_id !== message.sender_id ||
			hasLargeGapToNext;
		const isPrivateConversation = !conversation?.is_group;
		const canShowAvatarColumn = isPrivateConversation || !isCurrentUserSender;
		const shouldShowSenderAvatar = canShowAvatarColumn && isLastInSenderGroup;
		const shouldShowSenderMeta =
			!isCurrentUserSender && isDifferentBlockFromPrevious;
		const shouldShowTimestampOnRow = hasLargeGapFromPrevious || index === 0;
		const formattedTime = formatTimestampV2(message.created_at);
		const senderName = senderProfile.name || "Người dùng";
		const repliedToName = message.reply_to_message_id
			? repliedMessage
				? String(repliedMessage.sender_id) === String(currentUserId)
					? "bạn"
					: repliedSenderProfile?.name || "Người dùng"
				: null
			: null;
		const senderMetaBase = repliedToName
			? `${senderName} trả lời ${repliedToName}`
			: senderName;
		const senderMetaLabel =
			hoveredGroupStartMessageId === message.id
				? `${senderMetaBase} • ${formattedTime}`
				: senderMetaBase;
		const shouldShowOwnHoverTime =
			hoveredGroupStartMessageId === message.id && isCurrentUserSender;
		const numericMessageSeq = Number(
			message.message_seq ?? message.seq ?? message.id,
		);
		const seenParticipants = getSeenParticipantsForMessage(message);
		const messageReceipts = seenReceipts.get(Number(message.id)) ?? [];

		const maxReadCursorSeq =
			conversation?.participants?.reduce((maxSeq, participant) => {
				if (
					participant.id === currentUserNumericId ||
					String(participant.id) === message.sender_id
				) {
					return maxSeq;
				}

				const liveReadSeq = seenSeqByUser.get(participant.id) ?? 0;
				const persistedReadSeq = Number(participant.last_read_seq ?? 0);
				const receiptReadSeq =
					maxSeenSeqFromReceiptsByUser.get(participant.id) ?? 0;
				return Math.max(maxSeq, liveReadSeq, persistedReadSeq, receiptReadSeq);
			}, 0) ?? 0;

		const isLatestMessageReadByAny =
			latestOutgoingMessageSeq > 0 &&
			maxReadCursorSeq >= latestOutgoingMessageSeq;
		const hasAnyReadCursor =
			Number.isFinite(numericMessageSeq) &&
			numericMessageSeq > 0 &&
			numericMessageSeq <= maxReadCursorSeq;
		const visibleSeenParticipants = seenParticipants;
		const maxVisibleSeenAvatars = 5;

		const visibleAvatars = visibleSeenParticipants.slice(
			0,
			maxVisibleSeenAvatars,
		);

		const _remainingCount =
			visibleSeenParticipants.length - visibleAvatars.length;
		const effectiveIsSeenByOthers =
			visibleSeenParticipants.length > 0 ||
			messageReceipts.length > 0 ||
			hasAnyReadCursor;

		const totalOtherParticipants =
			conversation?.participants?.filter((p) => p.id !== currentUserNumericId)
				.length ?? 0;

		const _isSeenByEveryone =
			Boolean(isPrivateConversation) &&
			totalOtherParticipants > 0 &&
			seenParticipants.length >= totalOtherParticipants;

		const isLastInList = index === sortedMessages.length - 1;
		const isLastIncomingMessage =
			!isCurrentUserSender &&
			sortedMessages
				.slice(index + 1)
				.every(
					(m) => m.sender_id === currentUserId || Boolean(m.activity_type),
				);
		const hasReaction = Boolean(
			message.my_reaction ||
				(message.reactions && message.reactions.length > 0),
		);
		const isMediaMessage =
			message.message_type === "image" || message.message_type === "video";
		const prevMessageHasReaction = previousMessage
			? Boolean(
					previousMessage.my_reaction ||
						(previousMessage.reactions && previousMessage.reactions.length > 0),
				)
			: false;
		const lastMessage = sortedMessages[sortedMessages.length - 1];
		const isLastMessageFromCurrentUser =
			lastMessage && String(lastMessage.sender_id) === String(currentUserId);
		const isLastOutgoingMessage =
			isCurrentUserSender &&
			lastMessage &&
			String(lastMessage.id) === String(message.id);
		const shouldShowStatusLabel =
			!isLatestMessageReadByAny &&
			!effectiveIsSeenByOthers &&
			isLastOutgoingMessage;
		const isDeliveredBySeq =
			Number.isFinite(numericMessageSeq) && numericMessageSeq <= deliveredSeq;
		const outgoingStatus: "sending" | "sent" | "delivered" | "seen" =
			message.pending
				? "sending"
				: effectiveIsSeenByOthers
					? "seen"
					: isDeliveredBySeq
						? "delivered"
						: "sent";
		const statusLabel =
			outgoingStatus === "sending"
				? "Đang gửi"
				: outgoingStatus === "sent"
					? "Đã gửi"
					: outgoingStatus === "delivered"
						? "Đã nhận"
						: "Đã xem";
		const shouldShowUnreadDivider =
			hasUnreadMessagesByBoundary &&
			canCompareUnreadBoundaryById &&
			message.id === unreadDividerTargetMessageId &&
			!isLastMessageFromCurrentUser;
		const shouldShowUnreadDividerTime =
			shouldShowUnreadDivider && !shouldShowTimestampOnRow;

		const activityText = (() => {
			if (!message.activity_type) return "";
			if (message.content?.trim()) return message.content;
			if (message.activity_metadata) {
				try {
					const md = JSON.parse(message.activity_metadata);
					if (typeof md === "string") return md;
					if (md && typeof md === "object") {
						if (md.nickname) return String(md.nickname);
						if (md.user_id) return `Người dùng ${md.user_id}`;
						return JSON.stringify(md);
					}
				} catch {
					return message.activity_metadata;
				}
			}

			const labels: Record<string, string> = {
				left_group: "Rời nhóm",
				member_removed: "Thành viên bị xóa",
				member_added: "Thành viên mới được thêm",
				group_avatar_changed: "Đổi ảnh đại diện nhóm",
				theme_changed: "Đổi nền trò chuyện",
				nickname_changed: "Thay đổi biệt danh",
				call_ended: "Cuộc gọi đã kết thúc",
				call_missed: "Cuộc gọi nhỡ",
				call_rejected: "Cuộc gọi bị từ chối",
				call_cancelled: "Cuộc gọi bị hủy",
			};

			if (message.activity_type?.startsWith("call_") && message.activity_metadata) {
				try {
					const meta = JSON.parse(message.activity_metadata) as {
						call_type?: string;
						duration_seconds?: number;
					};
					const icon = meta.call_type === "audio" ? "📞" : "📹";
					const base = labels[message.activity_type] ?? message.activity_type;
					const secs = meta.duration_seconds ?? 0;
					const duration = message.activity_type === "call_ended" && secs > 0
						? ` · ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`
						: "";
					return `${icon} ${base}${duration}`;
				} catch {
					// fall through
				}
			}

			return (
				labels[message.activity_type ?? ""] ||
				message.activity_type ||
				"Hoạt động"
			);
		})();

		return (
			<Box
				data-message-id={message.id}
				onMouseEnter={() => {
					if (!message.activity_type) {
						onHoverMessageChange(message.id);
					}
				}}
				onMouseLeave={() => {
					if (!message.activity_type) {
						onHoverMessageChange((current) =>
							current === message.id ? null : current,
						);
					}
				}}
				sx={{
					position: "relative",
					pr: 0.5,
					mb: isLastInList || isLastInSenderGroup || hasReaction ? 2 : 0.1,
				}}
			>
				{shouldShowUnreadDivider && (
					<Box
						sx={{
							display: "flex",
							alignItems: "center",
							gap: 1,
							mt: 0.25,
							mb: shouldShowUnreadDividerTime ? 0.35 : 1.25,
						}}
					>
						<Box
							sx={{
								flex: 1,
								height: "1px",
								bgcolor:
									outgoingTextColor || overlayTextColor || "primary.main",
							}}
						/>
						<Typography
							variant="caption"
							sx={{
								color: outgoingTextColor || overlayTextColor || "primary.main",
								fontWeight: 600,
								whiteSpace: "nowrap",
								px: 0.5,
							}}
						>
							Tin nhắn chưa đọc
						</Typography>
						<Box
							sx={{
								flex: 1,
								height: "1px",
								bgcolor:
									outgoingTextColor || overlayTextColor || "primary.main",
							}}
						/>
					</Box>
				)}
				{shouldShowUnreadDividerTime && (
					<Box sx={{ display: "flex", justifyContent: "center", mb: 1, mt: 2 }}>
						<Typography
							variant="caption"
							sx={{
								textAlign: "center",
								flex: "0 0 auto",
								color: overlayMutedTextColor ?? "text.secondary",
							}}
						>
							{formattedTime}
						</Typography>
					</Box>
				)}
				{shouldShowTimestampOnRow && (
					<Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
						<Typography
							variant="caption"
							sx={{
								textAlign: "center",
								flex: "0 0 auto",
								color: overlayMutedTextColor ?? "text.secondary",
							}}
						>
							{formattedTime}
						</Typography>
					</Box>
				)}
				{!message.activity_type && shouldShowSenderMeta && (
					<Box
						sx={{
							ml: canShowAvatarColumn ? 7 : 1,
							display: "flex",
							alignItems: "center",
							gap: 0.25,
						}}
					>
						{repliedToName && (
							<ReplyIcon
								sx={{
									fontSize: 12,
									color: overlayTextColor ?? "text.secondary",
								}}
							/>
						)}
						<Typography
							variant="caption"
							sx={{
								fontSize: "10px",
								fontWeight: 600,
								color: overlayTextColor ?? "text.secondary",
							}}
						>
							{senderMetaLabel}
						</Typography>
					</Box>
				)}
				{message.activity_type ? (
					<Box
						sx={{
							width: "100%",
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
						}}
					>
						<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
							<Box
								sx={{
									flex: 1,
									height: "1px",
									bgcolor: overlayMutedTextColor ?? "divider",
								}}
							/>
							<Typography
								variant="caption"
								sx={{
									color: isCurrentUserSender
										? outgoingTextColor ||
											(overlayTextColor ??
												overlayMutedTextColor ??
												"text.secondary")
										: incomingTextColor ||
											(overlayTextColor ??
												overlayMutedTextColor ??
												"text.secondary"),
									fontWeight: 600,
									px: 1,
									fontStyle: "italic",
								}}
							>
								{activityText}
							</Typography>
							<Box
								sx={{
									flex: 1,
									height: "1px",
									bgcolor: overlayMutedTextColor ?? "divider",
								}}
							/>
						</Box>
					</Box>
				) : (
					<Box sx={{ position: "relative" }}>
						{shouldShowOwnHoverTime && (
							<Typography
								variant="caption"
								sx={{
									position: "absolute",
									right: 0,
									top: -14,
									zIndex: 1,
									textAlign: "right",
									whiteSpace: "nowrap",
									fontSize: "10px",
									lineHeight: 1,
									pointerEvents: "none",
									color: overlayMutedTextColor ?? "text.secondary",
								}}
							>
								{formattedTime}
							</Typography>
						)}

						{!isCurrentUserSender ? (
							<Box
								sx={{
									display: "flex",
									flexDirection: "column",
									alignItems: "flex-start",
								}}
							>
								<Box
									sx={{
										display: "flex",
										gap: 1,
										alignItems: isMediaMessage ? "flex-end" : "center",
										ml: 1,
									}}
								>
									{canShowAvatarColumn ? (
										shouldShowSenderAvatar && message.sender_id ? (
											<AdminKeyBadge
												src={senderAvatarSrc}
												fallback={
													isPrivateConversation ? undefined : senderFallback
												}
												size={32}
												showBadge={isSenderAdmin}
												cursor={
													onAvatarClick && !isCurrentUserSender
														? "pointer"
														: "default"
												}
												onClick={
													onAvatarClick && !isCurrentUserSender
														? (e) =>
																onAvatarClick(
																	e.currentTarget as HTMLElement,
																	message.sender_id,
																)
														: undefined
												}
											/>
										) : (
											<Box sx={{ width: 32, height: 32, flexShrink: 0 }} />
										)
									) : null}

									<MessageListBubble
										message={message}
										isCurrentUserSender={isCurrentUserSender}
										isGroupConversation={Boolean(isPrivateConversation)}
										isFirstInSenderGroup={isDifferentBlockFromPrevious}
										isLastInSenderGroup={isLastInSenderGroup}
										currentHasReaction={hasReaction}
										prevHasReaction={prevMessageHasReaction}
										outgoingBubbleColor={outgoingBubbleColor}
										incomingBubbleColor={incomingBubbleColor}
										outgoingTextColor={outgoingTextColor}
										incomingTextColor={incomingTextColor}
										ambientTextColor={overlayTextColor}
										ambientBorderColor={overlayBorderColor}
										isRowHovered={hoveredMessageId === message.id}
										isContextMenuOpen={contextMenuMessageId === message.id}
										isHighlighted={highlightedMessageId === message.id}
										isLastInConversation={isLastIncomingMessage}
										replyMessage={repliedMessage}
										replyPreviewSenderName={repliedSenderProfile?.name}
										messages={sortedMessages}
										onDeleteMessage={onDeleteMessage}
										onEditMessage={onEditMessage}
										onToggleReaction={onToggleReaction}
										onReplyMessage={onReplyMessage}
										onJumpToMessage={onJumpToMessage}
										onViewHistories={onViewHistories}
										onSpeakMessage={onSpeakMessage}
										onContextMenuOpen={onContextMenuOpen}
									/>
								</Box>
								{visibleSeenParticipants.length > 0 && (
									<Box
										sx={{
											display: "flex",
											width: "100%",
											alignSelf: "stretch",
											justifyContent: "flex-end",
											alignItems: "center",
											gap: 0.3,
											mt: hasReaction ? "14px" : "3px",
											pr: 0.5,
										}}
									>
										{visibleAvatars.map((participant) => (
											<Tooltip
												key={participant.id}
												title={`${participant.name || "Người dùng khác"}${
													participant.last_read_at
														? ` • ${formatTimestampV2(participant.last_read_at)}`
														: ""
												}`}
											>
												<Avatar
													src={
														resolveCdnUrl(participant.avatar) ||
														buildGeneratedAvatar(participant.name)
													}
													sx={{
														width: 16,
														height: 16,
														fontSize: "8px",
														border: "1px solid",
														borderColor:
															overlayBorderColor ?? "background.paper",
													}}
												>
													{(participant.name || "U").slice(0, 1).toUpperCase()}
												</Avatar>
											</Tooltip>
										))}
										{visibleSeenParticipants.length > maxVisibleSeenAvatars && (
											<Tooltip
												title={`${visibleSeenParticipants.length - maxVisibleSeenAvatars} người khác đã xem`}
											>
												<Avatar
													sx={{
														width: 16,
														height: 16,
														fontSize: "8px",
														fontWeight: 600,
														bgcolor:
															incomingBubbleColor ||
															overlayMutedTextColor ||
															"action.selected",
														color:
															incomingTextColor ||
															overlayTextColor ||
															"text.secondary",
														border: "1px solid",
														borderColor:
															overlayBorderColor ?? "background.paper",
													}}
												>
													+
													{visibleSeenParticipants.length -
														maxVisibleSeenAvatars}
												</Avatar>
											</Tooltip>
										)}
									</Box>
								)}
							</Box>
						) : (
							<Box>
								<Box
									sx={{
										display: "flex",
										justifyContent: "flex-end",
									}}
								>
									<MessageListBubble
										message={message}
										isCurrentUserSender={isCurrentUserSender}
										isGroupConversation={Boolean(isPrivateConversation)}
										isFirstInSenderGroup={isDifferentBlockFromPrevious}
										isLastInSenderGroup={isLastInSenderGroup}
										currentHasReaction={hasReaction}
										prevHasReaction={prevMessageHasReaction}
										outgoingBubbleColor={outgoingBubbleColor}
										incomingBubbleColor={incomingBubbleColor}
										outgoingTextColor={outgoingTextColor}
										incomingTextColor={incomingTextColor}
										ambientTextColor={overlayTextColor}
										ambientBorderColor={overlayBorderColor}
										isRowHovered={hoveredMessageId === message.id}
										isContextMenuOpen={contextMenuMessageId === message.id}
										isHighlighted={highlightedMessageId === message.id}
										isLastInConversation={isLastIncomingMessage}
										replyMessage={repliedMessage}
										replyPreviewSenderName={repliedSenderProfile?.name}
										messages={sortedMessages}
										onDeleteMessage={onDeleteMessage}
										onEditMessage={onEditMessage}
										onToggleReaction={onToggleReaction}
										onReplyMessage={onReplyMessage}
										onJumpToMessage={onJumpToMessage}
										onViewHistories={onViewHistories}
										onSpeakMessage={onSpeakMessage}
										onContextMenuOpen={onContextMenuOpen}
									/>
								</Box>
								{visibleSeenParticipants.length > 0 && (
									<Box
										sx={{
											display: "flex",
											width: "100%",
											alignSelf: "stretch",
											justifyContent: "flex-end",
											alignItems: "center",
											gap: 0.3,
											mt: hasReaction ? "14px" : "3px",
											pr: 0.5,
										}}
									>
										{visibleAvatars.map((participant) => (
											<Tooltip
												key={participant.id}
												title={`${participant.name || "Người dùng khác"}${
													participant.last_read_at
														? ` • ${formatTimestampV2(participant.last_read_at)}`
														: ""
												}`}
											>
												<Avatar
													src={
														resolveCdnUrl(participant.avatar) ||
														buildGeneratedAvatar(participant.name)
													}
													sx={{
														width: 16,
														height: 16,
														fontSize: "8px",
														border: "1px solid",
														borderColor:
															overlayBorderColor ?? "background.paper",
													}}
												>
													{(participant.name || "U").slice(0, 1).toUpperCase()}
												</Avatar>
											</Tooltip>
										))}
										{visibleSeenParticipants.length > maxVisibleSeenAvatars && (
											<Tooltip
												title={`${visibleSeenParticipants.length - maxVisibleSeenAvatars} người khác đã xem`}
											>
												<Avatar
													sx={{
														width: 16,
														height: 16,
														fontSize: "8px",
														fontWeight: 600,
														bgcolor:
															outgoingBubbleColor ||
															overlayMutedTextColor ||
															"action.selected",
														color:
															outgoingTextColor ||
															overlayTextColor ||
															"text.secondary",
														border: "1px solid",
														borderColor:
															overlayBorderColor ?? "background.paper",
													}}
												>
													+
													{visibleSeenParticipants.length -
														maxVisibleSeenAvatars}
												</Avatar>
											</Tooltip>
										)}
									</Box>
								)}
							</Box>
						)}
					</Box>
				)}
				{isCurrentUserSender && !message.activity_type && (
					<Box
						sx={{
							mt: hasReaction ? 1.8 : 0.2,
							ml: "auto",
							mr: 0,
							display: "flex",
							justifyContent: "flex-end",
							alignItems: "center",
							gap: 0.4,
						}}
					>
						{message.failed ? (
							<Box
								sx={{
									display: "flex",
									alignItems: "center",
									gap: 0.5,
								}}
							>
								<Tooltip title="Thử lại">
									<IconButton
										size="small"
										onClick={() => onRetryMessage(message)}
										disabled={retryingMessageIds.has(message.id)}
										sx={{
											width: 22,
											height: 22,
											color: "primary.main",
											padding: 0,
										}}
									>
										{retryingMessageIds.has(message.id) ? (
											<CircularProgress
												size={16}
												sx={{ color: "primary.main" }}
											/>
										) : (
											<RefreshIcon sx={{ width: 18, height: 18 }} />
										)}
									</IconButton>
								</Tooltip>

								<Tooltip title="Xóa tin nhắn lỗi">
									<IconButton
										size="small"
										onClick={() => onDeleteMessage?.(message.id)}
										sx={{
											width: 22,
											height: 22,
											color: "error.main",
											padding: 0,
										}}
									>
										<DeleteIcon sx={{ width: 18, height: 18 }} />
									</IconButton>
								</Tooltip>

								<Tooltip title="Gửi thất bại">
									<ErrorIcon
										sx={{ width: 18, height: 18, color: "error.main" }}
									/>
								</Tooltip>
							</Box>
						) : shouldShowStatusLabel ? (
							<Box sx={{ display: "flex", alignItems: "center", gap: 0.35 }}>
								{outgoingStatus === "sending" && (
									<HourglassTopIcon
										sx={{
											width: 16,
											height: 16,
											color: overlayMutedTextColor ?? "text.secondary",
											animation: "spin 1.2s linear infinite",
											"@keyframes spin": {
												from: {
													transform: "rotate(0deg)",
												},
												to: {
													transform: "rotate(360deg)",
												},
											},
										}}
									/>
								)}
								{outgoingStatus === "delivered" && (
									<CheckCircleIcon
										sx={{
											width: 20,
											height: 20,
											color: overlayMutedTextColor ?? "text.secondary",
										}}
									/>
								)}
								<Typography
									variant="caption"
									sx={{
										color: overlayMutedTextColor ?? "text.secondary",
									}}
								>
									{statusLabel}
								</Typography>
							</Box>
						) : null}
					</Box>
				)}
			</Box>
		);
	},
);
