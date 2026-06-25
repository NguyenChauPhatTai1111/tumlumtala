import type { Conversation, Message } from "@/types/messenger";
import { resolveCdnUrl } from "@/utils/urlUtils";
import { buildGeneratedAvatar } from "../utils/avatar";

export function getConversationTitle(
	conversation: Conversation | undefined,
	currentUserId?: number | string,
) {
	if (!conversation) return "Tin nhắn";
	if (conversation.is_group) return conversation.name || "Nhóm chat";

	const other = conversation.participants.find(
		(participant) => Number(participant.id) !== Number(currentUserId),
	);

	return (
		other?.nickname ||
		other?.fullname ||
		conversation.name ||
		conversation.last_message_sender_name ||
		"Tin nhắn"
	);
}

export function getConversationAvatar(
	conversation: Conversation | undefined,
	currentUserId?: number | string,
) {
	if (!conversation) return undefined;
	const title = getConversationTitle(conversation, currentUserId);
	if (conversation.is_group) {
		return resolveCdnUrl(conversation.avatar) || buildGeneratedAvatar(title);
	}

	return (
		resolveCdnUrl(
			conversation.participants.find(
				(participant) => Number(participant.id) !== Number(currentUserId),
			)?.avatar,
		) || buildGeneratedAvatar(title)
	);
}

export function getMessageSenderName(
	conversation: Conversation,
	message: Message | null,
	currentUserId?: number | string,
) {
	if (!message) return "";
	if (Number(message.sender_id) === Number(currentUserId)) return "Bạn";

	const participant = conversation.participants.find(
		(item) => Number(item.id) === Number(message.sender_id),
	);

	return (
		participant?.nickname || participant?.fullname || message.sender_name || ""
	);
}

export function getLastSenderName(
	conversation: Conversation,
	currentUserId?: number | string,
) {
	if (!conversation.last_message_sender_id) {
		return conversation.last_message_sender_name || "Chưa có tin nhắn";
	}

	if (Number(conversation.last_message_sender_id) === Number(currentUserId)) {
		return "Bạn";
	}

	const participant = conversation.participants.find(
		(item) => Number(item.id) === Number(conversation.last_message_sender_id),
	);

	return (
		participant?.nickname ||
		participant?.fullname ||
		conversation.last_message_sender_name ||
		"Người gửi"
	);
}

export function getLastMessagePreviewContent(conversation: Conversation) {
	const content = conversation.last_message_content?.trim();
	const messageType = String(
		conversation.last_message_type ?? "",
	).toLowerCase();
	const looksLikeAttachmentPath = Boolean(
		content?.includes("/messenger/attachments/") ||
			content?.includes("messenger/attachments/"),
	);

	if (messageType === "image") return "Hình ảnh";
	if (messageType === "video") return "Video";
	if (messageType === "file" || looksLikeAttachmentPath) return "Tệp đính kèm";
	if (messageType === "sticker") return "Sticker";
	if (!content) return "Chưa có tin nhắn";

	return content;
}

export function getMessagePreviewContent(message: Message) {
	const content = message.content?.trim();
	const messageType = String(message.message_type ?? "").toLowerCase();
	const looksLikeAttachmentPath = Boolean(
		content?.includes("/messenger/attachments/") ||
			content?.includes("messenger/attachments/"),
	);

	if (messageType === "image") return "Hình ảnh";
	if (messageType === "video") return "Video";
	if (messageType === "file" || looksLikeAttachmentPath) return "Tệp đính kèm";
	if (messageType === "sticker") return "Sticker";
	if (!content) return "Tin nhắn mới";

	return content;
}
