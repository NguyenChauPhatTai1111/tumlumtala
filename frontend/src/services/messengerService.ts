import { apiClient } from "@api/client";
import axios from "axios";
import type {
	Conversation,
	ConversationListQuery,
	CreateConversationRequest,
	MarkAsReadResponse,
	Message,
	MessageListQuery,
	PaginatedResult,
	Participant,
	RemoveReactionRequest,
	SendMessageRequest,
	SendMessageResponse,
	SetReactionRequest,
	User,
} from "@/types/messenger";
import { stripCdnUrl } from "@/utils/urlUtils";

type ApiRequestOptions = {
	method?: string;
	data?: unknown;
	params?: Record<string, unknown>;
	headers?: Record<string, string>;
};

const apiRequest = async (endpoint: string, options: ApiRequestOptions = {}) => {
	const { method = "GET", data, params, headers } = options;
	const response = await apiClient.request({ url: endpoint, method, data, params, headers });
	return response.data;
};

const MESSENGER_PREFIX = "/messenger";

export const getMessengerApiErrorMessage = (
	error: unknown,
	fallback: string,
): string => {
	if (!axios.isAxiosError<{ message?: string }>(error)) {
		return fallback;
	}

	return error.response?.data?.message || fallback;
};

const toRecord = (value: unknown): Record<string, unknown> => {
	return value && typeof value === "object"
		? (value as Record<string, unknown>)
		: {};
};

type ActivityMarker = { activity_type?: unknown };

const toStringValue = (value: unknown, fallback = ""): string => {
	if (typeof value === "string") return value;
	if (typeof value === "number") return String(value);
	return fallback;
};

const toBooleanValue = (value: unknown): boolean => {
	return Boolean(value);
};

const getAvatarValue = (obj: Record<string, unknown>) => {
	const user = toRecord(obj.user);
	const profile = toRecord(obj.profile);
	return toStringValue(
		obj.avatar ??
			obj.user_avatar ??
			obj.avatar_url ??
			obj.profile_picture ??
			obj.picture ??
			user.avatar ??
			user.user_avatar ??
			user.avatar_url ??
			profile.avatar ??
			profile.avatar_url,
		undefined,
	);
};

const toUser = (raw: unknown): User => {
	const obj = toRecord(raw);
	return {
		id: toStringValue(obj.id ?? obj.user_id ?? obj.uuid),
		username: toStringValue(obj.username ?? obj.fullname ?? ""),
		email: toStringValue(obj.email),
		avatar: getAvatarValue(obj),
		first_name: toStringValue(obj.first_name ?? obj.fullname ?? ""),
		last_name: toStringValue(obj.last_name, undefined),
		is_online: toBooleanValue(obj.is_online),
		last_seen_at: toStringValue(obj.last_seen_at, undefined),
	};
};

const toParticipant = (
	raw: unknown,
): import("@/types/messenger").Participant => {
	const obj = toRecord(raw);
	const nickname = toStringValue(obj.nickname, "");
	const user = toRecord(obj.user);
	const fullname = toStringValue(
		obj.fullname ??
			obj.full_name ??
			obj.name ??
			obj.username ??
			user.fullname ??
			user.full_name ??
			user.name ??
			user.username,
		"",
	);
	return {
		id: Number(obj.id ?? obj.user_id ?? user.id ?? user.user_id ?? 0),
		fullname,
		nickname: nickname || undefined,
		email: toStringValue(obj.email ?? user.email, ""),
		avatar: getAvatarValue(obj),
		role: toStringValue(obj.role, undefined) || undefined,
		last_seen_seq:
			obj.last_seen_seq != null ? Number(obj.last_seen_seq) : undefined,
		last_read_seq:
			obj.last_read_seq != null ? Number(obj.last_read_seq) : undefined,
		last_read_at: toStringValue(obj.last_read_at, "") || null,
		participant_version:
			obj.participant_version != null
				? Number(obj.participant_version)
				: obj.version != null
					? Number(obj.version)
					: undefined,
	};
};

