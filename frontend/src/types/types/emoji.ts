export interface IEmoji {
	id: string;
	code: string;
	name: string;
	type: string;
	pack_id?: number;
	source_type?: "unicode_icon" | "external_url" | "upload" | string;
	source_value?: string | null;
	icon_text?: string | null;
	display_value?: string | null;
	icon_code?: string | null;
	external_url?: string | null;
	asset_url?: string | null;
	animation_type?: string | null;
	price?: number;
	status: number;
	created_at?: string;
	updated_at?: string;
}

export interface IEmojiPack {
	id: number;
	name: string;
	code?: string | null;
	type: string;
	is_active: boolean;
	created_at?: string;
	updated_at?: string;
}
