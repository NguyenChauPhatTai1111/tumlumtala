import type { Message } from "@/types/messenger";

export const isMessageEdited = (message: Message) => {
	if (typeof message.is_updated !== "undefined") {
		return Boolean(message.is_updated);
	}

	return Boolean(message.histories && message.histories.length > 0);
};

export const isStickerMessage = (message: Message): boolean =>
	message.message_type === "sticker";
