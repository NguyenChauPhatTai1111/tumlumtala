import type { IUser } from "@/types";
import type { Conversation, Message } from "@/types/messenger";

export const getConversationDisplayName = (
	conversation: Conversation | undefined,
	currentUserId: number,
): string => {
	if (!conversation) {
		return "Cuộc trò chuyện";
	}

	if (conversation.is_group) {
		return conversation.name || "Nhóm chat";
	}

	const other = conversation.participants?.find((p) => p.id !== currentUserId);
	return (
		other?.nickname || other?.fullname || conversation.name || "Cuộc trò chuyện"
	);
};

export const getConversationAvatar = (
	conversation: Conversation,
	currentUserId: number,
): string | undefined => {
	if (conversation.is_group) {
		return conversation.avatar;
	}

	const other = conversation.participants?.find((p) => p.id !== currentUserId);
	return other?.avatar;
};

export const getSenderInSelectedConversation = (
	message: Message,
	selectedConversation?: Conversation,
	currentUser?: IUser,
) => {
	if (!selectedConversation) {
		return {
			name: "Người dùng",
			avatar: undefined as string | undefined,
		};
	}

	const senderId = Number(message.sender_id);
	const currentUserId = Number(currentUser?.id ?? 0);

	if (Number.isFinite(senderId) && senderId === currentUserId) {
		return {
			name: currentUser?.fullname || "Bạn",
			avatar: currentUser?.avatar,
		};
	}

	const participant = selectedConversation.participants?.find(
		(item) => item.id === senderId,
	);
	return {
		name: participant?.fullname || "Người dùng",
		avatar: participant?.avatar,
	};
};