export const toConversation = (raw: unknown): Conversation => {
	const obj = toRecord(raw);
	const themeObj = toRecord(obj.theme);
	const hasTheme = Object.keys(themeObj).length > 0;
	const conversationTheme = hasTheme
		? {
				id: Number(themeObj.id ?? 0),
				preset_id: toStringValue(themeObj.preset_id, ""),
				name: toStringValue(themeObj.name, ""),
				background: toStringValue(themeObj.background, ""),
				background_color: toStringValue(themeObj.background_color, ""),
				incoming_bubble_color: toStringValue(
					themeObj.incoming_bubble_color,
					"",
				),
				outgoing_bubble_color: toStringValue(
					themeObj.outgoing_bubble_color,
					"",
				),
				incoming_text_color: toStringValue(themeObj.incoming_text_color, ""),
				outgoing_text_color: toStringValue(themeObj.outgoing_text_color, ""),
			}
		: undefined;
	const participants = Array.isArray(obj.participants)
		? obj.participants.map(toParticipant)
		: [];
	const customIncomingBubble =
		toStringValue(obj.custom_incoming_bubble_color, "") || undefined;
	const customOutgoingBubble =
		toStringValue(obj.custom_outgoing_bubble_color, "") || undefined;
	const customIncomingText =
		toStringValue(obj.custom_incoming_text_color, "") || undefined;
	const customOutgoingText =
		toStringValue(obj.custom_outgoing_text_color, "") || undefined;

	return {
		id: Number(obj.id ?? 0),
		is_group: toBooleanValue(obj.is_group),
		name: toStringValue(obj.name, ""),
		avatar: toStringValue(obj.avatar, undefined),
		theme_id:
			obj.theme_id != null
				? Number(obj.theme_id)
				: conversationTheme?.id || undefined,
		theme_url: toStringValue(obj.theme_url, undefined),
		theme: conversationTheme,
		background:
			toStringValue(obj.theme_url, undefined) ||
			conversationTheme?.background ||
			toStringValue(obj.background, undefined),
		background_color:
			conversationTheme?.background_color ||
			toStringValue(obj.background_color, undefined),
		incoming_bubble_color:
			customIncomingBubble ||
			conversationTheme?.incoming_bubble_color ||
			toStringValue(obj.incoming_bubble_color, undefined),
		outgoing_bubble_color:
			customOutgoingBubble ||
			conversationTheme?.outgoing_bubble_color ||
			toStringValue(obj.outgoing_bubble_color, undefined),
		incoming_text_color:
			customIncomingText ||
			conversationTheme?.incoming_text_color ||
			toStringValue(obj.incoming_text_color, undefined),
		outgoing_text_color:
			customOutgoingText ||
			conversationTheme?.outgoing_text_color ||
			toStringValue(obj.outgoing_text_color, undefined),
		notifications_enabled: toBooleanValue(obj.notifications_enabled ?? false),
		created_at: toStringValue(obj.created_at, new Date().toISOString()),
		created_by: Number(obj.created_by ?? 0),
		unread_count: Number(obj.unread_count ?? 0),
		last_message_type: toStringValue(obj.last_message_type ?? ""),
		last_message_activity_type: toStringValue(
			obj.last_message_activity_type,
			undefined,
		),
		last_read_message_id:
			obj.last_read_message_id != null
				? Number(obj.last_read_message_id)
				: undefined,
		last_message_id:
			obj.last_message_id != null ? Number(obj.last_message_id) : undefined,
		last_message_at: toStringValue(obj.last_message_at, undefined),
		last_message_sender_id:
			obj.last_message_sender_id != null
				? Number(obj.last_message_sender_id)
				: undefined,
		last_message_sender_name: toStringValue(
			obj.last_message_sender_name,
			undefined,
		),
		last_message_content: toStringValue(obj.last_message_content, ""),
		emoji_source_type: toStringValue(obj.emoji_source_type, undefined),
		quick_reaction: toStringValue(obj.quick_reaction, undefined),
		is_archived: toBooleanValue(obj.is_archived),
		conversation_version:
			obj.conversation_version != null
				? Number(obj.conversation_version)
				: obj.version != null
					? Number(obj.version)
					: undefined,
		participants,
	};
};

