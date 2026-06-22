import { buildGeneratedAvatar } from "@components/messenger/utils/avatar";
import type { SeenParticipant } from "@components/messenger/utils/messageList";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
	Avatar,
	Box,
	CircularProgress,
	IconButton,
	Tooltip,
	Typography,
} from "@mui/material";
import type { ComponentType, Dispatch, SetStateAction } from "react";
import type { Conversation, Message } from "@/types/messenger";
import { resolveCdnUrl } from "@/utils";

// MessageBubble is passed in as a prop to avoid circular imports

interface MessageRowProps {
	cm: {
		message: Message;
		isCurrentUserSender: boolean;
	};
	conversation?: Conversation;
	conversationAvatar?: string;
	currentUserId: string;
	outgoingBubbleColor?: string;
	incomingBubbleColor?: string;
	overlayTextColor?: string;
	overlayBorderColor?: string;
	hoveredMessageId: number | null;
	setHoveredMessageId: Dispatch<SetStateAction<number | null>>;
	messagesById: Map<number, Message>;
	onDeleteMessage?: (messageId: number) => void;
	onEditMessage?: (message: Message) => void;
	onToggleReaction?: (
		message: Message,
		reaction?: string,
		action?: "toggle" | "remove",
	) => void;
	onReplyMessage?: (message: Message) => void;
	scrollToMessageAndHighlight: (id: number) => void;
	handleViewHistories: (message: Message) => void;
	retryingMessageIds: Set<number>;
	handleRetryMessage: (message: Message) => Promise<void>;
	onSpeakMessage?: (message: Message) => void | Promise<void>;
	latestOutgoingMessageSeq: number;
	deliveredSeq: number;
	getSeenParticipantsForMessage: (message: Message) => SeenParticipant[];
	seenReceipts: Map<number, unknown[]>;
	MessageBubbleComponent?: ComponentType<{
		message: Message;
		isCurrentUserSender: boolean;
		isGroupConversation: boolean;
		currentUserId: string;
		outgoingBubbleColor?: string;
		incomingBubbleColor?: string;
		ambientTextColor?: string;
		ambientBorderColor?: string;
		isRowHovered?: boolean;
		replyMessage?: Message | undefined;
		replyPreviewSenderName?: string | undefined;
		onDeleteMessage?: (messageId: number) => void;
		onEditMessage?: (message: Message) => void;
		onToggleReaction?: (
			message: Message,
			reaction?: string,
			action?: "toggle" | "remove",
		) => void;
		onReplyMessage?: (message: Message) => void;
		onJumpToMessage?: (id: number) => void;
		onViewHistories?: (message: Message) => void;
	}>;
}

