import type { Conversation } from "@/types";

export interface ConversationItemProps {
	conversation: Conversation;
	currentUserId: number;
	selected: boolean;
	isOnline?: boolean;
	compact: boolean;
	now: number;
	typingPreview?: {
		label: string;
		avatar?: string;
		showAvatar?: boolean;
	};
	onSelect: (conversationId: number) => void;
	onMenuOpen?: (
		pos: { top: number; left: number },
		conversation: Conversation,
	) => void;
	onToggleNotifications?: (conversation: Conversation) => void;
}