export const toMessage = (raw: unknown): Message => {
	const obj = toRecord(raw);
	const rawReplyToId = obj.reply_to_message_id;
	const replyToMessageId =
		rawReplyToId === null || rawReplyToId === undefined || rawReplyToId === ""
			? null
			: Number(rawReplyToId);
	const reactions = Array.isArray(obj.reactions)
		? obj.reactions
				.map((reaction) => {
					const reactionObj = toRecord(reaction);
					const emoji = toStringValue(reactionObj.emoji, "").trim();
					if (!emoji) {
						return null;
					}

					return {
						user_id: toStringValue(reactionObj.user_id),
						emoji,
					};
				})
				.filter(
					(item): item is { user_id: string; emoji: string } => item !== null,
				)
		: undefined;

	return {
		id: Number(obj.id ?? obj.message_id ?? 0),
		conversation_id: Number(obj.conversation_id ?? 0),
		seq:
			obj.seq != null
				? Number(obj.seq)
				: obj.message_seq != null
					? Number(obj.message_seq)
					: undefined,
		message_seq:
			obj.message_seq != null
				? Number(obj.message_seq)
				: obj.seq != null
					? Number(obj.seq)
					: undefined,
		temp_id: toStringValue(obj.temp_id, undefined),
		sender_id: toStringValue(obj.sender_id),
		sender_name: toStringValue(obj.sender_name, undefined),
		sender_gender: toStringValue(obj.sender_gender, undefined),
		receiver_id: toStringValue(obj.receiver_id),
		content: toStringValue(obj.content ?? obj.message, ""),
		reply_to_message_id: Number.isFinite(replyToMessageId)
			? replyToMessageId
			: null,
		is_read: toBooleanValue(obj.is_read),
		created_at: toStringValue(obj.created_at, new Date().toISOString()),
		updated_at: toStringValue(obj.updated_at, undefined),
		read_at: toStringValue(obj.read_at, "") || null,
		my_reaction: toStringValue(obj.my_reaction ?? obj.reaction, "") || null,
		reactions,
		histories: Array.isArray(obj.histories)
			? obj.histories.map((h) => {
					const hh = toRecord(h);
					return {
						id: Number(hh.id ?? 0),
						message_id: toStringValue(hh.message_id ?? hh.message_id ?? ""),
						content: toStringValue(hh.content ?? ""),
						edited_by: Number(hh.edited_by ?? 0),
						edited_at: toStringValue(hh.edited_at, undefined),
					} as import("@/types/messenger").MessageHistory;
				})
			: undefined,
		is_updated:
			typeof obj.is_updated !== "undefined"
				? Boolean(obj.is_updated)
				: undefined,
		message_type: toStringValue(obj.message_type ?? ""),
		emoji_source_type: toStringValue(obj.emoji_source_type, undefined),
		activity_type: toStringValue(obj.activity_type, undefined),
		activity_metadata: toStringValue(obj.activity_metadata, undefined),
		activity_actor_id: toStringValue(obj.activity_actor_id, undefined),
		activity_target_id: toStringValue(obj.activity_target_id, undefined),
		metadata: (() => {
			const m = toRecord(obj.metadata);
			const name = toStringValue(
				m.original_name ?? m.filename ?? m.file_name,
				undefined,
			);
			return name
				? {
						original_name: name,
						size: m.size ? Number(m.size) : undefined,
						mime_type: toStringValue(m.mime_type ?? m.mimeType, undefined),
						duration: m.duration ? Number(m.duration) : undefined,
					}
				: undefined;
		})(),
	};
};

export const toActivityMessage = (
	raw: unknown,
): import("@/types/messenger").Message => {
	const obj = toRecord(raw);
	return {
		id: Number(obj.id ?? obj.activity_id ?? obj.message_id ?? 0),
		conversation_id: Number(obj.conversation_id ?? 0),
		sender_id: toStringValue(obj.user_id ?? obj.actor_user_id ?? ""),
		sender_name: toStringValue(obj.actor_name ?? obj.sender_name ?? undefined),
		receiver_id: "",
		content: toStringValue(obj.content ?? ""),
		message_type: toStringValue(obj.action_type ?? "activity"),
		emoji_source_type: toStringValue(obj.emoji_source_type, undefined),
		reply_to_message_id: null,
		is_read: true,
		created_at: toStringValue(obj.created_at, new Date().toISOString()),
		updated_at: toStringValue(obj.created_at, undefined),
		read_at: null,
		my_reaction: null,
		reactions: undefined,
		histories: undefined,
		is_updated: false,
		activity_type: toStringValue(obj.action_type ?? "activity"),
		activity_metadata: toStringValue(obj.metadata ?? obj.metaData ?? undefined),
		activity_actor_id: toStringValue(
			obj.user_id ?? obj.actor_user_id ?? undefined,
		),
		activity_target_id: toStringValue(obj.target_user_id ?? undefined),
	};
};

