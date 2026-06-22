import {
	getDisplayFilename,
	getFileExtFromContent,
	getFileIconConfig,
} from "@components/messenger/dialogs/FilePreviewModal";
import { formatFileSize } from "@components/messenger/utils/format";
import CloseIcon from "@mui/icons-material/Close";
import { Box, IconButton, Typography } from "@mui/material";
import type { Message } from "@/types/messenger";
import { resolveCdnUrl } from "@/utils/urlUtils";

type ComposerReplyBannerProps = {
	editingMessage?: Message | null;
	replyMessage?: Message | null;
	replySenderName?: string;
	outgoingTextColor?: string;
	onCancelReply?: () => void;
	onCancelEdit?: () => void;
};

const ReplyMessagePreview = ({ message }: { message: Message }) => {
	const type = message.message_type ?? "";

	if (type === "image") {
		return (
			<Box
				component="img"
				src={resolveCdnUrl(message.content)}
				alt="Ảnh"
				sx={{
					width: 48,
					height: 48,
					objectFit: "cover",
					borderRadius: 1,
					flexShrink: 0,
					display: "block",
				}}
			/>
		);
	}

	if (type === "video") {
		return (
			<Box sx={{ position: "relative", width: 48, height: 48, flexShrink: 0 }}>
				<Box
					component="video"
					src={resolveCdnUrl(message.content)}
					preload="metadata"
					muted
					sx={{
						width: 48,
						height: 48,
						objectFit: "cover",
						borderRadius: 1,
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
						borderRadius: 1,
					}}
				>
					<Box
						sx={{
							width: 0,
							height: 0,
							borderStyle: "solid",
							borderWidth: "5px 0 5px 9px",
							borderColor: "transparent transparent transparent #fff",
							ml: "2px",
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
				src={resolveCdnUrl(message.content)}
				alt="Sticker"
				sx={{ width: 48, height: 48, objectFit: "contain", flexShrink: 0 }}
			/>
		);
	}

	if (type === "file") {
		const fileExt = getFileExtFromContent(
			message.content,
			message.metadata?.original_name,
		);
		const fileIconCfg = getFileIconConfig(fileExt);
		const displayName = getDisplayFilename(
			message.content,
			message.file,
			message.metadata?.original_name,
		);
		return (
			<Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
				<Box
					sx={{
						width: 36,
						height: 36,
						borderRadius: 1,
						bgcolor: fileIconCfg?.color ?? "#546e7a",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						flexShrink: 0,
					}}
				>
					{fileIconCfg?.icon}
				</Box>
				<Box sx={{ minWidth: 0 }}>
					<Typography
						variant="caption"
						noWrap
						sx={{ display: "block", fontWeight: 500, color: "text.primary" }}
					>
						{displayName || "Tệp đính kèm"}
					</Typography>
					<Typography
						variant="caption"
						sx={{ opacity: 0.55, fontSize: "0.68rem" }}
					>
						{fileIconCfg?.label ??
							(fileExt ? fileExt.slice(1).toUpperCase() : "Tệp")}
						{message.metadata?.size
							? ` - ${formatFileSize(message.metadata.size)}`
							: ""}
					</Typography>
				</Box>
			</Box>
		);
	}

	// text / emoji / default
	return (
		<Typography
			variant="body2"
			sx={{
				overflow: "hidden",
				textOverflow: "ellipsis",
				whiteSpace: "nowrap",
				color: "text.secondary",
			}}
		>
			{message.content}
		</Typography>
	);
};

export const ComposerReplyBanner = ({
	editingMessage,
	replyMessage,
	outgoingTextColor,
	replySenderName,
	onCancelReply,
	onCancelEdit,
}: ComposerReplyBannerProps) => {
	if (editingMessage) {
		return (
			<Box
				sx={{
					width: "100%",
					mb: 1,
					px: 1.25,
					py: 0.85,
					borderLeft: "3px solid",
					borderColor: "warning.main",
					bgcolor: "action.selected",
					borderRadius: 1,
					display: "flex",
					alignItems: "flex-start",
					justifyContent: "space-between",
					gap: 1,
				}}
			>
				<Box sx={{ minWidth: 0 }}>
					<Typography
						variant="caption"
						color="warning.dark"
						sx={{ fontWeight: 700 }}
					>
						Chỉnh sửa
					</Typography>

					<Typography
						variant="body2"
						sx={{
							mt: 0.25,
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
							maxWidth: "100%",
							color: "text.secondary",
						}}
					>
						{editingMessage.content}
					</Typography>
				</Box>

				<IconButton size="small" onClick={() => onCancelEdit?.()}>
					<CloseIcon fontSize="small" />
				</IconButton>
			</Box>
		);
	}

	if (replyMessage) {
		const isMedia = ["image", "video", "sticker"].includes(
			replyMessage.message_type ?? "",
		);

		return (
			<Box
				sx={(theme) => ({
					width: "100%",
					mb: 1,
					px: 1.25,
					py: 0.75,
					borderLeft: "3px solid",
					borderColor: outgoingTextColor || theme.palette.primary.main,
					bgcolor: "action.selected",
					borderRadius: 1,
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 1,
				})}
			>
				<Box
					sx={{
						display: "flex",
						alignItems: "center",
						gap: 1.25,
						minWidth: 0,
						flex: 1,
					}}
				>
					{/* Thumbnail bên trái với image/video/sticker */}
					{isMedia && <ReplyMessagePreview message={replyMessage} />}

					<Box sx={{ minWidth: 0, flex: 1 }}>
						<Typography
							variant="caption"
							sx={(theme) => ({
								color: outgoingTextColor || theme.palette.primary.main,
								fontWeight: 700,
								display: "block",
							})}
						>
							Trả lời {replySenderName ? `• ${replySenderName}` : ""}
						</Typography>

						{/* File và text render inline bên dưới label */}
						{!isMedia && (
							<Box sx={{ mt: 0.25 }}>
								<ReplyMessagePreview message={replyMessage} />
							</Box>
						)}
					</Box>
				</Box>

				<IconButton size="small" onClick={onCancelReply}>
					<CloseIcon fontSize="small" />
				</IconButton>
			</Box>
		);
	}

	return null;
};
