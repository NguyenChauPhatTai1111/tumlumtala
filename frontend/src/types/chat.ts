export type ChatContext =
	| "product"
	| "user"
	| "game"
	| "account"
	| "support"
	| "general";
export type ChatRequestType = "wordchain";

export type ChatRole = "user" | "assistant" | "system";
export type ChatContentFormat = "text" | "markdown";

export interface Conversation {
	id: string;
	title: string;
	context: ChatContext;
	is_archived: boolean;
	deleted_at?: string | null;
	created_at: string;
	updated_at: string;
	last_message?: string;
	last_message_at?: string;
}

export interface Message {
	id: string;
	conversation_id: string;
	role: ChatRole;
	content: string;
	format?: ChatContentFormat;
	created_at: string;
	pending?: boolean;
	failed?: boolean;
	streaming?: boolean;
}

export interface CreateConversationRequest {
	context?: ChatContext;
	title?: string;
}

export interface CreateConversationResponse {
	conversation: Conversation;
}

export interface SendMessageRequest {
	conversation_id: number;
	message: string;
	type?: ChatRequestType;
}

export interface SendMessageResponse {
	conversation_id: number;
	user_message_id?: number;
	assistant_message_id?: number;
	user_message?: Message;
	assistant_message: Message;
	suggestion_words?: string[];
	tokens_used?: number;
	response_time_ms?: number;
}

export interface PaginationQuery {
	limit?: number;
	offset?: number;
}

export interface PaginatedResult<T> {
	items: T[];
	total: number;
	limit: number;
	offset: number;
	hasMore: boolean;
}
