export interface WebSocketMessage {
	type: string;
	payload: unknown;
	sender?: string;
}

export interface VersionedConversationEvent {
	conversation_id: number;
	conversation_version: number;
}

export interface VersionedMessageEvent extends VersionedConversationEvent {
	message_seq: number;
}

export interface VersionedParticipantEvent extends VersionedConversationEvent {
	participant_version: number;
	user_id?: number;
}

export interface WebSocketHandlers {
	onConnected?: () => void;
	onMessengerSubscribed?: (data: { user_id: number; online_user_ids?: number[] }) => void;
	onConversationsListResult?: (data: unknown) => void;
	onMessagesListResult?: (data: unknown) => void;
	onMessageSeen?: (data: {
		message_id: number;
		user_id: number;
		conversation_id: number;
		seen_at: string;
	}) => void;
	onMessageSeenSeq?: (data: {
		user_id: number;
		conversation_id: number;
		last_read_seq: number;
		seen_at?: string;
	}) => void;
	onMessageDelivered?: (data: {
		user_id: number;
		conversation_id: number;
		message_seq: number;
	}) => void;
	onMessageSent?: (data: unknown) => void;
	onMessageUpdated?: (data: unknown) => void;
	onUserTyping?: (data: { user_id: number; conversation_id: number }) => void;
	onTypingStart?: (data: { user_id: number; conversation_id: number }) => void;
	onTypingStop?: (data: { user_id: number; conversation_id: number }) => void;
	onMessageCreated?: (data: unknown) => void;
	onMessageSendAck?: (data: {
		request_id?: string;
		temp_id?: string;
		message_id: number;
		seq: number;
		conversation_id: number;
	}) => void;
	onConversationUpdated?: (
		data: VersionedConversationEvent & { conversation: unknown },
	) => void;
	onParticipantUpdated?: (
		data: VersionedParticipantEvent & { participant: unknown },
	) => void;
	onJoinedRoom?: (data: unknown) => void;
	onMessageDeleted?: (data: {
		message_id: number;
		conversation_id: number;
	}) => void;
	onReactionUpdated?: (data: {
		message_id: number;
		conversation_id: number;
		user_id: number;
		reaction: string;
	}) => void;
	onReactionRemoved?: (data: {
		message_id: number;
		conversation_id: number;
		user_id: number;
	}) => void;
	onCallRinging?: (data: unknown) => void;
	onCallIncoming?: (data: unknown) => void;
	onCallAccept?: (data: unknown) => void;
	onCallReject?: (data: unknown) => void;
	onCallCancel?: (data: unknown) => void;
	onCallOffer?: (data: unknown) => void;
	onCallAnswer?: (data: unknown) => void;
	onCallIceCandidate?: (data: unknown) => void;
	onCallEnd?: (data: unknown) => void;
	onCallBusy?: (data: unknown) => void;
	onCallFailed?: (data: unknown) => void;
	onCallMissed?: (data: unknown) => void;
	onCallReconnect?: (data: unknown) => void;
	onActivityCreated?: (data: unknown) => void;
	onError?: (error: string) => void;
	onPresenceUpdated?: (data: { user_id: number; status: "online" | "offline" }) => void;
}

export class MessengerWebSocketService {
	private ws: WebSocket | null = null;
	private handlers: WebSocketHandlers = {};
	private subscribers = new Set<Partial<WebSocketHandlers>>();
	private reconnectAttempts = 0;
	private readonly maxReconnectAttempts = 5;
	private readonly reconnectDelay = 3000;
	private activeConnectPromise: Promise<void> | null = null;
	private url: string;
	private token: string;
	private currentUserId?: string;
	private deliveredMessageSeq = new Set<string>();
	private pendingReads = new Map<number, number>();
	private pendingJoinRoom: {
		conversation_id: number;
		limit: number;
		offset: number;
	} | null = null;
	private messageBatchBuffer: string[] = [];
	private messageBatchTimer: ReturnType<typeof setTimeout> | null = null;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

