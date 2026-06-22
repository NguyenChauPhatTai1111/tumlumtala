export const MODULE_RESOURCES = {
	category: "category",
	theme: "theme",
	emoji: "emoji",
	emojiPack: "emoji-pack",
	sticker: "sticker",
	stickerPack: "sticker-pack",
	product: "product",
	settings: "setting-score",
	user: "user",
	recentItem: "recent-item",
} as const;

export type ModuleResourceKey = keyof typeof MODULE_RESOURCES;
