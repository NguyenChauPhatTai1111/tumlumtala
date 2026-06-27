import type { BubbleRadii } from "@components/messenger/message/components/BubbleContent";
import type { RefObject } from "react";
import type { IUser } from "@/types";
import type { Message } from "@/types/messenger";

export type SeenParticipant = {
	id: string;
	name?: string;
	avatar?: string;
	last_read_at?: string;
};

export type BubbleContentProps = {
    message: Message;
    messages: Message[];
    isCurrentUserSender: boolean;
    bubbleBackground: string;
    bubbleTextColor: string;
	replyMessage?: Message;
	replyPreviewSenderName?: string;
	replyContainerBackground: string;
	outgoingTextColor?: string;
	incomingTextColor?: string;
	edited: boolean;
	bubbleBorderRadius: BubbleRadii;
	onJumpToMessage?: (messageId: number) => void;
	onToggleReaction?: (
		message: Message,
		reaction?: string,
		action?: "toggle" | "remove",
	) => void;
	onViewHistories?: (message: Message) => void;
	onCallBack?: () => void;
	lineClamp?: number;
};

export type ReactionPickerProps = {
	myReactionEmoji?: string;
	anchorEl: HTMLElement | null;
	placement?: "top" | "top-start" | "top-end";
	activeReactionBackground: string;
	reactionBorderColor: string;
	ambientTextColor?: string;
	bubbleBackground: string;
	actionsSurfaceBackground: string;
	actionSurfaceShadow: string;
	hasCustomTheme: boolean;
	ambientBorderColor?: string;
	pickerRef?: RefObject<HTMLDivElement | null>;
	onReactionSelect: (reaction: string) => void;
	onClose: () => void;
	onMouseEnter?: () => void;
	onMouseLeave?: (event: React.MouseEvent<HTMLElement>) => void;
};

export type MessageContextMenuState = {
	message: Message;
	pos: { top: number; left: number };
};

export type ContextMenuProps = {
	ctxMenu: MessageContextMenuState | null;
	currentUser?: IUser | null;
	currentUserId: string;
	sortedMessages: Message[];
	getSenderProfile: (senderId: string) => { name?: string; avatar?: string };
	formatTimestamp: (value: string) => string;
	onClose: () => void;
	onToggleReaction?: (
		message: Message,
		reaction?: string,
		action?: "toggle" | "remove",
	) => void;
	onReplyMessage?: (message: Message) => void;
	onEditMessage?: (message: Message) => void;
	onViewHistories: (message: Message) => void;
	onDeleteMessage?: (messageId: number) => void;
};
