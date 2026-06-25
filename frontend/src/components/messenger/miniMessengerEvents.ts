export const MINI_MESSENGER_OPEN_EVENT = "mini-messenger:open";
export const MINI_MESSENGER_CLOSE_EVENT = "mini-messenger:close";
export const MINI_MESSENGER_CLOSE_ALL_EVENT = "mini-messenger:close-all";
export const MINI_MESSENGER_TOGGLE_EVENT = "mini-messenger:toggle";

export type MiniMessengerOpenDetail = {
	conversationId: number;
	keepInRail?: boolean;
};

export type MiniMessengerCloseDetail = {
	conversationId: number;
};

export type MiniMessengerToggleDetail = {
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

export function closeMiniMessengerConversation(conversationId: number) {
	window.dispatchEvent(
		new CustomEvent<MiniMessengerCloseDetail>(MINI_MESSENGER_CLOSE_EVENT, {
			detail: { conversationId },
		}),
	);
}

export function toggleMiniMessengerConversation(
	conversationId: number,
	options: { keepInRail?: boolean } = {},
) {
	window.dispatchEvent(
		new CustomEvent<MiniMessengerToggleDetail>(MINI_MESSENGER_TOGGLE_EVENT, {
			detail: { conversationId, keepInRail: options.keepInRail },
		}),
	);
}

export function closeAllMiniMessengerChats() {
	window.dispatchEvent(new CustomEvent(MINI_MESSENGER_CLOSE_ALL_EVENT));
}
