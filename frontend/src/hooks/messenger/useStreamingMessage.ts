import { chatKeys } from "@hooks/keys/chatKeys";
import { API_PREFIX } from "@services/apiService";
import { parseMessageContent } from "@services/chatService";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { Message, SendMessageRequest } from "@/types/chat";

const CHAT_PREFIX = `${API_PREFIX}/chat`;

type InfiniteMessagesCache = {
	pageParams: unknown[];
	pages: Array<{
		items: Message[];
		total: number;
		limit: number;
		offset: number;
		hasMore: boolean;
	}>;
};

const makeAssistantStreamingMessage = (conversationId: string): Message => ({
	id: `streaming-${Date.now()}`,
	conversation_id: conversationId,
	role: "assistant",
	content: "",
	format: "markdown",
	created_at: new Date().toISOString(),
	streaming: true,
});

export const useStreamingMessage = () => {
	const queryClient = useQueryClient();

	const streamMessage = useCallback(
		async (
			payload: SendMessageRequest,
			onProgress?: (content: string) => void,
		) => {
			const conversationKey = String(payload.conversation_id);

			// First, add user message to cache
			const previousCache = queryClient.getQueryData<InfiniteMessagesCache>(
				chatKeys.messages(conversationKey),
			);

			const userMessage: Message = {
				id: `user-${Date.now()}`,
				conversation_id: conversationKey,
				role: "user",
				content: payload.message,
				format: "text",
				created_at: new Date().toISOString(),
			};

			const assistantMessage = makeAssistantStreamingMessage(conversationKey);

			// Update cache with user and streaming assistant message
			if (!previousCache) {
				queryClient.setQueryData<InfiniteMessagesCache>(
					chatKeys.messages(conversationKey),
					{
						pageParams: [0],
						pages: [
							{
								items: [userMessage, assistantMessage],
								total: 2,
								limit: 20,
								offset: 0,
								hasMore: false,
							},
						],
					},
				);
			} else {
				queryClient.setQueryData<InfiniteMessagesCache>(
					chatKeys.messages(conversationKey),
					{
						...previousCache,
						pages: previousCache.pages.map((page, index) => {
							if (index !== previousCache.pages.length - 1) return page;
							return {
								...page,
								items: [...page.items, userMessage, assistantMessage],
								total: page.total + 2,
							};
						}),
					},
				);
			}

			// Get auth token
			const token = localStorage.getItem("access_token") || "";

			// Open EventSource for streaming
			return new Promise<Message>((resolve, reject) => {
				let fullContent = "";
				let finalMessage: Message | null = null;

				// POST data as query params or use fetch with EventSource
				// EventSource only supports GET, so we use fetch with streaming
				const controller = new AbortController();

				fetch(`${CHAT_PREFIX}/messages`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify(payload),
					signal: controller.signal,
				})
					.then((response) => {
						if (!response.ok) {
							throw new Error(`HTTP ${response.status}`);
						}

						const contentType = response.headers.get("content-type") ?? "";
						if (contentType.includes("application/json")) {
							response
								.json()
								.then((raw: unknown) => {
									const root =
										raw && typeof raw === "object"
											? (raw as Record<string, unknown>)
											: {};
									const data =
										root.data && typeof root.data === "object"
											? (root.data as Record<string, unknown>)
											: root;

									const rawAssistantContent =
										data.assistant_response ?? data.assistant_message;
									const parsedAssistant = parseMessageContent(
										typeof rawAssistantContent === "string"
											? {
													raw: rawAssistantContent,
													format: data.format,
												}
											: rawAssistantContent,
									);

									const suggestionSource =
										data.suggestion_words ?? data.suggestions ?? data.words;
									const suggestionWords = Array.isArray(suggestionSource)
										? suggestionSource
												.map((item: unknown) =>
													typeof item === "string"
														? item.trim()
														: String(item ?? "").trim(),
												)
												.filter(Boolean)
										: [];

									const formattedAssistantText =
										suggestionWords.length > 0
											? `${parsedAssistant.content.trim()}\n\nGợi ý từ:\n${suggestionWords
													.map((word: string) => `- ${word}`)
													.join("\n")}`
											: parsedAssistant.content;

									const finalAssistant: Message = {
										...assistantMessage,
										id:
											typeof data.assistant_message_id === "number"
												? String(data.assistant_message_id)
												: assistantMessage.id,
										content: formattedAssistantText,
										format: parsedAssistant.format,
										streaming: false,
									};

									queryClient.setQueryData<InfiniteMessagesCache>(
										chatKeys.messages(conversationKey),
										(current) => {
											if (!current) return current;

											return {
												...current,
												pages: current.pages.map((page, pageIndex) => {
													if (pageIndex !== current.pages.length - 1) {
														return page;
													}

													return {
														...page,
														items: page.items.map((item) => {
															if (
																item.id === assistantMessage.id &&
																finalAssistant
															) {
																return finalAssistant;
															}
															return item;
														}),
													};
												}),
											};
										},
									);

									resolve(finalAssistant);
								})
								.catch(reject);
							return;
						}

						const reader = response.body?.getReader();
						if (!reader) throw new Error("No response body");

						const decoder = new TextDecoder();
						let buffer = "";

						const processChunk = () => {
							reader.read().then(({ done, value }) => {
								if (done) {
									// Stream complete
									finalMessage = {
										...assistantMessage,
										content: fullContent,
										streaming: false,
									};

									// Update cache with complete message
									queryClient.setQueryData<InfiniteMessagesCache>(
										chatKeys.messages(conversationKey),
										(current) => {
											if (!current) return current;

											return {
												...current,
												pages: current.pages.map((page, pageIndex) => {
													if (pageIndex !== current.pages.length - 1) {
														return page;
													}

													return {
														...page,
														items: page.items.map((item) => {
															if (
																item.id === assistantMessage.id &&
																finalMessage
															) {
																return finalMessage;
															}
															return item;
														}),
													};
												}),
											};
										},
									);

									resolve(finalMessage);
									return;
								}

								// Process chunk
								const chunk = decoder.decode(value, {
									stream: true,
								});
								buffer += chunk;

								// Process complete lines
								const lines = buffer.split("\n");
								buffer = lines.pop() || "";

								for (const line of lines) {
									if (!line.trim()) continue;

									// Parse SSE format: data: {...}
									if (line.startsWith("data: ")) {
										try {
											const jsonStr = line.slice(6);
											const data = JSON.parse(jsonStr) as {
												type?: string;
												content?: string;
											};

											if (data.type === "chunk" && data.content) {
												fullContent += data.content;
												onProgress?.(fullContent);

												// Update streaming message in cache
												queryClient.setQueryData<InfiniteMessagesCache>(
													chatKeys.messages(conversationKey),
													(current) => {
														if (!current) return current;

														return {
															...current,
															pages: current.pages.map((page, pageIndex) => {
																if (pageIndex !== current.pages.length - 1)
																	return page;

																return {
																	...page,
																	items: page.items.map((item) => {
																		if (item.id === assistantMessage.id) {
																			return {
																				...item,
																				content: fullContent,
																			};
																		}
																		return item;
																	}),
																};
															}),
														};
													},
												);
											}
										} catch (e) {
											console.error("Error parsing SSE chunk:", e);
										}
									}
								}

								processChunk();
							});
						};

						processChunk();
					})
					.catch((error) => {
						if (error.name === "AbortError") {
							// User aborted
							return;
						}

						// Update message as failed
						const failedMessage: Message = {
							...assistantMessage,
							content: fullContent || "Lỗi kết nối. Vui lòng thử lại.",
							streaming: false,
							failed: true,
						};

						queryClient.setQueryData<InfiniteMessagesCache>(
							chatKeys.messages(conversationKey),
							(current) => {
								if (!current) return current;

								return {
									...current,
									pages: current.pages.map((page, pageIndex) => {
										if (pageIndex !== current.pages.length - 1) return page;

										return {
											...page,
											items: page.items.map((item) => {
												if (item.id === assistantMessage.id) {
													return failedMessage;
												}
												return item;
											}),
										};
									}),
								};
							},
						);

						reject(error);
					});
			});
		},
		[queryClient],
	);

	return {
		streamMessage,
	};
};
