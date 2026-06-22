export interface ITheme {
	id: number;
	preset_id: string;
	name: string;
	background: string;
	background_color: string;
	incoming_bubble_color: string;
	outgoing_bubble_color: string;
	incoming_text_color: string;
	outgoing_text_color: string;
	status: "active" | "inactive";
	sort_order: number;
	created_at?: string;
	updated_at?: string;
}