export const parsePaginated = <T>(
	raw: unknown,
	mapper: (item: unknown) => T,
	fallbackLimit: number,
	fallbackOffset: number,
): PaginatedResult<T> => {
	const root = toRecord(raw);
	const payload = toRecord(root.data ?? root);
	const pagination = toRecord(
		payload.pagination ??
			root.pagination ??
			payload.paginator_info ??
			root.paginator_info,
	);
	const list =
		(Array.isArray(payload.items) && payload.items) ||
		(Array.isArray(payload.data) && payload.data) ||
		(Array.isArray(root.items) && root.items) ||
		(Array.isArray(root.data) && root.data) ||
		[];

	const items = (list as unknown[]).map(mapper);
	const limit = Number(
		payload.limit ??
			root.limit ??
			pagination.limit ??
			pagination.per_page ??
			fallbackLimit,
	);
	const page = Number(payload.page ?? root.page ?? pagination.page ?? 0);
	const derivedOffsetFromPage = page > 0 ? (page - 1) * limit : undefined;
	const offset = Number(
		payload.offset ??
			root.offset ??
			pagination.offset ??
			derivedOffsetFromPage ??
			fallbackOffset,
	);
	const total = Number(
		payload.total ??
			root.total ??
			pagination.total ??
			pagination.count ??
			items.length,
	);

	let hasMore = offset + items.length < total;
	// If backend didn't provide total (total === items.length), infer hasMore
	// by checking if returned items equals the limit (common convention)
	if (!hasMore && total === items.length && items.length === limit) {
		hasMore = true;
	}

	return {
		items,
		total,
		limit,
		offset,
		hasMore,
	};
};

const buildQueryString = (query: Record<string, unknown>) => {
	const params = new URLSearchParams();
	Object.entries(query).forEach(([key, value]) => {
		if (value === undefined || value === null || value === "") {
			return;
		}

		params.set(key, String(value));
	});

	const queryString = params.toString();
	return queryString ? `?${queryString}` : "";
};

// Get all conversations for current user
export const getConversations = async (query: ConversationListQuery = {}) => {
	const { limit = 20, offset = 0, page, search, order, sort } = query;
	const resolvedPage = page ?? Math.floor(offset / limit) + 1;
	const queryString = buildQueryString({
		limit,
		offset,
		page: resolvedPage,
		search,
		order,
		sort,
	});
	const response = await apiRequest(
		`${MESSENGER_PREFIX}/conversations${queryString}`,
		{ method: "GET" },
	);
	const result = parsePaginated(response, toConversation, limit, offset);
	// parsePaginated đã đọc paginator_info.total → hasMore chính xác
	// Fallback: nếu backend không có total, dùng has_next hoặc item count
	const root = toRecord(response);
	const payload = toRecord(root.data ?? root);
	const paginatorInfo = toRecord(payload.paginator_info ?? root.paginator_info);
	if ("has_next" in paginatorInfo) {
		return { ...result, hasMore: Boolean(paginatorInfo.has_next) };
	}
	return result;
};

// Get single conversation
export const getConversation = async (conversationId: number) => {
	const response = await apiRequest(
		`${MESSENGER_PREFIX}/conversations/${conversationId}`,
		{ method: "GET" },
	);
	const root = toRecord(response);
	return toConversation(root.data ?? root);
};

