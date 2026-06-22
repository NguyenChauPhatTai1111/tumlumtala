export type ComposerTab = "emoji" | "sticker";

export type EmojiTypeTab = {
	key: string;
	label: string;
};

export type ImagePreview = {
	file: File;
	preview: string;
	addedAt?: number;
};

export type VideoPreview = {
	file: File;
	preview: string;
	addedAt?: number;
	duration: number;
};

export type FilePreview = {
	file: File;
	name: string;
	size: number;
	mimeType: string;
	addedAt?: number;
};
