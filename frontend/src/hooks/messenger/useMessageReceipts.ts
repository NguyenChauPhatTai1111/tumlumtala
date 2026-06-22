import { useMemo } from "react";
import type { Conversation, Message } from "@/types/messenger";

type Params = {
	conversation?: Conversation;
	sortedMessages: Message[];
	currentUserId: string;
	currentUserNumericId: number;
	seenReceipts: Map<number, Array<{ user_id: number; message_id: number }>>;
	seenSeqByUser: Map<number, number>;
	deliveredSeq: number;
};

export const useMessageReceipts = ({
	conversation,
	sortedMessages,
	currentUserId,
	currentUserNumericId,
	seenReceipts,
	seenSeqByUser,
	deliveredSeq,
}: Params) => {
	const maxSeenSeqFromReceiptsByUser = useMemo(() => {
		const result = new Map<number, number>();
		const messageSeqById = new Map<number, number>();

		for (const item of sortedMessages) {
			const seq = Number(item.message_seq ?? item.seq ?? item.id);
			const messageId = Number(item.id);
			if (Number.isFinite(seq) && Number.isFinite(messageId)) {
				messageSeqById.set(messageId, seq);
			}
		}

		seenReceipts.forEach((receipts, messageId) => {
			const seq = messageSeqById.get(messageId);
			if (!Number.isFinite(seq ?? 0)) {
				return;
			}

			const validSeq = seq as number;
			receipts.forEach((receipt) => {
				const currentSeq = result.get(receipt.user_id) ?? 0;
				if (validSeq > currentSeq) {
					result.set(receipt.user_id, validSeq);
				}
			});
		});

		return result;
	}, [seenReceipts, sortedMessages]);

	const latestOutgoingMessageSeq = useMemo(() => {
		let latestSeq = 0;
		for (const message of sortedMessages) {
			if (message.sender_id !== currentUserId) {
				continue;
			}
			const seq = Number(message.message_seq ?? message.seq ?? message.id);
			if (Number.isFinite(seq) && seq > latestSeq) {
				latestSeq = seq;
			}
		}
		return latestSeq;
	}, [sortedMessages, currentUserId]);

	const getSeenParticipantsForMessage = (message: Message) => {
		if (!conversation) {
			return [] as {
				id: number;
				name?: string;
				avatar?: string;
				last_read_at?: string | null;
			}[];
		}

		const messageSeq = Number(message.message_seq ?? message.seq ?? message.id);
		if (!Number.isFinite(messageSeq) || messageSeq <= 0) {
			return [];
		}

		const messageReceipts = seenReceipts.get(Number(message.id)) ?? [];

		return conversation.participants
			.filter((participant) => {
				if (
					participant.id === currentUserNumericId ||
					String(participant.id) === message.sender_id
				) {
					return false;
				}

				const hasSpecificReceipt = messageReceipts.some(
					(receipt) => receipt.user_id === participant.id,
				);
				const liveReadSeq = seenSeqByUser.get(participant.id) ?? 0;
				const persistedReadSeq = Number(participant.last_read_seq ?? 0);
				const receiptReadSeq =
					maxSeenSeqFromReceiptsByUser.get(participant.id) ?? 0;
				const readSeq = Math.max(liveReadSeq, persistedReadSeq, receiptReadSeq);

				if (readSeq < messageSeq && !hasSpecificReceipt) {
					return false;
				}

				// Show each reader only under the latest outgoing message they have read.
				return !sortedMessages.some((item) => {
					if (item.id === message.id || item.sender_id !== currentUserId) {
						return false;
					}

					const seq = Number(item.message_seq ?? item.seq ?? item.id);
					return Number.isFinite(seq) && seq > messageSeq && seq <= readSeq;
				});
			})
			.map((participant) => ({
				id: participant.id,
				name: participant.nickname || participant.fullname,
				avatar: participant.avatar,
				last_read_at: participant.last_read_at,
			}));
	};

	return {
		maxSeenSeqFromReceiptsByUser,
		latestOutgoingMessageSeq,
		getSeenParticipantsForMessage,
		deliveredSeq,
	} as const;
};

export default useMessageReceipts;
