import { apiRequest } from "@api/authApi";
import { API_PREFIX } from "@services/apiService";
import type {
	ChatContentFormat,
	Conversation,
	CreateConversationRequest,
	Message,
	PaginatedResult,
	PaginationQuery,
	SendMessageRequest,
	SendMessageResponse,
} from "@/types/chat";

const CHAT_PREFIX = `${API_PREFIX}/chat`;

const toRecord = (value: unknown): Record<string, unknown> => {
	return value && typeof value === "object"
		? (value as Record<string, unknown>)
		: {};
};

const toStringValue = (value: unknown, fallback = ""): string => {
	if (typeof value === "string") return value;
	if (typeof value === "number") return String(value);
	return fallback;
};

const toBooleanValue = (value: unknown): boolean => {
	return Boolean(value);
};

const toStringArray = (value: unknown): string[] => {
	if (!Array.isArray(value)) return [];
	return value.map((item) => toStringValue(item).trim()).filter(Boolean);
};

const extractSuggestionWords = (data: Record<string, unknown>): string[] => {
	const direct = toStringArray(
		data.suggestion_words ?? data.suggestions ?? data.words,
	);
	if (direct.length > 0) return direct;

	const nested = toRecord(data.result ?? data.payload ?? data.meta);
	return toStringArray(
		nested.suggestion_words ?? nested.suggestions ?? nested.words,
	);
};

const buildAssistantContent = (
	baseText: string,
	suggestionWords: string[],
): string => {
	if (suggestionWords.length === 0) return baseText;

	const listText = suggestionWords.map((word) => `- ${word}`).join("\n");
	const trimmedBase = baseText.trim();

	if (!trimmedBase) {
		return `Gợi ý từ:\n${listText}`;
	}

	return `${trimmedBase}\n\nGợi ý từ:\n${listText}`;
};

const normalizeContentFormat = (value: unknown): ChatContentFormat => {
	return value === "markdown" ? "markdown" : "text";
};

type ParsedMessageContent = {
	content: string;
	format: ChatContentFormat;
};

export const parseMessageContent = (raw: unknown): ParsedMessageContent => {
	if (typeof raw === "string") {
		return { content: raw, format: "text" };
	}

	if (!raw || typeof raw !== "object") {
		return { content: "", format: "text" };
	}

	const obj = raw as Record<string, unknown>;
	const content = toStringValue(
		obj.raw ?? obj.content ?? obj.message ?? obj.text,
		"",
	);

	return {
		content,
		format: normalizeContentFormat(obj.format),
	};
};

const toConversation = (raw: unknown): Conversation => {
	const obj = toRecord(raw);
	const deletedAt = toStringValue(obj.deleted_at ?? obj.deletedAt, "");

	return {
		id: toStringValue(obj.id ?? obj.conversation_id),
		title: toStringValue(obj.title, "Cuoc tro chuyen moi"),
		context: toStringValue(obj.context, "general") as Conversation["context"],
		is_archived: toBooleanValue(obj.is_archived),
		deleted_at: deletedAt || null,
		created_at: toStringValue(obj.created_at, new Date().toISOString()),
		updated_at: toStringValue(
			obj.updated_at ?? obj.created_at,
			new Date().toISOString(),
		),
		last_message: toStringValue(obj.last_message, ""),
		last_message_at: toStringValue(obj.last_message_at, ""),
	};
};

const toMessage = (raw: unknown): Message => {
	const obj = toRecord(raw);
	const parsed = parseMessageContent(
		obj.content ?? obj.message ?? obj.raw ?? obj,
	);

	// If content was a plain string, parseMessageContent defaults format to "text".
	// But the server may return format as a separate top-level field — respect it.
	const format =
		parsed.format === "text" && obj.format != null
			? normalizeContentFormat(obj.format)
			: parsed.format;

	return {
		id: toStringValue(obj.id ?? obj.message_id),
		conversation_id: toStringValue(obj.conversation_id),
		role: toStringValue(obj.role, "assistant") as Message["role"],
		content: parsed.content,
		format,
		created_at: toStringValue(obj.created_at, new Date().toISOString()),
	};
};

const parsePaginated = <T>(
	raw: unknown,
	mapper: (item: unknown) => T,
	fallbackLimit: number,
	fallbackOffset: number,
): PaginatedResult<T> => {
	const root = toRecord(raw);
	const payload = toRecord(root.data ?? root);
	const list =
		(Array.isArray(payload.items) && payload.items) ||
		(Array.isArray(payload.data) && payload.data) ||
		(Array.isArray(root.items) && root.items) ||
		(Array.isArray(root.data) && root.data) ||
		[];

	const items = (list as unknown[]).map(mapper);
	const total = Number(payload.total ?? root.total ?? items.length);
	const limit = Number(payload.limit ?? root.limit ?? fallbackLimit);
	const offset = Number(payload.offset ?? root.offset ?? fallbackOffset);

	return {
		items,
		total,
		limit,
		offset,
		hasMore: offset + items.length < total,
	};
};