// Get messages in a conversation
export const getMessages = async (
	conversationId: number,
	query: MessageListQuery = {},
) => {
	const {
		limit = 50,
		offset = 0,
		page,
		search,
		order,
		sort,
		message_type,
	} = query;
	const queryString = buildQueryString({
		limit,
		offset,
		page,
		search,
		order,
		sort,
		message_type,
	});
	const response = await apiRequest(
		`${MESSENGER_PREFIX}/conversations/${conversationId}/messages${queryString}`,
		{ method: "GET" },
	);
	const parsed = parsePaginated(response, toMessage, limit, offset);
	const root = toRecord(response);
	const payload = toRecord(root.data ?? root);
	const activitiesRaw = Array.isArray(payload.activities)
		? payload.activities
		: [];
	const activityMessages = activitiesRaw.map(toActivityMessage);
	const mergedItems = [...parsed.items, ...activityMessages].sort((a, b) => {
		const ta = new Date(a.created_at).getTime();
		const tb = new Date(b.created_at).getTime();
		if (ta !== tb) return ta - tb;

		// Tie-break: prefer real messages to appear after activity entries when timestamps equal
		const aIsActivity = Boolean((a as ActivityMarker).activity_type);
		const bIsActivity = Boolean((b as ActivityMarker).activity_type);
		if (aIsActivity === bIsActivity) return 0;
		return aIsActivity ? -1 : 1;
	});

	return {
		...parsed,
		items: mergedItems,
	};
};

export const searchConversationMessages = async (
	conversationId: number,
	query: string,
	limit = 20,
	offset = 0,
) => {
	const queryString = buildQueryString({ query, limit, offset });
	console.debug(
		"searchConversationMessages: url",
		`${MESSENGER_PREFIX}/conversations/${conversationId}/messages/search${queryString}`,
	);
	const response = await apiRequest(
		`${MESSENGER_PREFIX}/conversations/${conversationId}/messages/search${queryString}`,
		{ method: "GET" },
	);

	return parsePaginated(response, toMessage, limit, offset);
};

export const searchAllMessages = async (query: string, limit = 20) => {
	const queryString = buildQueryString({ query, limit });
	const response = await apiRequest(
		`${MESSENGER_PREFIX}/messages/search${queryString}`,
		{ method: "GET" },
	);

	return parsePaginated(response, toMessage, limit, 0);
};

// Create or get conversation with a user
export const createConversation = async (
	payload: CreateConversationRequest,
) => {
	const response = await apiRequest(`${MESSENGER_PREFIX}/conversations`, {
		method: "POST",
		data: payload,
	});
	const root = toRecord(response);
	const data = toRecord(root.data ?? root);

	return toConversation(data.conversation ?? root.conversation ?? data);
};

export const renameConversation = async (
	conversationId: number,
	name: string,
) => {
	await apiRequest(`${MESSENGER_PREFIX}/conversations/${conversationId}/name`, {
		method: "PATCH",
		data: { name },
	});

	return { success: true };
};

export const addConversationMembers = async (
	conversationId: number,
	userIds: number[],
) => {
	await apiRequest(
		`${MESSENGER_PREFIX}/conversations/${conversationId}/members`,
		{ method: "POST", data: { user_ids: userIds } },
	);

	return { success: true };
};

export const removeConversationMember = async (
	conversationId: number,
	userId: number,
) => {
	await apiRequest(
		`${MESSENGER_PREFIX}/conversations/${conversationId}/members/${userId}`,
		{ method: "DELETE" },
	);

	return { success: true };
};

export const getConversationMembers = async (conversationId: number) => {
	const response = await apiRequest(
		`${MESSENGER_PREFIX}/conversations/${conversationId}/members`,
		{ method: "GET" },
	);

	const root = toRecord(response);
	const payload = toRecord(root.data ?? root);
	const list =
		(Array.isArray(payload.items) && payload.items) ||
		(Array.isArray(payload.data) && payload.data) ||
		(Array.isArray(root.items) && root.items) ||
		(Array.isArray(root.data) && root.data) ||
		[];

	return (list as unknown[]).map(toParticipant) as Participant[];
};

