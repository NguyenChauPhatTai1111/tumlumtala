import type { Conversation, Participant, User } from "@/types/messenger";

export type ConversationInputDialogState = {
	mode:
		| "rename"
		| "addMembers"
		| "background"
		| "avatar"
		| "nickname"
		| "searchMessages";
	conversation: Conversation;
	participant?: Participant;
	value: string;
	selectedUsers?: User[];
};

export type ConversationConfirmDialogState = {
	mode: "leave" | "notifications" | "delete" | "removeMember";
	conversation: Conversation;
	targetParticipant?: Participant;
};

export type SearchDetailSource = "global" | "conversation";

export type ConversationThemeConfig = {
	background?: string;
	backgroundColor?: string;
	incomingBubbleColor?: string;
	outgoingBubbleColor?: string;
	presetId?: string;
	themeId?: number;
};

export type GradientStop = {
	id: number;
	color: string;
	position: number;
};
