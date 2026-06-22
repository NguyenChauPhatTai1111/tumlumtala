import type { Message } from "@/types/messenger";

/**
 * Lấy key định danh duy nhất cho tin nhắn để tối ưu hóa render trong React.
 *
 * CHIẾN THUẬT:
 * 1. Sử dụng temp_id làm ưu tiên hàng đầu. temp_id được sinh ra ở client ngay khi nhấn gửi.
 * 2. Khi tin nhắn chuyển trạng thái từ 'sending' sang 'sent', chúng ta giữ nguyên temp_id trong state.
 * 3. Việc giữ key cố định giúp React không unmount/remount component, loại bỏ hiện tượng "nháy".
 */
export const getMessageKey = (message: Message): string => {
	return message.temp_id || `msg_id_${message.id}`;
};

/**
 * Merge danh sách tin nhắn từ Server và tin nhắn Pending (đang gửi/lỗi) tại local.
 * Hàm này giải quyết vấn đề trùng lặp (Duplicate) tin nhắn trên giao diện.
 */
export const mergeMessengerMessages = (
	serverMessages: Message[],
	pendingMessages: Message[],
): Message[] => {
	if (!pendingMessages.length) return serverMessages;

	// Tạo tập hợp các ID và TempID đã tồn tại trên Server để lọc bỏ tin nhắn trùng trong hàng chờ
	const existingIds = new Set<number>();
	const existingTempIds = new Set<string>();

	for (const msg of serverMessages) {
		if (msg.id > 0) existingIds.add(msg.id);
		if (msg.temp_id) existingTempIds.add(msg.temp_id);
	}

	// Lọc: Chỉ giữ lại những tin nhắn pending thực sự chưa có trong kết quả trả về từ server
	const uniquePending = pendingMessages.filter((p) => {
		const isDupById = p.id > 0 && existingIds.has(p.id);
		const isDupByTempId = !!p.temp_id && existingTempIds.has(p.temp_id);
		return !isDupById && !isDupByTempId;
	});

	return [...serverMessages, ...uniquePending];
};
