import type { Message } from "@/types/messenger";

const ACTIVITY_LABELS: Record<string, string> = {
	left_group: "Rời nhóm",
	member_removed: "Thành viên bị xóa",
	member_added: "Thành viên mới được thêm",
	group_avatar_changed: "Đổi ảnh đại diện nhóm",
	theme_changed: "Đổi nền trò chuyện",
	nickname_changed: "Thay đổi biệt danh",
};

export function getActivityText(message: Message): string {
	if (!message.activity_type) return "";
	if (message.content?.trim()) return message.content;

	if (message.activity_metadata) {
		try {
			const parsed = JSON.parse(message.activity_metadata);
			if (typeof parsed === "string") return parsed;
			if (parsed && typeof parsed === "object") {
				if (parsed.nickname) return String(parsed.nickname);
				if (parsed.user_id) return `Người dùng ${parsed.user_id}`;
				return JSON.stringify(parsed);
			}
		} catch {
			return message.activity_metadata;
		}
	}

	return (
		ACTIVITY_LABELS[message.activity_type] ||
		message.activity_type ||
		"Hoạt động"
	);
}
