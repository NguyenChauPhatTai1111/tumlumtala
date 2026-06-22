import type { Conversation, Message, Participant } from "@/types/messenger";
import { resolveCdnUrl } from "@/utils";
import { buildGeneratedAvatar } from "./avatar";
import { getConversationAvatar } from "./conversation";
import { formatMessengerTimestamp } from "./date";

export type ComputedMessengerMessage = {
	message: Message;
	index: number;
	isCurrentUserSender: boolean;
	previousMessage: Message | null;
	nextMessage: Message | null;
	currentMessageSeq: number;
	previousMessageSeq: number;
	nextMessageSeq: number;
	formattedTime: string;
};

export type SeenParticipant = {
	id: number;
	name: string;
	avatar?: string;
	last_read_at?: string | null;
};

export const getMessageSeq = (message?: Message | null) =>
	Number(message?.message_seq ?? message?.seq ?? message?.id ?? Number.NaN);

export const sortMessages = (messages: Message[]) =>
	[...messages].sort((a, b) => {
		if (a.pending && !b.pending) return 1;
		if (!a.pending && b.pending) return -1;

		const seqDiff = getMessageSeq(a) - getMessageSeq(b);
		if (Number.isFinite(seqDiff) && seqDiff !== 0) {
			return seqDiff;
		}

		return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
	});

export const buildComputedMessages = (
	messages: Message[],
	currentUserId: string,
): ComputedMessengerMessage[] =>
	messages.map((message, index) => {
		const previousMessage = index > 0 ? messages[index - 1] : null;
		const nextMessage =
			index < messages.length - 1 ? messages[index + 1] : null;

		return {
			message,
			index,
			isCurrentUserSender: message.sender_id === currentUserId,
			previousMessage,
			nextMessage,
			currentMessageSeq: getMessageSeq(message),
			previousMessageSeq: getMessageSeq(previousMessage),
			nextMessageSeq: getMessageSeq(nextMessage),
			formattedTime: formatMessengerTimestamp(message.created_at),
		};
	});

export const buildMessagesById = (messages: Message[]) =>
	new Map(messages.map((message) => [Number(message.id), message]));

export const getMessageListConversationAvatar = (
	conversation: Conversation | undefined,
	currentUserId: string,
) => {
	if (!conversation) {
		return undefined;
	}

	const avatar = getConversationAvatar(conversation, Number(currentUserId));
	const fallbackName = conversation.is_group
		? conversation.name
		: conversation.participants.find(
				(participant) => String(participant.id) !== currentUserId,
			)?.fullname;

	return resolveCdnUrl(avatar) || buildGeneratedAvatar(fallbackName);
};

export const getLatestOutgoingMessageSeq = (
	messages: Message[],
	currentUserId: string,
) =>
	messages.reduce((maxSeq, message) => {
		if (message.sender_id !== currentUserId) return maxSeq;
		const seq = getMessageSeq(message);
		return Number.isFinite(seq) ? Math.max(maxSeq, seq) : maxSeq;
	}, 0);

export const getDeliveredSeq = (messages: Message[], currentUserId: string) =>
	messages.reduce((maxSeq, message) => {
		if (message.sender_id !== currentUserId) return maxSeq;
		if (message.status !== "delivered" && message.status !== "seen")
			return maxSeq;
		const seq = getMessageSeq(message);
		return Number.isFinite(seq) ? Math.max(maxSeq, seq) : maxSeq;
	}, 0);

export const getSeenParticipantsForMessage = (
	message: Message,
	conversation: Conversation | undefined,
	currentUserId: string,
): SeenParticipant[] => {
	if (!conversation) return [];

	const seq = getMessageSeq(message);
	if (!Number.isFinite(seq)) return [];

	return conversation.participants
		.filter(
			(participant: Participant) =>
				String(participant.id) !== currentUserId &&
				Number(participant.last_read_seq ?? 0) >= seq,
		)
		.map((participant) => ({
			id: participant.id,
			name: participant.nickname || participant.fullname,
			avatar: participant.avatar,
			last_read_at: participant.last_read_at,
		}));
};
