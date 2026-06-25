export const MINI_MESSENGER_OPEN_EVENT = "mini-messenger:open";
export const MINI_MESSENGER_CLOSE_ALL_EVENT = "mini-messenger:close-all";

export type MiniMessengerOpenDetail = {
	conversationId: number;
	keepInRail?: boolean;
};

export function openMiniMessengerConversation(
	conversationId: number,
	options: { keepInRail?: boolean } = {},
) {
	window.dispatchEvent(
		new CustomEvent<MiniMessengerOpenDetail>(MINI_MESSENGER_OPEN_EVENT, {
			detail: { conversationId, keepInRail: options.keepInRail },
		}),
	);
}

export function closeAllMiniMessengerChats() {
	window.dispatchEvent(new CustomEvent(MINI_MESSENGER_CLOSE_ALL_EVENT));
}
