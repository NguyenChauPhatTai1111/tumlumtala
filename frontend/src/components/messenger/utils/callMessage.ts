import type { Conversation, Message } from "@/types/messenger";

type CallMeta = {
	call_type?: string;
	duration_seconds?: number;
	caller_id?: number;
	status?: string;
};

export function isCallMessageType(messageType?: string) {
	const type = String(messageType ?? "").toLowerCase();
	return type === "video_call" || type === "audio_call";
}

export function parseCallMeta(content?: string): CallMeta | null {
	const raw = String(content ?? "").trim();
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as CallMeta;
		if (!parsed || typeof parsed !== "object") return null;
		return parsed;
	} catch {
		return null;
	}
}

export function formatCallDuration(seconds?: number): string {
	const total = Number(seconds ?? 0);
	if (!Number.isFinite(total) || total <= 0) return "";
	const m = Math.floor(total / 60);
	const s = total % 60;
	return m > 0
		? `${m}:${String(s).padStart(2, "0")}`
		: `0:${String(s).padStart(2, "0")}`;
}

export function getCallTitle(messageType?: string, callType?: string) {
	const type = String(callType ?? "").toLowerCase();
	if (type === "audio" || String(messageType ?? "").toLowerCase() === "audio_call") {
		return "Cuộc gọi thoại";
	}
	return "Cuộc gọi video";
}

export function getCallStatusLabel(status?: string, durationSeconds?: number) {
	const duration = formatCallDuration(durationSeconds);
	if (duration) return duration;

	switch (String(status ?? "").toLowerCase()) {
		case "rejected":
			return "Đã từ chối";
		case "cancelled":
			return "Đã hủy";
		case "missed":
			return "Cuộc gọi nhỡ";
		case "failed":
			return "Cuộc gọi lỗi";
		case "ended":
			return "Đã kết thúc";
		default:
			return "Cuộc gọi nhỡ";
	}
}

export function getCallMessagePreview(messageType?: string, content?: string) {
	if (!isCallMessageType(messageType)) return "";
	const meta = parseCallMeta(content);
	const title = getCallTitle(messageType, meta?.call_type);
	const status = getCallStatusLabel(meta?.status, meta?.duration_seconds);
	return status ? `${title} · ${status}` : title;
}

export function getConversationCallPreview(conversation: Conversation) {
	return getCallMessagePreview(
		conversation.last_message_type,
		conversation.last_message_content,
	);
}

export function getMessageCallPreview(message: Message) {
	return getCallMessagePreview(message.message_type, message.content);
}
