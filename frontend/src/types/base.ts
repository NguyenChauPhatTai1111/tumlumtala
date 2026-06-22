/**
 * Base entity type with common fields for all resources
 */
export interface BaseEntity {
	id?: number | string;
	created_at?: string;
	updated_at?: string;
	deleted_at?: string | null;
}

/**
 * Base pagination response
 */
export interface PaginationMeta {
	pagination: {
		pageSize: number;
		current: number;
		total: number;
	};
}

/**
 * Generic list response
 */
export interface ListResponse<T> {
	data: T[];
	meta: PaginationMeta;
}