export const createConversation = async (
	payload: CreateConversationRequest,
): Promise<Conversation> => {
	const response = await apiRequest(`${CHAT_PREFIX}/conversations`, {
		method: "POST",
		data: payload,
	});

	const root = toRecord(response);
	return toConversation(root.data ?? root.conversation ?? root);
};

export const getConversations = async (
	query: PaginationQuery = {},
): Promise<PaginatedResult<Conversation>> => {
	const limit = query.limit ?? 20;
	const offset = query.offset ?? 0;

	const response = await apiRequest(`${CHAT_PREFIX}/conversations`, {
		method: "GET",
		params: { limit, offset },
	});

	return parsePaginated(response, toConversation, limit, offset);
};

export const getConversationMessages = async (
	conversationId: string,
	query: PaginationQuery = {},
): Promise<PaginatedResult<Message>> => {
	const limit = query.limit ?? 20;
	const offset = query.offset ?? 0;

	const response = await apiRequest(
		`${CHAT_PREFIX}/conversations/${conversationId}/messages`,
		{
			method: "GET",
			params: { limit, offset },
		},
	);

	return parsePaginated(response, toMessage, limit, offset);
};

export const sendMessage = async (
	payload: SendMessageRequest,
): Promise<SendMessageResponse> => {
	const response = await apiRequest(`${CHAT_PREFIX}/messages`, {
		method: "POST",
		data: payload,
	});

	const root = toRecord(response);
	const data = toRecord(root.data ?? root);

	const conversationId = Number(
		data.conversation_id ?? payload.conversation_id,
	);
	const userMessageId = Number(data.user_message_id);
	const assistantMessageId = Number(data.assistant_message_id);
	const userRaw = data.user_message;
	const suggestionWords = extractSuggestionWords(data);
	const assistantRawContent =
		data.assistant_response ??
		data.assistant_message ??
		data.message ??
		data.assistant;
	const assistantParsed = parseMessageContent(
		typeof assistantRawContent === "string"
			? { raw: assistantRawContent, format: data.format }
			: assistantRawContent,
	);
	const assistantContent = buildAssistantContent(
		assistantParsed.content,
		suggestionWords,
	);

	const userMessage: Message | undefined =
		typeof userRaw === "string"
			? {
					id: Number.isFinite(userMessageId)
						? String(userMessageId)
						: `user-${Date.now()}`,
					conversation_id: String(conversationId),
					role: "user",
					content: userRaw,
					created_at: new Date().toISOString(),
				}
			: userRaw
				? toMessage(userRaw)
				: undefined;

	const assistantMessage: Message =
		typeof data.assistant_message === "object" &&
		data.assistant_message !== null
			? toMessage(data.assistant_message)
			: {
					id: Number.isFinite(assistantMessageId)
						? String(assistantMessageId)
						: `assistant-${Date.now()}`,
					conversation_id: String(conversationId),
					role: "assistant",
					content: assistantContent,
					format: assistantParsed.format,
					created_at: new Date().toISOString(),
				};

	if (
		typeof data.assistant_message === "object" &&
		data.assistant_message !== null
	) {
		assistantMessage.content = buildAssistantContent(
			assistantMessage.content,
			suggestionWords,
		);
	}

	return {
		conversation_id: conversationId,
		user_message_id: Number.isFinite(userMessageId) ? userMessageId : undefined,
		assistant_message_id: Number.isFinite(assistantMessageId)
			? assistantMessageId
			: undefined,
		user_message: userMessage,
		assistant_message: assistantMessage,
		suggestion_words: suggestionWords.length > 0 ? suggestionWords : undefined,
		tokens_used: Number.isFinite(Number(data.tokens_used))
			? Number(data.tokens_used)
			: undefined,
		response_time_ms: Number.isFinite(Number(data.response_time_ms))
			? Number(data.response_time_ms)
			: undefined,
	};
};

export const archiveConversation = async (
	conversationId: string,
): Promise<void> => {
	await apiRequest(`${CHAT_PREFIX}/conversations/${conversationId}/archive`, {
		method: "POST",
	});
};

export const restoreConversation = async (
	conversationId: string,
): Promise<void> => {
	await apiRequest(`${CHAT_PREFIX}/conversations/${conversationId}/restore`, {
		method: "POST",
	});
};

export const clearConversationHistory = async (
	conversationId: string,
): Promise<void> => {
	await apiRequest(
		`${CHAT_PREFIX}/conversations/${conversationId}/clear-history`,
		{
			method: "POST",
		},
	);
};

export const deleteConversation = async (
	conversationId: string,
): Promise<void> => {
	await apiRequest(`${CHAT_PREFIX}/conversations/${conversationId}`, {
		method: "DELETE",
	});
};
