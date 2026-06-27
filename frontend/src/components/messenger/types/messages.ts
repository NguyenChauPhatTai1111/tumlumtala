import type { MessengerWebSocketService } from "@/services/messengerWebSocketService";
import type { IUser } from "@/types";
import type { Conversation, Message } from "@/types/messenger";

export type SenderProfile = {
	name?: string;
	avatar?: string;
};

export type SeenParticipant = {
	id: number;
	name?: string;
	avatar?: string;
	last_read_at?: string | null;
};

export type MessageBubbleProps = {
	message: Message;
	isCurrentUserSender: boolean;
	isGroupConversation: boolean;
	isFirstInSenderGroup?: boolean;
	isLastInSenderGroup?: boolean;
	currentHasReaction?: boolean;
	prevHasReaction?: boolean;
	replyMessage?: Message;
	replyPreviewSenderName?: string;
	outgoingBubbleColor?: string;
	incomingBubbleColor?: string;
	outgoingTextColor?: string;
	incomingTextColor?: string;
	ambientTextColor?: string;
	ambientBorderColor?: string;
	isRowHovered?: boolean;
	isContextMenuOpen?: boolean;
	isHighlighted?: boolean;
	isLastInConversation?: boolean;
	messages?: Message[];
	onDeleteMessage?: (messageId: number) => void;
	onEditMessage?: (message: Message) => void;
	onSpeakMessage?: (message: Message) => void;
	onToggleReaction?: (
		message: Message,
		reaction?: string,
		action?: "toggle" | "remove",
	) => void | Promise<void>;
	onReplyMessage?: (message: Message) => void;
	onJumpToMessage?: (id: number) => void;
	onViewHistories?: (message: Message) => void;
	onCallBack?: () => void;
	onContextMenuOpen?: (
		pos: { top: number; left: number },
		message: Message,
	) => void;
};

export interface MessageListBubbleProps {
	message: Message;
	isCurrentUserSender: boolean;
	isGroupConversation: boolean;
	outgoingBubbleColor?: string;
	incomingBubbleColor?: string;
	outgoingTextColor?: string;
	incomingTextColor?: string;
	ambientTextColor?: string;
	ambientBorderColor?: string;
	isRowHovered?: boolean;
	isContextMenuOpen?: boolean;
	isHighlighted?: boolean;
	isLastInConversation?: boolean;
	replyMessage?: Message;
	replyPreviewSenderName?: string; // tên người gửi tin nhắn được trả lời
	messages?: Message[];
	onDeleteMessage?: (messageId: number) => void;
	onEditMessage?: (message: Message) => void;
	onToggleReaction?: (
		message: Message,
		reaction?: string,
		action?: "toggle" | "remove",
	) => void;
	onReplyMessage?: (message: Message) => void;
	onJumpToMessage?: (messageId: number) => void;
	onViewHistories?: (message: Message) => void;
	onContextMenuOpen?: (
		pos: { top: number; left: number },
		message: Message,
	) => void;
}

export type MessageListRowProps = {
	message: Message;
	index: number;
	sortedMessages: Message[];
	conversation?: Conversation;
	conversationAvatar?: string;
	currentUserId: string;
	currentUserNumericId: number;
	onlineUserIds: Set<number>;
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
	contextMenuMessageId?: number | null;
	retryingMessageIds: Set<number>;
	outgoingBubbleColor?: string;
	incomingBubbleColor?: string;
	outgoingTextColor?: string;
	incomingTextColor?: string;
	overlayTextColor?: string;
	overlayMutedTextColor?: string;
	overlayBorderColor?: string;
	messageBlockGapMinutes: number;
	onHoverMessageChange: (
		value: number | null | ((current: number | null) => number | null),
	) => void;
	onDeleteMessage?: (messageId: number) => void;
	onEditMessage?: (message: Message) => void;
	onToggleReaction?: (
		message: Message,
		reaction?: string,
		action?: "toggle" | "remove",
	) => void;
	onReplyMessage?: (message: Message) => void;
	onSpeakMessage?: (message: Message) => void;
	onJumpToMessage: (messageId: number) => void;
	onViewHistories: (message: Message) => void;
	onRetryMessage: (message: Message) => Promise<void>;
	onContextMenuOpen?: (
		pos: { top: number; left: number },
		message: Message,
	) => void;
	onAvatarClick?: (anchor: HTMLElement, senderId: string) => void;
	formatTimestamp: (value: string) => string;
};

export interface MessageListProps {
	messages: Message[];
	conversation?: Conversation;
	currentUser?: IUser;
	chatBackground?: string;
	outgoingBubbleColor?: string;
	incomingBubbleColor?: string;
	outgoingTextColor?: string;
	incomingTextColor?: string;
	loading: boolean;
	error?: string;
	hasMore: boolean;
	loadingMore: boolean;
	onLoadMore: () => boolean;
	unreadBoundaryMessageId?: string;
	showUnreadDivider?: boolean;
	initialUnreadScrollMessageId?: number;
	onInitialUnreadScrollHandled?: () => void;
	onDeleteMessage?: (messageId: number) => void;
	onEditMessage?: (message: Message) => void;
	onToggleReaction?: (
		message: Message,
		reaction?: string,
		action?: "toggle" | "remove",
	) => void;
	onSpeakMessage?: (message: Message) => void;
	onRetryMessage?: (message: Message) => Promise<void>;
	ws?: MessengerWebSocketService | null;
	onReplyMessage?: (message: Message) => void;
	scrollToMessageId?: number | null;
	onScrollToMessageHandled?: () => void;
	onAvatarClick?: (anchor: HTMLElement, senderId: string) => void;
}
