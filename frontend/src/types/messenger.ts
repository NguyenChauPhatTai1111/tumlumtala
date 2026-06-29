export interface User {
	id: string;
	username: string;
	email: string;
	avatar?: string;
	first_name?: string;
	last_name?: string;
	is_online?: boolean;
	last_seen_at?: string;
}

export interface Participant {
	id: number;
	fullname: string;
	nickname?: string;
	email: string;
	avatar?: string;
	role?: string;
	last_seen_seq?: number;
	last_read_seq?: number;
	last_read_at?: string | null;
	participant_version?: number;
}

export interface Conversation {
	id: number;
	is_group: boolean;
	name?: string;
	avatar?: string;
	theme_id?: number;
	theme_url?: string;
	theme?: ConversationTheme;
	background?: string;
	background_color?: string;
	incoming_bubble_color?: string;
	outgoing_bubble_color?: string;
	incoming_text_color?: string;
	outgoing_text_color?: string;
	notifications_enabled?: boolean;
	created_at: string;
	created_by: number;
	unread_count: number;
	last_message_type?: string;
	last_message_activity_type?: string;
	last_read_message_id?: number;
	last_message_id?: number;
	last_message_at?: string;
	last_message_sender_id?: number;
	last_message_sender_name?: string;
	last_message_content: string;
	last_message_metadata?: string;
	emoji_source_type?: string;
	quick_reaction?: string;
	is_archived?: boolean;
	conversation_version?: number;
	draftText?: string;
	draftImageCount?: number;
	draftVideoCount?: number;
	draftFileCount?: number;
	hasSending?: boolean;
	participants: Participant[];
}

export interface ConversationTheme {
	id: number;
	preset_id: string;
	name: string;
	background: string;
	background_color: string;
	incoming_bubble_color: string;
	outgoing_bubble_color: string;
	incoming_text_color: string;
	outgoing_text_color: string;
}

export interface MessageReaction {
	user_id: string;
	emoji: string;
}

export interface MessageHistory {
	id: number;
	message_id: string;
	content: string;
	edited_by: number;
	edited_at: string;
}

export interface MessageFileMetadata {
	original_name: string;
	size?: number;
	mime_type?: string;
	duration?: number;
}

export interface MentionItem {
	id: number;
	fullname: string;
}

export interface SendMessagePayloadItem {
	type: string;
	content: string;
	item_id?: number;
	file?: File;
	metadata?: MessageFileMetadata;
	mentions?: MentionItem[];
}

export type SendMessagePayload = string | SendMessagePayloadItem[];

export interface Message {
	id: number;
	conversation_id: number;
	message_seq?: number;
	seq?: number;
	sender_id: string;
	sender_name?: string;
	sender_gender?: string;
	receiver_id: string;
	content: string;
	mentions?: MentionItem[];
	reply_to_message_id?: number | null;
	is_read: boolean;
	created_at: string;
	updated_at?: string;
	read_at?: string | null;
	my_reaction?: string | null;
	reactions?: MessageReaction[];
	histories?: MessageHistory[];
	is_updated?: boolean;
	pending?: boolean;
	failed?: boolean;
	temp_id?: string;
	status?: "sending" | "sent" | "delivered" | "seen";
	message_type?: string;
	emoji_source_type?: string;
	activity_type?: string;
	activity_metadata?: string;
	activity_actor_id?: string;
	activity_target_id?: string;
	file?: File; // Added for optimistic updates of image messages
	metadata?: MessageFileMetadata; // Original filename, size, mime_type from BE
}

export interface CreateConversationRequest {
	is_group: boolean;
	name: string;
	participant_ids: number[];
}

export interface CreateConversationResponse {
	conversation: Conversation;
}

export interface SendMessageRequest {
	conversation_id: number;
	content?: string;
	message_type?: string;
	item_id?: number;
	messages?: SendMessagePayloadItem[];
	temp_id?: string;
	reply_to_message_id?: number | null;
	metadata?: MessageFileMetadata;
	mentions?: MentionItem[];
}

export interface SendMessageResponse {
	message: Message;
}

export interface MarkAsReadRequest {
	conversation_id: number;
}

export interface MarkAsReadResponse {
	success: boolean;
}

export interface SetReactionRequest {
	message_id: number;
	reaction: string;
}

export interface RemoveReactionRequest {
	message_id: number;
	reaction?: string;
}

export interface PaginationQuery {
	search?: string;
	order?: string;
	sort?: "asc" | "desc";
	limit?: number;
	page?: number;
	offset?: number;
}

export type ConversationListQuery = PaginationQuery;

export type MessageListQuery = PaginationQuery & { message_type?: string };

export interface PaginatedResult<T> {
	items: T[];
	total: number;
	limit: number;
	offset: number;
	hasMore: boolean;
}