export const updateConversationBackground = async (
	conversationId: number,
	payload: {
		theme_id?: number;
		theme_url?: string | File;
		background?: string;
		background_color?: string;
		custom_incoming_bubble_color?: string;
		custom_outgoing_bubble_color?: string;
		custom_incoming_text_color?: string;
		custom_outgoing_text_color?: string;
	},
) => {
	const data =
		payload.theme_url instanceof File
			? (() => {
					const formData = new FormData();
					if (payload.theme_id != null) {
						formData.append("theme_id", String(payload.theme_id));
					}
					formData.append("file", payload.theme_url, payload.theme_url.name);
					if (payload.background_color)
						formData.append("background_color", payload.background_color);
					if (payload.custom_incoming_bubble_color)
						formData.append(
							"custom_incoming_bubble_color",
							payload.custom_incoming_bubble_color,
						);
					if (payload.custom_outgoing_bubble_color)
						formData.append(
							"custom_outgoing_bubble_color",
							payload.custom_outgoing_bubble_color,
						);
					if (payload.custom_incoming_text_color)
						formData.append(
							"custom_incoming_text_color",
							payload.custom_incoming_text_color,
						);
					if (payload.custom_outgoing_text_color)
						formData.append(
							"custom_outgoing_text_color",
							payload.custom_outgoing_text_color,
						);
					return formData;
				})()
			: {
					theme_id: payload.theme_id ?? null,
					...(payload.theme_url !== undefined
						? { theme_url: payload.theme_url }
						: {}),
					...(payload.background !== undefined
						? { background: payload.background }
						: {}),
					...(payload.background_color !== undefined
						? { background_color: payload.background_color }
						: {}),
					...(payload.custom_incoming_bubble_color
						? {
								custom_incoming_bubble_color:
									payload.custom_incoming_bubble_color,
							}
						: {}),
					...(payload.custom_outgoing_bubble_color
						? {
								custom_outgoing_bubble_color:
									payload.custom_outgoing_bubble_color,
							}
						: {}),
					...(payload.custom_incoming_text_color
						? { custom_incoming_text_color: payload.custom_incoming_text_color }
						: {}),
					...(payload.custom_outgoing_text_color
						? { custom_outgoing_text_color: payload.custom_outgoing_text_color }
						: {}),
				};

	await apiRequest(
		`${MESSENGER_PREFIX}/conversations/${conversationId}/background`,
		{ method: "PATCH", data },
	);

	return { success: true };
};

export const updateConversationAvatar = async (
	conversationId: number,
	avatar: string | File,
) => {
	const data =
		avatar instanceof File
			? (() => {
					const formData = new FormData();
					formData.append("file", avatar, avatar.name);
					return formData;
				})()
			: { avatar: stripCdnUrl(avatar) ?? avatar };

	await apiRequest(
		`${MESSENGER_PREFIX}/conversations/${conversationId}/avatar`,
		{ method: "PATCH", data },
	);

	return { success: true };
};

export const updateConversationNotifications = async (
	conversationId: number,
	enabled: boolean,
) => {
	await apiRequest(
		`${MESSENGER_PREFIX}/conversations/${conversationId}/notifications`,
		{ method: "PATCH", data: { enabled } },
	);

	return { success: true };
};

export const setConversationNickname = async (
	conversationId: number,
	targetUserId: number,
	nickname: string,
) => {
	await apiRequest(
		`${MESSENGER_PREFIX}/conversations/${conversationId}/nickname/${targetUserId}`,
		{ method: "PATCH", data: { nickname } },
	);

	return { success: true };
};

export const leaveConversation = async (conversationId: number) => {
	await apiRequest(
		`${MESSENGER_PREFIX}/conversations/${conversationId}/leave`,
		{ method: "POST" },
	);

	return { success: true };
};

export const setQuickReaction = async (
	conversationId: number,
	quickReaction: string,
) => {
	const response = await apiRequest(
		`${MESSENGER_PREFIX}/conversations/${conversationId}/quick-reaction`,
		{ method: "PATCH", data: { quick_reaction: quickReaction } },
	);

	const root = toRecord(response);
	return toConversation(root.data ?? root.conversation ?? root);
};

// Send message
export const sendMessage = async (payload: SendMessageRequest) => {
	const response = await apiRequest(`${MESSENGER_PREFIX}/messages`, {
		method: "POST",
		data: payload,
	});

	const root = toRecord(response);
	const data = toRecord(root.data ?? root);

	return {
		message: toMessage(data),
	} satisfies SendMessageResponse;
};

export const uploadMessageAttachment = async (
	conversationId: number,
	file: File,
) => {
	const formData = new FormData();
	formData.append("conversation_id", String(conversationId));
	formData.append("file", file, file.name);

	const response = await apiRequest(`${MESSENGER_PREFIX}/messages/upload`, {
		method: "POST",
		data: formData,
	});

	const root = toRecord(response);
	const data = toRecord(root.data ?? root);
	return toStringValue(data.path ?? root.path ?? "");
};

