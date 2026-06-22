export interface ISticker {
	id: string;
	pack_id: number;
	pack_name?: string;
	name: string;
	image_url: string;
	sort_order?: number;
	is_active: boolean;
	created_at?: string;
	updated_at?: string;
}

export interface IStickerPack {
	id: number;
	name: string;
	description?: string | null;
	thumbnail_url?: string | null;
	is_active: boolean;
	created_at?: string;
	updated_at?: string;
}