	constructor(url: string, token: string, currentUserId: string) {
		this.url = url;
		this.token = token;
		this.currentUserId = currentUserId;
	}

	connect(): Promise<void> {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}

		if (this.activeConnectPromise) {
			return this.activeConnectPromise;
		}

		this.activeConnectPromise = new Promise((resolve, reject) => {
			try {
				const wsUrl = `${this.url}?token=${this.token}`;
				this.ws = new WebSocket(wsUrl);

				this.ws.onopen = () => {
					this.reconnectAttempts = 0;
					this.activeConnectPromise = null;

					// Auto-subscribe to personal user channel
					this.send("messenger.subscribe", {});

					// Flush pending reads
					for (const [conversationId, lastReadSeq] of this.pendingReads) {
						this.send("conversation.read", {
							conversation_id: conversationId,
							last_read_seq: lastReadSeq,
						});
					}
					this.pendingReads.clear();

					if (this.pendingJoinRoom) {
						this.send("room.join", this.pendingJoinRoom);
						this.pendingJoinRoom = null;
					}

					// Notify subscribers that connection is established
					this.emit("onConnected", undefined);

					resolve();
				};

				this.ws.onmessage = (event) => {
					this.messageBatchBuffer.push(event.data);
					if (!this.messageBatchTimer) {
						this.messageBatchTimer = setTimeout(() => {
							this.messageBatchTimer = null;
							const batch = this.messageBatchBuffer.splice(0);
							for (const data of batch) {
								this.handleMessage(data);
							}
						}, 0);
					}
				};
				this.ws.onerror = () => {
					this.activeConnectPromise = null;
				};
				this.ws.onclose = () => {
					this.activeConnectPromise = null;
					this.handleDisconnect();
				};
			} catch (error) {
				this.activeConnectPromise = null;
				reject(error);
			}
		});

