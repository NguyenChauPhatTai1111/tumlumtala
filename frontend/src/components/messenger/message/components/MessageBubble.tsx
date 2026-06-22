import {
	getDisplayFilename,
	getFileExtFromContent,
	getFileIconConfig,
} from "@components/messenger/dialogs/FilePreviewModal";
import type { MessageBubbleProps } from "@components/messenger/types/messages";
import { getReadableTextColor } from "@components/messenger/utils/color";
import { isMessageEdited } from "@components/messenger/utils/message";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import ReplyRoundedIcon from "@mui/icons-material/ReplyRounded";
import {
	Box,
	IconButton,
	Menu,
	MenuItem,
	Stack,
	Tooltip,
	Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import type { Message } from "@/types/messenger";
import { resolveCdnUrl } from "@/utils/urlUtils";

const BubbleReplyThumbnail = ({ replyMessage }: { replyMessage: Message }) => {
	const type = replyMessage.message_type ?? "";

	if (type === "image") {
		return (
			<Box
				component="img"
				src={resolveCdnUrl(replyMessage.content)}
				alt="Ảnh"
				sx={{
					width: 40,
					height: 40,
					objectFit: "cover",
					borderRadius: 0.75,
					flexShrink: 0,
				}}
			/>
		);
	}

	if (type === "video") {
		return (
			<Box sx={{ position: "relative", width: 40, height: 40, flexShrink: 0 }}>
				<Box
					component="video"
					src={resolveCdnUrl(replyMessage.content)}
					preload="metadata"
					muted
					sx={{
						width: 40,
						height: 40,
						objectFit: "cover",
						borderRadius: 0.75,
						display: "block",
					}}
				/>
				<Box
					sx={{
						position: "absolute",
						inset: 0,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						bgcolor: "rgba(0,0,0,0.35)",
						borderRadius: 0.75,
					}}
				>
					<Box
						sx={{
							width: 0,
							height: 0,
							borderStyle: "solid",
							borderWidth: "4px 0 4px 7px",
							borderColor: "transparent transparent transparent #fff",
							ml: "1px",
						}}
					/>
				</Box>
			</Box>
		);
	}

	if (type === "sticker") {
		return (
			<Box
				component="img"
				src={resolveCdnUrl(replyMessage.content)}
				alt="Sticker"
				sx={{ width: 40, height: 40, objectFit: "contain", flexShrink: 0 }}
			/>
		);
	}

	return null;
};

const BubbleReplyText = ({
	replyMessage,
	outgoingTextColor,
	incomingTextColor,
	isCurrentUserSender,
}: {
	replyMessage: Message;
	isCurrentUserSender: boolean;
	outgoingTextColor?: string;
	incomingTextColor?: string;
}) => {
	const type = replyMessage.message_type ?? "";
	const color = isCurrentUserSender
		? (outgoingTextColor ?? "inherit")
		: (incomingTextColor ?? "text.primary");

	if (type === "image")
		return (
			<Typography variant="caption" sx={{ opacity: 0.8, color }}>
				Hình ảnh
			</Typography>
		);
	if (type === "video")
		return (
			<Typography variant="caption" sx={{ opacity: 0.8, color }}>
				Video
			</Typography>
		);
	if (type === "sticker")
		return (
			<Typography variant="caption" sx={{ opacity: 0.8, color }}>
				Sticker
			</Typography>
		);

	if (type === "file") {
		const fileExt = getFileExtFromContent(
			replyMessage.content,
			replyMessage.metadata?.original_name,
		);
		const fileIconCfg = getFileIconConfig(fileExt);
		const displayName = getDisplayFilename(
			replyMessage.content,
			replyMessage.file,
			replyMessage.metadata?.original_name,
		);
		return (
			<Box
				sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}
			>
				<Box
					sx={{
						width: 24,
						height: 24,
						borderRadius: 0.5,
						bgcolor: fileIconCfg?.color ?? "#546e7a",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						flexShrink: 0,
					}}
				>
					{fileIconCfg?.icon}
				</Box>
				<Typography variant="caption" noWrap sx={{ color, opacity: 0.85 }}>
					{displayName || "Tệp đính kèm"}
				</Typography>
			</Box>
		);
	}

	return (
		<Typography
			variant="caption"
			noWrap
			sx={{ color, opacity: 0.8, maxWidth: 180, display: "block" }}
		>
			{replyMessage.content}
		</Typography>
	);
};