const MessageRow = ({
	cm,
	conversation,
	conversationAvatar,
	currentUserId,
	outgoingBubbleColor,
	incomingBubbleColor,
	overlayTextColor,
	overlayBorderColor,
	hoveredMessageId,
	setHoveredMessageId,
	messagesById,
	onDeleteMessage,
	onEditMessage,
	onToggleReaction,
	onReplyMessage,
	scrollToMessageAndHighlight,
	handleViewHistories,
	retryingMessageIds,
	handleRetryMessage,
	latestOutgoingMessageSeq,
	deliveredSeq,
	getSeenParticipantsForMessage,
	seenReceipts,
	MessageBubbleComponent,
}: MessageRowProps) => {
	const { message, isCurrentUserSender } = cm;

	const seenParticipants = isCurrentUserSender
		? getSeenParticipantsForMessage(message)
		: [];
	const _messageReceipts = seenReceipts.get(Number(message.id)) ?? [];
	const maxReadCursorSeq =
		conversation?.participants?.reduce(
			(maxSeq, participant) =>
				Math.max(maxSeq, Number(participant.last_read_seq ?? 0)),
			0,
		) ?? 0;
	const numericSeq = Number(message.message_seq ?? message.seq ?? message.id);
	const _hasAnyReadCursor =
		Number.isFinite(numericSeq) &&
		numericSeq > 0 &&
		numericSeq <= maxReadCursorSeq;
	const isPreviousBeforeLatest =
		latestOutgoingMessageSeq > 0 &&
		numericSeq < latestOutgoingMessageSeq &&
		maxReadCursorSeq >= latestOutgoingMessageSeq;
	const visibleSeenParticipants = isPreviousBeforeLatest
		? []
		: seenParticipants;

	const outgoingStatus = (() => {
		if (!isCurrentUserSender) return undefined;
		if (message.failed) return "failed";
		if (Number.isFinite(numericSeq) && numericSeq <= deliveredSeq)
			return "delivered";
		return "sending";
	})();

	const statusLabel = (() => {
		if (!isCurrentUserSender) return "";
		if (message.failed) return "Gửi thất bại";
		if (Number.isFinite(numericSeq) && numericSeq <= maxReadCursorSeq)
			return "Đã xem";
		if (Number.isFinite(numericSeq) && numericSeq <= deliveredSeq)
			return "Đã gửi";
		return "Đang gửi";
	})();

	const senderProfileName = (() => {
		if (!conversation) return "Người dùng";
		if (!conversation.is_group) {
			return message.sender_id === String(currentUserId)
				? undefined
				: undefined;
		}
		const participant = conversation.participants?.find(
			(p) => String(p.id) === message.sender_id,
		);
		return participant?.nickname || participant?.fullname || "Người dùng";
	})();

	return (
		<Box
			key={message.id}
			data-message-id={message.id}
			onMouseEnter={() => setHoveredMessageId(message.id)}
			onMouseLeave={() =>
				setHoveredMessageId((current) =>
					current === message.id ? null : current,
				)
			}
			sx={{ position: "relative" }}
		>
			<Box
				sx={{
					display: "flex",
					justifyContent: isCurrentUserSender ? "flex-end" : "flex-start",
					gap: 1,
					alignItems: "flex-end",
					mb: 1,
				}}
			>
				{!isCurrentUserSender ? (
					<Avatar
						src={
							conversation?.is_group
								? resolveCdnUrl(
										(conversation.participants || []).find(
											(p) => String(p.id) === message.sender_id,
										)?.avatar,
									)
								: conversationAvatar
						}
						sx={{ width: 32, height: 32 }}
					>
						{conversation?.is_group
							? undefined
							: (senderProfileName || "U").slice(0, 1).toUpperCase()}
					</Avatar>
				) : null}

				{MessageBubbleComponent ? (
					<MessageBubbleComponent
						message={message}
						isCurrentUserSender={isCurrentUserSender}
						isGroupConversation={Boolean(conversation?.is_group)}
						currentUserId={String(currentUserId)}
						outgoingBubbleColor={outgoingBubbleColor}
						incomingBubbleColor={incomingBubbleColor}
						ambientTextColor={overlayTextColor}
						ambientBorderColor={overlayBorderColor}
						isRowHovered={hoveredMessageId === message.id}
						replyMessage={messagesById.get(Number(message.reply_to_message_id))}
						replyPreviewSenderName={
							messagesById.get(Number(message.reply_to_message_id))?.sender_id
						}
						onDeleteMessage={onDeleteMessage}
						onEditMessage={onEditMessage}
						onToggleReaction={onToggleReaction}
						onReplyMessage={onReplyMessage}
						onJumpToMessage={scrollToMessageAndHighlight}
						onViewHistories={handleViewHistories}
					/>
				) : null}

				{isCurrentUserSender && (
					<Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
						{visibleSeenParticipants.length > 0 ? (
							visibleSeenParticipants.slice(0, 4).map((p) => (
								<Tooltip
									key={p.id}
									title={`${p.name || "Người dùng"}${p.last_read_at ? ` ${p.last_read_at}` : ""}`}
								>
									<Avatar
										src={
											resolveCdnUrl(p.avatar) || buildGeneratedAvatar(p.name)
										}
										sx={{
											width: 16,
											height: 16,
											fontSize: "9px",
											border: "1px solid",
											borderColor: overlayBorderColor ?? "background.paper",
										}}
									>
										{(p.name || "U").slice(0, 1).toUpperCase()}
									</Avatar>
								</Tooltip>
							))
						) : message.failed ? (
							<Tooltip title="Gửi thất bại. Nhấn để thử lại.">
								<Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
									<IconButton
										size="small"
										onClick={() => handleRetryMessage(message)}
										disabled={retryingMessageIds.has(message.id)}
										sx={{
											width: 20,
											height: 20,
											color: "error.main",
											padding: 0,
										}}
									>
										{retryingMessageIds.has(message.id) ? (
											<CircularProgress
												size={20}
												sx={{ color: "error.main" }}
											/>
										) : (
											<RefreshIcon sx={{ width: 20, height: 20 }} />
										)}
									</IconButton>
									<ErrorIcon
										sx={{ width: 20, height: 20, color: "error.main" }}
									/>
								</Box>
							</Tooltip>
						) : (
							<Box sx={{ display: "flex", alignItems: "center", gap: 0.35 }}>
								{outgoingStatus === "sending" && (
									<HourglassTopIcon sx={{ width: 12, height: 12 }} />
								)}
								{outgoingStatus === "delivered" && (
									<CheckCircleIcon sx={{ width: 12, height: 12 }} />
								)}
								<Typography variant="caption">{statusLabel}</Typography>
							</Box>
						)}
					</Box>
				)}
			</Box>
		</Box>
	);
};

export default MessageRow;
