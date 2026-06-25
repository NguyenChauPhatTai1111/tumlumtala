import { Box, Typography } from "@mui/material";
import type { Conversation } from "@/types/messenger";
import {
	getConversationTitle,
	getLastMessagePreviewContent,
	getLastSenderName,
} from "./utils";

export function ConversationTooltip({
	conversation,
	currentUserId,
}: {
	conversation: Conversation;
	currentUserId?: number | string;
}) {
	const title = getConversationTitle(conversation, currentUserId);
	const senderName = getLastSenderName(conversation, currentUserId);
	const lastContent = getLastMessagePreviewContent(conversation);
	const previewText =
		conversation.is_group && lastContent !== "Chưa có tin nhắn"
			? `${senderName}: ${lastContent}`
			: lastContent;

	return (
		<Box sx={{ maxWidth: 280 }}>
			<Typography sx={{ fontWeight: 800, fontSize: 14 }} noWrap>
				{title}
			</Typography>
			<Typography sx={{ color: "rgba(255,255,255,0.76)", fontSize: 13 }} noWrap>
				{previewText}
			</Typography>
		</Box>
	);
}
