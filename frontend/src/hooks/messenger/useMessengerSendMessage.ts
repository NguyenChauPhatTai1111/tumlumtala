type OpenNotificationParams = {
	type?: "success" | "error" | "progress";
	message?: string;
	description?: string;
};
import { uploadMessageAttachment } from "@services/messengerService";
import type { UseMutationResult } from "@tanstack/react-query";
import emojiRegex from "emoji-regex";
import { useCallback } from "react";
import type {
	Message,
	SendMessagePayloadItem,
	SendMessageRequest,
	SendMessageResponse,
} from "@/types/messenger";

const regex = emojiRegex();

const isEmojiContent = (value: string) => {
	const trimmed = value.trim();

	if (!trimmed) {
		return false;
	}

	const matches = trimmed.match(regex);

	return matches?.join("") === trimmed;
};

const MAX_FILE_SIZE_MB = 100;

type MessageActions = {
	updateMessage: Pick<
		UseMutationResult<
			Message,
			Error,
			{ messageId: number; content: string },
			unknown
		>,
		"mutateAsync"
	>;
};

type Params = {
	selectedConversationId: number | null;
	currentUserId: number | string | undefined;
	replyingMessage: Message | null;
	editingMessage: Message | null;
	sendMessageMutation: Pick<
		UseMutationResult<SendMessageResponse, Error, SendMessageRequest, unknown>,
		"mutateAsync"
	>;
	messageActions: MessageActions;
	pendingEmptyConversationId?: number | null;
	setPendingMessages: (updater: (prev: Message[]) => Message[]) => void;
	setEditingMessage: (m: Message | null) => void;
	setReplyingMessage: (m: Message | null) => void;
	setPendingEmptyConversationId: (v: number | null) => void;
	onMessageSent?: () => void;
	open?: (opts: OpenNotificationParams) => void;
};