		return this.activeConnectPromise;
	}

	private handleMessage(data: string) {
		try {
			const message: WebSocketMessage = JSON.parse(data);

			switch (message.type) {
				// New WS-first data events
				case "messenger.subscribed":
					this.emit("onMessengerSubscribed", message.payload);
					break;
				case "conversations.list.result":
					this.emit("onConversationsListResult", message.payload);
					break;
				case "messages.list.result":
					this.emit("onMessagesListResult", message.payload);
					break;

				// Real-time message events
				case "message.sent":
				case "message_sent":
					this.emit("onMessageSent", message.payload);
					break;
				case "message.updated":
				case "message_updated":
					this.emit("onMessageUpdated", message.payload);
					break;
				case "message.delivered":
				case "message_delivered":
					this.emit("onMessageDelivered", message.payload);
					break;
				case "message.seen": {
					this.emit("onMessageSeenSeq", message.payload);
					const payload = message.payload as Record<string, unknown>;
					const lastReadSeq = payload.last_read_seq;
					if (typeof lastReadSeq === "number") {
						this.emit("onMessageSeen", {
							message_id: lastReadSeq,
							user_id: payload.user_id,
							conversation_id: payload.conversation_id,
							seen_at: payload.seen_at || new Date().toISOString(),
						});
					}
					break;
				}
				case "message_seen":
					this.emit("onMessageSeen", message.payload);
					break;
				case "typing.start":
					this.emit("onTypingStart", message.payload);
					this.emit("onUserTyping", message.payload);
					break;
				case "typing.stop":
					this.emit("onTypingStop", message.payload);
					break;
				case "user_typing":
					this.emit("onUserTyping", message.payload);
					break;
				case "message.send.ack":
					this.emit("onMessageSendAck", message.payload);
					break;
				// new_message is a legacy alias kept for backward compatibility.
				case "new_message":
				case "message.created":
				case "message_created": {
					this.emit("onMessageCreated", message.payload);

					// Auto-send delivery receipt for messages from other users.
					const payload = message.payload as Record<string, unknown>;
					const senderId = payload.sender_id;
					const conversationId = payload.conversation_id;
					// Backend sends `seq` (not `message_seq`) in SendMessageOutput.
					const messageSeq = payload.seq ?? payload.message_seq;

					if (
						(typeof senderId === "string" || typeof senderId === "number") &&
						typeof conversationId === "number" &&
						typeof messageSeq === "number" &&
						String(senderId) !== this.currentUserId
					) {
						const deliveredKey = `${conversationId}:${messageSeq}`;
						if (!this.deliveredMessageSeq.has(deliveredKey)) {
							this.deliveredMessageSeq.add(deliveredKey);
							this.sendDelivered(conversationId, messageSeq);
						}
					}
					break;
				}
				case "message.deleted":
				case "message_deleted":
					this.emit("onMessageDeleted", message.payload);
					break;
				case "reaction_updated":
					this.emit("onReactionUpdated", message.payload);
					break;
				case "reaction_removed":
					this.emit("onReactionRemoved", message.payload);
					break;
				case "call:ringing":
					this.emit("onCallRinging", message.payload);
					break;
				case "call:incoming":
					this.emit("onCallIncoming", message.payload);
					break;
				case "call:accept":
					this.emit("onCallAccept", message.payload);
					break;
				case "call:reject":
				case "call:rejected":
					this.emit("onCallReject", message.payload);
					break;
				case "call:cancel":
					this.emit("onCallCancel", message.payload);
					break;
				case "call:offer":
					this.emit("onCallOffer", message.payload);
					break;
				case "call:answer":
					this.emit("onCallAnswer", message.payload);
					break;
				case "call:ice-candidate":
					this.emit("onCallIceCandidate", message.payload);
					break;
				case "call:end":
					this.emit("onCallEnd", message.payload);
					break;
				case "call:busy":
					this.emit("onCallBusy", message.payload);
					break;
				case "call:failed":
					this.emit("onCallFailed", message.payload);
					break;
				case "call:missed":
					this.emit("onCallMissed", message.payload);
					break;
				case "call:reconnect":
					this.emit("onCallReconnect", message.payload);
					break;
				case "conversation.activity":
					this.emit("onActivityCreated", message.payload);
					break;
				case "conversation.updated":
				case "conversation_updated":
					this.emit("onConversationUpdated", message.payload);
					break;
				case "participant.updated":
				case "participant_updated":
					this.emit("onParticipantUpdated", message.payload);
					break;
				case "room.joined":
					this.emit("onJoinedRoom", message.payload);
					break;
				case "presence.updated":
					this.emit("onPresenceUpdated", message.payload);
					break;
				case "error": {
					const errorPayload = message.payload as Record<string, unknown>;
					const errorMessage =
						typeof errorPayload === "object" &&
						errorPayload !== null &&
						"message" in errorPayload
							? String(errorPayload.message)
							: "Unknown error";
					this.emit("onError", errorMessage);
					break;
				}
				default:
			}
		} catch (error) {
			console.error("[WebSocket] Error handling message:", error);
		}
	}

	private emit<K extends keyof WebSocketHandlers>(
		eventName: K,
		payload: unknown,
	) {
		type HandlerPayload = Parameters<NonNullable<WebSocketHandlers[K]>>[0];
		const handler = this.handlers[eventName] as
			| ((data: HandlerPayload) => void)
			| undefined;
		handler?.(payload as HandlerPayload);

		this.subscribers.forEach((subscriber) => {
			const subHandler = subscriber[eventName] as
				| ((data: HandlerPayload) => void)
				| undefined;
			subHandler?.(payload as HandlerPayload);
		});
	}

	private handleDisconnect() {
		if (this.reconnectAttempts < this.maxReconnectAttempts) {
			this.reconnectAttempts++;
			this.reconnectTimer = setTimeout(
				() => this.connect().catch(console.error),
				this.reconnectDelay,
			);
		} else {
			console.error("[WebSocket] Max reconnection attempts reached");
		}
	}

	// ─── WS-first data fetching ───────────────────────────────────────────────

	/** Request conversations list. Response comes via onConversationsListResult. */
	listConversations(options: {
		requestId: string;
		page?: number;
		limit?: number;
		search?: string;
	}) {
		this.send("conversations.list", {
			request_id: options.requestId,
			page: options.page ?? 1,
			limit: options.limit ?? 20,
			search: options.search,
		});
	}

	/** Request messages for a conversation. Response comes via onMessagesListResult. */
	listMessages(options: {
		requestId: string;
		conversationId: number;
		page?: number;
		limit?: number;
		offset?: number;
	}) {
		this.send("messages.list", {
			request_id: options.requestId,
			conversation_id: options.conversationId,
			page: options.page ?? 1,
			limit: options.limit ?? 50,
			offset: options.offset ?? 0,
		});
	}

	// ─── Room & messaging ─────────────────────────────────────────────────────

	joinRoom(conversationId: number, limit: number = 50, offset: number = 0) {
		if (!this.isConnected()) {
			this.pendingJoinRoom = {
				conversation_id: conversationId,
				limit,
				offset,
			};
			return;
		}
		this.send("room.join", {
			conversation_id: conversationId,
			limit,
			offset,
		});
	}

	sendMessage(
		conversationId: number,
		content: string,
		messageType: string = "text",
		replyToMessageId?: number,
		tempId?: string,
	) {
		this.send("message.send", {
			conversation_id: conversationId,
			temp_id: tempId,
			content,
			message_type: messageType,
			reply_to_message_id: replyToMessageId,
		});
	}

	markMessageAsSeen(conversationId: number, messageId: number) {
		if (!this.isConnected()) {
			const current = this.pendingReads.get(conversationId) ?? 0;
			if (messageId > current) {
				this.pendingReads.set(conversationId, messageId);
			}
			return;
		}
		this.send("conversation.read", {
			conversation_id: conversationId,
			last_read_seq: messageId,
		});
	}

	sendConversationRead(conversationId: number, lastReadSeq: number) {
		if (!this.isConnected()) {
			const current = this.pendingReads.get(conversationId) ?? 0;
			if (lastReadSeq > current) {
				this.pendingReads.set(conversationId, lastReadSeq);
			}
			return;
		}
		this.send("conversation.read", {
			conversation_id: conversationId,
			last_read_seq: lastReadSeq,
		});
	}

	sendTypingIndicator(conversationId: number) {
		this.sendTypingStart(conversationId);
	}

	sendTypingStart(conversationId: number) {
		this.send("typing.start", {
			conversation_id: conversationId,
		});
	}

	sendTypingStop(conversationId: number) {
		this.send("typing.stop", {
			conversation_id: conversationId,
		});
	}

	sendDelivered(conversationId: number, messageSeq: number) {
		this.send("message.delivered", {
			conversation_id: conversationId,
			message_seq: messageSeq,
		});
	}

	sendPresenceHeartbeat() {
		this.send("presence.heartbeat", {});
	}

	sendCall(type: string, payload: unknown) {
		this.send(type, payload);
	}

	private send(type: string, payload: unknown) {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			console.warn("[WebSocket] WebSocket not connected, cannot send:", type);
			return;
		}

		const message: WebSocketMessage = { type, payload };
		this.ws.send(JSON.stringify(message));
	}

	setHandlers(handlers: Partial<WebSocketHandlers>) {
		this.handlers = { ...this.handlers, ...handlers };
	}

	addHandlers(handlers: Partial<WebSocketHandlers>) {
		this.subscribers.add(handlers);
	}

	removeHandlers(handlers: Partial<WebSocketHandlers>) {
		this.subscribers.delete(handlers);
	}

	isConnected(): boolean {
		return this.ws?.readyState === WebSocket.OPEN;
	}

	disconnect() {
		if (this.messageBatchTimer) {
			clearTimeout(this.messageBatchTimer);
			this.messageBatchTimer = null;
		}
		this.messageBatchBuffer.length = 0;

		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}

		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}

		this.subscribers.clear();
	}
}
