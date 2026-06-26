import type { Message } from "@/types/messenger";

const ACTIVITY_LABELS: Record<string, string> = {
	left_group: "Rời nhóm",
	member_removed: "Thành viên bị xóa",
	member_added: "Thành viên mới được thêm",
	group_avatar_changed: "Đổi ảnh đại diện nhóm",
	theme_changed: "Đổi nền trò chuyện",
	nickname_changed: "Thay đổi biệt danh",
	call_ended: "Cuộc gọi đã kết thúc",
	call_missed: "Cuộc gọi nhỡ",
	call_rejected: "Cuộc gọi bị từ chối",
	call_cancelled: "Cuộc gọi bị hủy",
};

function formatCallDuration(seconds: number): string {
	if (seconds <= 0) return "";
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `0:${String(s).padStart(2, "0")}`;
}

export function getActivityText(message: Message): string {
	if (!message.activity_type) return "";
	if (message.content?.trim()) return message.content;

	if (message.activity_type.startsWith("call_") && message.activity_metadata) {
		try {
			const meta = JSON.parse(message.activity_metadata) as {
				call_type?: string;
				duration_seconds?: number;
			};
			const icon = meta.call_type === "audio" ? "📞" : "📹";
			const base = ACTIVITY_LABELS[message.activity_type] ?? message.activity_type;
			const duration = message.activity_type === "call_ended" && meta.duration_seconds
				? ` · ${formatCallDuration(meta.duration_seconds)}`
				: "";
			return `${icon} ${base}${duration}`;
		} catch {
			// fall through
		}
	}

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
