export interface ISettings {
	id: number;
	min_words: number;
	max_words?: number | null;
	points: number;
	description: string;
	created_at?: string;
	updated_at?: string;
}