//  Get history of a message
export const getMessageHistory = async (messageId: number) => {
	const response = await apiRequest(
		`${MESSENGER_PREFIX}/messages/${messageId}/history`,
		{ method: "GET" },
	);

	const root = toRecord(response);
	const rawData = root.data ?? root;
	let historiesRaw: unknown[] = [];

	if (Array.isArray(rawData)) {
		historiesRaw = rawData;
	} else if (
		typeof rawData === "object" &&
		rawData !== null &&
		Array.isArray((rawData as Record<string, unknown>).histories)
	) {
		historiesRaw = (rawData as Record<string, unknown>).histories as unknown[];
	} else if (Array.isArray(root.histories)) {
		historiesRaw = root.histories;
	}

	return historiesRaw.map((h) => {
		const hh = toRecord(h);
		return {
			id: Number(hh.id ?? 0),
			message_id: toStringValue(hh.message_id ?? hh.message_id ?? ""),
			content: toStringValue(hh.content ?? ""),
			edited_by: Number(hh.edited_by ?? 0),
			edited_at: toStringValue(hh.edited_at, undefined),
		} as import("@/types/messenger").MessageHistory;
	});
};

export const updateMessage = async (messageId: number, content: string) => {
	const response = await apiRequest(
		`${MESSENGER_PREFIX}/messages/${messageId}`,
		{ method: "PATCH", data: { content } },
	);

	const root = toRecord(response);
	const data = toRecord(root.data ?? root);
	return toMessage(data.message ?? root.message ?? data);
};

export const deleteMessage = async (messageId: number) => {
	await apiRequest(`${MESSENGER_PREFIX}/messages/${messageId}`, {
		method: "DELETE",
	});

	return { success: true };
};

export const setMessageReaction = async (payload: SetReactionRequest) => {
	await apiRequest(
		`${MESSENGER_PREFIX}/messages/${payload.message_id}/reactions`,
		{ method: "POST", data: { reaction: payload.reaction } },
	);

	return { success: true };
};

export const removeMessageReaction = async (payload: RemoveReactionRequest) => {
	try {
		await apiRequest(
			`${MESSENGER_PREFIX}/messages/${payload.message_id}/reactions`,
			{
				method: "DELETE",
				data: payload.reaction ? { reaction: payload.reaction } : undefined,
			},
		);
	} catch {
		await apiRequest(
			`${MESSENGER_PREFIX}/messages/${payload.message_id}/reactions`,
			{ method: "DELETE" },
		);
	}

	return { success: true };
};

// Mark message as read
export const markAsRead = async (
	conversationId: number,
	lastReadSeq?: number,
) => {
	const body = lastReadSeq != null ? { last_read_seq: lastReadSeq } : {};
	await apiRequest(`${MESSENGER_PREFIX}/conversations/${conversationId}/read`, {
		method: "POST",
		data: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
	});
	return { success: true } as MarkAsReadResponse;
};

// Archive conversation
export const archiveConversation = async (conversationId: number) => {
	await apiRequest(
		`${MESSENGER_PREFIX}/conversations/${conversationId}/archive`,
		{ method: "POST" },
	);
	return { success: true };
};

// Restore conversation
export const restoreConversation = async (conversationId: number) => {
	await apiRequest(
		`${MESSENGER_PREFIX}/conversations/${conversationId}/restore`,
		{ method: "POST" },
	);
	return { success: true };
};

// Delete conversation
export const deleteConversation = async (conversationId: number) => {
	await apiRequest(`${MESSENGER_PREFIX}/conversations/${conversationId}`, {
		method: "DELETE",
	});
	return { success: true };
};

// Search users to start conversation
export const searchUsers = async (
	searchQuery: string,
	page = 1,
	limit = 20,
) => {
	const params = new URLSearchParams();
	params.append("page", String(page));
	params.append("limit", String(limit));
	if (searchQuery.trim()) {
		params.append("search", searchQuery.trim());
	}

	const response = await apiRequest(`/users?${params.toString()}`, {
		method: "GET",
	});

	const root = toRecord(response);
	const data = toRecord(root.data);
	const users = Array.isArray(data.users) ? data.users : [];
	const total = Number(data.total ?? users.length);
	const totalPages = Math.ceil(total / limit) || 1;

	return {
		items: users.map(toUser),
		total,
		page,
		limit,
		total_pages: totalPages,
		has_next: page < totalPages,
		has_prev: page > 1,
	};
};
