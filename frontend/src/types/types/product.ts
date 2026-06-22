export interface IProduct {
	id: number;
	uuid: string;
	name: string;
	description?: string | null;
	price: number;
	stock: number;
	status: number;
	category_id?: number | null;
	created_at?: string;
	updated_at?: string;
}

export interface ICategory {
	id: number;
	name: string;
	description?: string;
	status?: number;
	created_at?: string;
	updated_at?: string;
}