export const useMessengerSendMessage = ({
	selectedConversationId,
	currentUserId,
	replyingMessage,
	editingMessage,
	sendMessageMutation,
	messageActions,
	pendingEmptyConversationId,
	setPendingMessages,
	setEditingMessage,
	setReplyingMessage,
	setPendingEmptyConversationId,
	onMessageSent,
	open,
}: Params) => {
	const sendMessage = useCallback(
		async (
			text: string | SendMessagePayloadItem[],
			type?: string,
			itemId?: number,
			options?: {
				tempId?: string;
				skipOptimistic?: boolean;
			},
		) => {
			if (editingMessage) {
				const trimmed = String(text).trim();
				if (!trimmed) {
					open?.({
						type: "error",
						message: "Nội dung tin nhắn không được để trống",
					});
					return false;
				}

				try {
					await messageActions.updateMessage.mutateAsync({
						messageId: editingMessage.id,
						content: trimmed,
					});
					setPendingMessages((prev) =>
						prev.map((item) =>
							item.id === editingMessage.id
								? { ...item, content: trimmed }
								: item,
						),
					);
					setEditingMessage(null);
					open?.({ type: "success", message: "Đã cập nhật tin nhắn" });
					return true;
				} catch {
					open?.({ type: "error", message: "Không thể cập nhật tin nhắn" });
					return false;
				}
			}

			let tempId = "";
			try {
				if (!selectedConversationId) {
					open?.({
						type: "error",
						message: "Vui lòng chọn hoặc tạo cuộc trò chuyện",
					});
					return false;
				}

				tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
				const payload = Array.isArray(text) ? text : undefined;
				const trimmed = payload
					? String(payload[0]?.content ?? "").trim()
					: String(text ?? "").trim();
				const messageType =
					payload?.[0]?.type ||
					type ||
					(isEmojiContent(trimmed) ? "emoji" : "text");

				const optimisticMessage: Message = {
					id: 0,
					temp_id: tempId,
					conversation_id: selectedConversationId,
					sender_id: String(currentUserId ?? ""),
					receiver_id: "",
					content: payload ? String(payload[0]?.content ?? "") : String(text),
					message_type: messageType,
					is_read: false,
					created_at: new Date().toISOString(),
					pending: true,
					status: "sending",
					reply_to_message_id:
						replyingMessage && Number.isFinite(Number(replyingMessage.id))
							? Number(replyingMessage.id)
							: undefined,
					file: payload?.[0]?.file,
					metadata: payload?.[0]?.metadata,
				};

				if (!options?.skipOptimistic) {
					setPendingMessages((prev) => [...prev, optimisticMessage]);
				}

				const requestPayload: SendMessageRequest = {
					conversation_id: selectedConversationId,
					content: payload ? String(payload[0]?.content ?? "") : String(text),
					message_type: messageType,
					item_id: payload ? payload[0]?.item_id : itemId,
					messages: payload,
					temp_id: tempId,
					reply_to_message_id:
						replyingMessage && Number.isFinite(Number(replyingMessage.id))
							? Number(replyingMessage.id)
							: undefined,
				};
				const uploadAndSend = async () => {
					try {
						let finalPayload = requestPayload;

						if (payload?.[0]?.file) {
							const file = payload[0].file;

							// Kiểm tra dung lượng file trước khi upload (Fix lỗi 413 từ client)
							if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
								open?.({
									type: "error",
									message: `File quá lớn. Dung lượng tối đa cho phép là ${MAX_FILE_SIZE_MB}MB`,
								});
								throw new Error("File too large");
							}

							const uploadRes = await uploadMessageAttachment(
								selectedConversationId,
								file,
							);
							const uploadedPath = uploadRes; // uploadMessageAttachment now returns string directly

							// Cập nhật ngay content là path đã upload để nếu lỗi mutation thì gửi lại vẫn có path đúng
							setPendingMessages((prev) =>
								prev.map((item) =>
									item.temp_id === tempId
										? { ...item, content: uploadedPath }
										: item,
								),
							);
							finalPayload = {
								conversation_id: selectedConversationId,
								content: uploadedPath,
								message_type: payload[0].type,
								item_id: payload[0].item_id,
								metadata: payload[0].metadata,
								messages: [
									{
										type: payload[0].type,
										content: uploadedPath,
										item_id: payload[0].item_id,
										metadata: payload[0].metadata,
									},
								],
								temp_id: tempId,
								reply_to_message_id:
									replyingMessage && Number.isFinite(Number(replyingMessage.id))
										? Number(replyingMessage.id)
										: undefined,
							};
						}

						const response =
							await sendMessageMutation.mutateAsync(finalPayload);
						if (tempId) {
							setPendingMessages((prev) =>
								prev.map((item) =>
									item.temp_id === tempId
										? {
												...item,
												...response.message,
												id: response.message.id || item.id,
												message_seq:
													response.message.message_seq ||
													response.message.seq ||
													item.message_seq,
												created_at:
													response.message.created_at || item.created_at,
												metadata: response.message.metadata ?? item.metadata,
												temp_id: item.temp_id,
												status: "sent",
												pending: false,
												failed: false,
											}
										: item,
								),
							);
						}

						if (payload?.[0]?.file) {
							const preview = String(payload[0]?.content ?? "");
							if (preview.startsWith("blob:")) {
								URL.revokeObjectURL(preview);
							}
						}

						if (pendingEmptyConversationId === selectedConversationId) {
							setPendingEmptyConversationId(null);
						}

						if (replyingMessage) {
							setReplyingMessage(null);
						}
					} catch (error) {
						console.error("Send message error:", error);
						if (tempId) {
							setPendingMessages((prev) =>
								prev.map((item) =>
									item.temp_id === tempId
										? { ...item, pending: false, failed: true }
										: item,
								),
							);
						}
						open?.({
							type: "error",
							message: "Lỗi khi gửi tin nhắn. Vui lòng thử lại.",
						});
					}
				};

				await uploadAndSend();

				onMessageSent?.();
				return true;
			} catch (error) {
				console.error("Send message error:", error);
				if (tempId) {
					setPendingMessages((prev) =>
						prev.map((item) =>
							item.temp_id === tempId
								? { ...item, pending: false, failed: true }
								: item,
						),
					);
				}
				open?.({
					type: "error",
					message: "Lỗi khi gửi tin nhắn. Vui lòng thử lại.",
				});
				return false;
			}
		},
		[
			editingMessage,
			messageActions,
			selectedConversationId,
			currentUserId,
			replyingMessage,
			sendMessageMutation,
			setPendingMessages,
			pendingEmptyConversationId,
			setPendingEmptyConversationId,
			setReplyingMessage,
			setEditingMessage,
			open,
			onMessageSent,
		],
	);

	const retryMessage = useCallback(
		async (message: Message & { file?: File }) => {
			const isMatch = (item: Message) =>
				(message.id > 0 && item.id === message.id) ||
				(message.temp_id && item.temp_id === message.temp_id);

			try {
				if (!selectedConversationId) {
					open?.({ type: "error", message: "Vui lòng chọn cuộc trò chuyện" });
					return;
				}

				setPendingMessages((prev) =>
					prev.map((item) =>
						isMatch(item)
							? { ...item, pending: true, failed: false, status: "sending" }
							: item,
					),
				);

				const trimmed = String(message.content ?? "").trim();
				const messageType =
					message.message_type || (isEmojiContent(trimmed) ? "emoji" : "text");
				let contentToRetry = message.content;
				const itemIdToRetry = message.id; // Sử dụng id hoặc trường itemId nếu có trong type

				// Re-upload if the file was never successfully uploaded:
				// - image/video: content is still a blob URL
				// - file: content is still the original filename (not an http URL)
				const needsReUpload =
					messageType === "image" || messageType === "video"
						? String(contentToRetry).startsWith("blob:")
						: messageType === "file" &&
							!String(contentToRetry).startsWith("http");

				if (needsReUpload) {
					if (message.file) {
						try {
							const uploadedPath = await uploadMessageAttachment(
								selectedConversationId,
								message.file,
							);
							contentToRetry = uploadedPath;

							setPendingMessages((prev) =>
								prev.map((item) =>
									isMatch(item) ? { ...item, content: uploadedPath } : item,
								),
							);
						} catch (_err) {
							throw new Error("Không thể tải lên tệp khi gửi lại.");
						}
					} else {
						throw new Error(
							"Không tìm thấy tệp gốc. Vui lòng gửi lại tin nhắn mới.",
						);
					}
				}

				const isAttachment =
					messageType === "image" ||
					messageType === "video" ||
					messageType === "file";

				const retryPayload: SendMessageRequest = {
					conversation_id: selectedConversationId,
					content: contentToRetry,
					message_type: messageType,
					item_id: Number(itemIdToRetry),
					temp_id: message.temp_id,
					reply_to_message_id: message.reply_to_message_id,
					metadata: message.metadata,
					messages: isAttachment
						? [
								{
									type: messageType,
									content: contentToRetry,
									item_id: itemIdToRetry,
									metadata: message.metadata,
								},
							]
						: undefined,
				};

				const response = await sendMessageMutation.mutateAsync(retryPayload);

				setPendingMessages((prev) =>
					prev.map((item) =>
						isMatch(item)
							? {
									...item,
									...response.message,
									id: response.message.id || item.id,
									message_seq:
										response.message.message_seq ||
										response.message.seq ||
										item.message_seq,
									metadata: response.message.metadata ?? item.metadata,
									temp_id: item.temp_id,
									status: "sent",
									pending: false,
								}
							: item,
					),
				);
				open?.({ type: "success", message: "Đã gửi lại tin nhắn" });
			} catch (error) {
				console.error("Retry message error:", error);
				setPendingMessages((prev) =>
					prev.map((item) =>
						isMatch(item)
							? { ...item, pending: false, failed: true, status: undefined }
							: item,
					),
				);
				open?.({
					type: "error",
					message: "Không thể gửi lại tin nhắn. Vui lòng thử lại.",
				});
			}
		},
		[selectedConversationId, sendMessageMutation, setPendingMessages, open],
	);

	return { sendMessage, retryMessage } as const;
};

export default useMessengerSendMessage;
