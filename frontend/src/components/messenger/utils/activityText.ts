import type { Message } from "@/types/messenger";
import {
	formatCallDuration,
	getCallStatusLabel,
	getCallTitle,
	parseCallMeta,
} from "./callMessage";

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

export function getActivityText(message: Message): string {
	if (!message.activity_type) return "";
	if (message.activity_type.startsWith("call_")) {
		const meta = parseCallMeta(message.activity_metadata || message.content);
		const icon = meta?.call_type === "audio" ? "📞" : "📹";
		const base = ACTIVITY_LABELS[message.activity_type] ?? getCallTitle("", meta?.call_type);
		const duration =
			message.activity_type === "call_ended" && meta?.duration_seconds
				? ` · ${formatCallDuration(meta.duration_seconds)}`
				: "";
		const status =
			!ACTIVITY_LABELS[message.activity_type] && meta
				? ` · ${getCallStatusLabel(meta.status, meta.duration_seconds)}`
				: "";
		return `${icon} ${base}${duration}${status}`;
	}
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
