export type ConversationThemeConfig = {
	background?: string;
	backgroundColor?: string;
	incomingBubbleColor?: string;
	outgoingBubbleColor?: string;
	incomingTextColor?: string;
	outgoingTextColor?: string;
	presetId?: string;
	themeId?: number;
	themeUrl?: string;
};

export const parseConversationThemeConfig = (
	rawBackground?: string,
): ConversationThemeConfig => {
	const raw = rawBackground?.trim();
	if (!raw) return {};

	if (raw.startsWith("{")) {
		try {
			return JSON.parse(raw) as ConversationThemeConfig;
		} catch {
			return { background: raw };
		}
	}

	return { background: raw };
};