export const MessageBubble = ({
	message,
	isCurrentUserSender,
	outgoingBubbleColor,
	incomingBubbleColor,
	outgoingTextColor,
	incomingTextColor,
	ambientTextColor,
	ambientBorderColor,
	isRowHovered,
	replyMessage,
	onDeleteMessage,
	onEditMessage,
	onToggleReaction,
	onReplyMessage,
	onJumpToMessage,
	onViewHistories,
}: MessageBubbleProps) => {
	const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
	const isOpen = Boolean(menuAnchor);
	const edited = isMessageEdited(message);
	const bubbleColor = isCurrentUserSender
		? (outgoingBubbleColor ?? "primary.main")
		: (incomingBubbleColor ?? "background.paper");
	const hasCustomBubbleBackground = Boolean(
		isCurrentUserSender
			? outgoingBubbleColor?.trim()
			: incomingBubbleColor?.trim(),
	);
	const bubbleTextColor = isCurrentUserSender
		? outgoingTextColor ||
			(hasCustomBubbleBackground
				? getReadableTextColor(bubbleColor)
				: "primary.contrastText")
		: incomingTextColor ||
			(hasCustomBubbleBackground
				? getReadableTextColor(bubbleColor)
				: (ambientTextColor ?? "text.primary"));

	const isCustomTheme = Boolean(outgoingBubbleColor || incomingBubbleColor);
	const actionHoverBg = isCurrentUserSender
		? outgoingBubbleColor
		: incomingBubbleColor;
	const actionHoverTextColor = isCustomTheme
		? getReadableTextColor(actionHoverBg)
		: undefined;
	const isEmojiTypeMessage =
		String(message.message_type ?? "")
			.trim()
			.toLowerCase() === "emoji";
	const isStickerTypeMessage =
		String(message.message_type ?? "")
			.trim()
			.toLowerCase() === "sticker";
	const canEditMessage =
		isCurrentUserSender && !isEmojiTypeMessage && !isStickerTypeMessage;

	const isStickerMessage = useMemo(() => {
		const content = String(message.content ?? "").trim();
		if (!content) {
			return false;
		}
		return (
			isStickerTypeMessage ||
			/^(?:data:[^,]+,|blob:|https?:\/\/|\/\/)/i.test(content)
		);
	}, [message.content, isStickerTypeMessage]);

	const closeMenu = () => setMenuAnchor(null);

	return (
		<Box
			sx={{
				position: "relative",
				display: "inline-flex",
				alignItems: "center",
				pb: message.my_reaction ? 1.25 : 0,
			}}
		>
			<Box
				sx={{
					maxWidth: { xs: "72vw", sm: 460, md: 560 },
					px: isStickerMessage ? 0 : 1.5,
					py: isStickerMessage ? 0 : 1,
					borderRadius: isStickerMessage ? 0 : 2,
					borderTopRightRadius: isStickerMessage
						? 0
						: isCurrentUserSender
							? 0.75
							: 2,
					borderTopLeftRadius: isStickerMessage
						? 0
						: isCurrentUserSender
							? 2
							: 0.75,
					bgcolor: isStickerMessage ? "transparent" : bubbleColor,
					color: bubbleTextColor,
					border: isStickerMessage
						? "none"
						: isCurrentUserSender
							? "none"
							: "1px solid",
					borderColor: ambientBorderColor ?? "divider",
					boxShadow: isStickerMessage ? "none" : "0 1px 2px rgba(0,0,0,0.08)",
					overflowWrap: "anywhere",
					opacity: message.pending ? 0.72 : 1,
				}}
			>
				{replyMessage ? (
					<Box
						onClick={() =>
							message.reply_to_message_id &&
							onJumpToMessage?.(Number(message.reply_to_message_id))
						}
						sx={{
							mb: 0.75,
							px: 1,
							py: 0.6,
							borderLeft: "3px solid",
							borderColor: "currentColor",
							opacity: 0.82,
							bgcolor: "rgba(255,255,255,0.12)",
							borderRadius: 0.75,
							cursor: message.reply_to_message_id ? "pointer" : "default",
							display: "flex",
							gap: 1,
							alignItems: "center",
							minWidth: 0,
						}}
					>
						<Box sx={{ flex: 1, minWidth: 0 }}>
							<BubbleReplyText
								replyMessage={replyMessage}
								isCurrentUserSender={isCurrentUserSender}
								outgoingTextColor={outgoingTextColor}
								incomingTextColor={incomingTextColor}
							/>
						</Box>
						<BubbleReplyThumbnail replyMessage={replyMessage} />
					</Box>
				) : null}

				{isStickerMessage ? (
					<Box
						component="img"
						src={message.content}
						alt="Sticker"
						sx={{
							display: "block",
							maxWidth: 200,
							maxHeight: 200,
							width: "auto",
							height: "auto",
							borderRadius: 2,
						}}
					/>
				) : (
					<Typography
						variant="body2"
						sx={{ whiteSpace: "pre-wrap", lineHeight: 1.45 }}
					>
						{message.content}
					</Typography>
				)}

				<Stack
					direction="row"
					spacing={0.75}
					alignItems="center"
					justifyContent="flex-end"
					sx={{ mt: 0.5, opacity: 0.78 }}
				>
					{edited ? (
						<Typography variant="caption" sx={{ fontSize: 11 }}>
							đã chỉnh sửa
						</Typography>
					) : null}
					<Typography variant="caption" sx={{ fontSize: 11 }}>
						{new Date(message.created_at).toLocaleTimeString("vi-VN", {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</Typography>
				</Stack>
			</Box>

			{message.my_reaction ? (
				<Box
					sx={{
						position: "absolute",
						right: isCurrentUserSender ? 6 : "auto",
						left: isCurrentUserSender ? "auto" : 6,
						bottom: 0,
						px: 0.65,
						height: 20,
						minWidth: 24,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						borderRadius: 999,
						bgcolor: "background.paper",
						border: "1px solid",
						borderColor: "divider",
						boxShadow: "0 1px 2px rgba(0,0,0,0.14)",
						fontSize: 13,
						lineHeight: 1,
					}}
				>
					{message.my_reaction}
				</Box>
			) : null}

			<Box
				sx={{
					position: "absolute",
					top: "50%",
					left: isCurrentUserSender ? -32 : "auto",
					right: isCurrentUserSender ? "auto" : -32,
					transform: "translateY(-50%)",
					opacity: isRowHovered || isOpen ? 1 : 0,
					transition: "opacity 60ms ease",
					pointerEvents: isRowHovered || isOpen ? "auto" : "none",
				}}
			>
				<Tooltip title="Tùy chọn">
					<IconButton
						size="small"
						onClick={(event) => setMenuAnchor(event.currentTarget)}
						sx={{
							width: 28,
							height: 28,
							bgcolor: "background.paper",
							color: actionHoverTextColor,
							border: "1px solid",
							borderColor: "divider",
							boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
							"&:hover": {
								bgcolor: isCustomTheme ? actionHoverBg : "action.hover",
							},
						}}
					>
						<MoreHorizRoundedIcon fontSize="small" />
					</IconButton>
				</Tooltip>
			</Box>

			<Menu anchorEl={menuAnchor} open={isOpen} onClose={closeMenu}>
				<MenuItem
					onClick={() => {
						onReplyMessage?.(message);
						closeMenu();
					}}
				>
					<ReplyRoundedIcon fontSize="small" sx={{ mr: 1 }} />
					Trả lời
				</MenuItem>
				<MenuItem
					onClick={() => {
						void onToggleReaction?.(message, "👍");
						closeMenu();
					}}
				>
					👍 Thích
				</MenuItem>
				{canEditMessage ? (
					<MenuItem
						onClick={() => {
							onEditMessage?.(message);
							closeMenu();
						}}
					>
						<EditRoundedIcon fontSize="small" sx={{ mr: 1 }} />
						Chỉnh sửa
					</MenuItem>
				) : null}
				{edited ? (
					<MenuItem
						onClick={() => {
							onViewHistories?.(message);
							closeMenu();
						}}
					>
						<HistoryRoundedIcon fontSize="small" sx={{ mr: 1 }} />
						Lịch sử sửa
					</MenuItem>
				) : null}
				{isCurrentUserSender ? (
					<MenuItem
						onClick={() => {
							onDeleteMessage?.(message.id);
							closeMenu();
						}}
						sx={{ color: "error.main" }}
					>
						<DeleteOutlineRoundedIcon fontSize="small" sx={{ mr: 1 }} />
						Xóa
					</MenuItem>
				) : null}
			</Menu>
		</Box>
	);
};
