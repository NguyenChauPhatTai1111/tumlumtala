import FilePreviewModal, {
	getDisplayFilename,
	getFileExtFromContent,
	getFileIconConfig,
} from "@components/messenger/dialogs/FilePreviewModal";
import ImageGalleryModal from "@components/messenger/dialogs/ImageGalleryModal";
import type { BubbleContentProps } from "@components/messenger/types/message-ui";
import { getActivityText } from "@components/messenger/utils/activityText";
import {
	getCallStatusLabel,
	getCallTitle,
	isCallMessageType,
	parseCallMeta,
} from "@components/messenger/utils/callMessage";
import {
	formatFileSize,
	formatVideoDuration,
} from "@components/messenger/utils/format";
import CallIcon from "@mui/icons-material/Call";
import DownloadIcon from "@mui/icons-material/Download";
import VideocamIcon from "@mui/icons-material/Videocam";
import { Box, Button, Chip, Typography } from "@mui/material";
import emojiRegex from "emoji-regex";
import Linkify from "linkify-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "@/types/messenger";
import { resolveCdnUrl } from "@/utils/urlUtils";

const emojiOnlyRegex = emojiRegex();

export type BubbleRadii = {
	borderTopLeftRadius: string;
	borderTopRightRadius: string;
	borderBottomRightRadius: string;
	borderBottomLeftRadius: string;
};

export const getBubbleBorderRadius = (
	isCurrentUserSender: boolean,
	isFirst: boolean,
	isLast: boolean,
	currentHasReaction = false,
	prevHasReaction = false,
): BubbleRadii => {
	const n = "18px";
	const s = "4px";
	if (isCurrentUserSender) {
		return {
			borderTopLeftRadius: n,
			borderTopRightRadius: isFirst || prevHasReaction ? n : s,
			borderBottomRightRadius: isLast || currentHasReaction ? n : s,
			borderBottomLeftRadius: n,
		};
	}
	return {
		borderTopLeftRadius: isFirst || prevHasReaction ? n : s,
		borderTopRightRadius: n,
		borderBottomRightRadius: n,
		borderBottomLeftRadius: isLast || currentHasReaction ? n : s,
	};
};

export function isFlagMsg(message: Message): {
	isFlagMessage: boolean;
	flagCode: string | null;
} {
	const raw = String(message.content ?? "").trim();
	const msgType = String(message.message_type ?? "")
		.trim()
		.toLowerCase();
	const isFlag =
		msgType === "emoji" &&
		(message.emoji_source_type === "flag" || /^[a-zA-Z]{2}$/.test(raw));
	if (!isFlag) return { isFlagMessage: false, flagCode: null };
	return { isFlagMessage: true, flagCode: raw.toUpperCase() };
}

export function isEmojiOnly(message: Message, isFlagMessage: boolean): boolean {
	const raw = String(message.content ?? "").trim();
	if (!raw) return false;
	if (isFlagMessage) return true;
	const matches = raw.match(emojiOnlyRegex);
	return matches?.join("") === raw;
}

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

const BubbleReplyContent = ({
	replyMessage,
	isCurrentUserSender,
	outgoingTextColor,
	incomingTextColor,
}: {
	replyMessage: Message;
	isCurrentUserSender: boolean;
	outgoingTextColor?: string;
	incomingTextColor?: string;
}) => {
	const type = replyMessage.message_type ?? "";
	const textSx = (theme: import("@mui/material").Theme) => ({
		mt: 0.2,
		color: isCurrentUserSender
			? `${outgoingTextColor || theme.palette.background.default} !important`
			: `${incomingTextColor || theme.palette.text.primary} !important`,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap" as const,
		maxWidth: 200,
		opacity: 0.7,
	});

	if (type === "image") {
		return (
			<Typography variant="caption" sx={textSx}>
				Hình ảnh
			</Typography>
		);
	}

	if (type === "video") {
		return (
			<Typography variant="caption" sx={textSx}>
				Video
			</Typography>
		);
	}

	if (type === "sticker") {
		return (
			<Typography variant="caption" sx={textSx}>
				Sticker
			</Typography>
		);
	}

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
				sx={{
					display: "flex",
					alignItems: "center",
					gap: 0.75,
					mt: 0.2,
					minWidth: 0,
				}}
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
				<Typography
					variant="caption"
					noWrap
					sx={(theme) => ({ ...textSx(theme), mt: 0 })}
				>
					{displayName || "Tệp đính kèm"}
				</Typography>
			</Box>
		);
	}

	return (
		<Typography variant="body2" sx={textSx}>
			{replyMessage.content}
		</Typography>
	);
};

export const BubbleContent = ({
	message,
	messages,
	isCurrentUserSender,
	bubbleTextColor,
	replyMessage,
	replyPreviewSenderName,
	replyContainerBackground,
	outgoingTextColor,
	incomingTextColor,
	edited,
	bubbleBorderRadius,
	onJumpToMessage,
	onToggleReaction,
	onViewHistories,
	onCallBack,
	lineClamp,
}: BubbleContentProps) => {
	const [galleryModalOpen, setGalleryModalOpen] = useState(false);
	const [selectedMessageId, setSelectedMessageId] = useState<
		number | undefined
	>(undefined);
	const [filePreviewOpen, setFilePreviewOpen] = useState(false);
	const [filePreviewUrl, setFilePreviewUrl] = useState("");
	const [filePreviewName, setFilePreviewName] = useState("");
	const [filePreviewExt, setFilePreviewExt] = useState("");

	const isActivityMessage = Boolean(message.activity_type);
	const { isFlagMessage, flagCode } = isFlagMsg(message);
	const isEmojiOnlyMessage = isEmojiOnly(message, isFlagMessage);
	const isStickerMessage = message.message_type === "sticker";
	const isImageMessage = message.message_type === "image";
	const isVideoMessage = message.message_type === "video";
	const isFileMessage = message.message_type === "file";
	const isVideoCallMessage = message.message_type === "video_call";
	const isAudioCallMessage = message.message_type === "audio_call";
	const isCallMessage = isCallMessageType(message.message_type);

	const fileOriginalName = message.metadata?.original_name;
	const fileExt = isFileMessage
		? getFileExtFromContent(message.content, fileOriginalName)
		: "";
	const fileDisplayName = isFileMessage
		? getDisplayFilename(message.content, message.file, fileOriginalName)
		: "";
	const fileIconCfg = isFileMessage ? getFileIconConfig(fileExt) : null;

	const activityDescription = isActivityMessage ? getActivityText(message) : "";

	const callMeta = isCallMessage ? parseCallMeta(message.content) : null;
	const callTitle = getCallTitle(message.message_type, callMeta?.call_type);
	const callStatusLabel = getCallStatusLabel(
		callMeta?.status,
		callMeta?.duration_seconds,
	);

	return (
		<>
			{!isActivityMessage && replyMessage && (
				<Box
					onClick={(event) => {
						event.stopPropagation();
						if (message.reply_to_message_id) {
							onJumpToMessage?.(Number(message.reply_to_message_id));
						}
					}}
					sx={(theme) => ({
						mb: 0.75,
						px: 1,
						py: 0.6,
						borderLeft: "3px solid",
						borderColor: isCurrentUserSender
							? `${outgoingTextColor || theme.palette.background.default} !important`
							: incomingTextColor || theme.palette.primary.main,
						bgcolor: replyContainerBackground,
						borderRadius: 1,
						cursor: message.reply_to_message_id ? "pointer" : "default",
					})}
				>
					<Box
						sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}
					>
						<Box sx={{ flex: 1, minWidth: 0 }}>
							<Typography
								variant="caption"
								sx={(theme) => ({
									fontWeight: 700,
									display: "block",
									color: isCurrentUserSender
										? `${outgoingTextColor || theme.palette.background.default} !important`
										: `${incomingTextColor || theme.palette.text.primary} !important`,
									opacity: 0.7,
								})}
							>
								{replyPreviewSenderName || "Tin nhắn được trả lời"}
							</Typography>
							<BubbleReplyContent
								replyMessage={replyMessage}
								isCurrentUserSender={isCurrentUserSender}
								outgoingTextColor={outgoingTextColor}
								incomingTextColor={incomingTextColor}
							/>
						</Box>
						<BubbleReplyThumbnail replyMessage={replyMessage} />
					</Box>
				</Box>
			)}

			<Box
				sx={(theme) => ({
					wordBreak: "break-word",
					overflowWrap: "anywhere",
					whiteSpace: "pre-wrap",
					color: isCurrentUserSender
						? `${outgoingTextColor || theme.palette.background.default} !important`
						: `${incomingTextColor || theme.palette.text.primary} !important`,
					cursor: isActivityMessage ? "default" : "pointer",
					...(lineClamp
						? {
								display: "-webkit-box",
								WebkitLineClamp: lineClamp,
								WebkitBoxOrient: "vertical",
								overflow: "hidden",
								whiteSpace: "normal",
							}
						: {}),
				})}
			>
				{isActivityMessage ? (
					<Typography
						variant="body2"
						sx={{ color: bubbleTextColor, fontStyle: "italic", pt: 2 }}
					>
						{activityDescription}
					</Typography>
				) : isCallMessage ? (
					<Box
						sx={{
							display: "flex",
							alignItems: "center",
							gap: 1.5,
							minWidth: 180,
							maxWidth: 260,
						}}
					>
						<Box
							sx={{
								width: 40,
								height: 40,
								borderRadius: "50%",
								bgcolor: isCurrentUserSender
									? "rgba(255,255,255,0.2)"
									: "primary.main",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								flexShrink: 0,
							}}
						>
							{isVideoCallMessage ? (
								<VideocamIcon sx={{ fontSize: 20, color: "#fff" }} />
							) : (
								<CallIcon sx={{ fontSize: 20, color: "#fff" }} />
							)}
						</Box>
						<Box sx={{ flex: 1, minWidth: 0 }}>
							<Typography
								variant="body2"
								sx={{ fontWeight: 600, color: bubbleTextColor, lineHeight: 1.3 }}
							>
								{callTitle}
							</Typography>
							<Typography
								variant="caption"
								sx={{ opacity: 0.7, color: bubbleTextColor }}
							>
								{callStatusLabel}
							</Typography>
						</Box>
						{!isCurrentUserSender && onCallBack && (
							<Button
								size="small"
								variant="outlined"
								onClick={(e) => {
									e.stopPropagation();
									onCallBack();
								}}
								sx={{
									minWidth: 0,
									px: 1.5,
									py: 0.5,
									fontSize: 12,
									fontWeight: 600,
									borderRadius: 2,
									color: bubbleTextColor,
									borderColor: "rgba(255,255,255,0.4)",
									"&:hover": { borderColor: bubbleTextColor, bgcolor: "rgba(255,255,255,0.1)" },
									flexShrink: 0,
								}}
							>
								Gọi lại
							</Button>
						)}
					</Box>
				) : message.message_type === "markdown" ? (
					<ReactMarkdown
						remarkPlugins={[remarkGfm]}
						components={{
							a: ({ node, ref, ...props }) => (
								<a
									{...props}
									style={{ color: "inherit", textDecoration: "underline" }}
									target="_blank"
									rel="noopener noreferrer"
								/>
							),
						}}
					>
						{message.content}
					</ReactMarkdown>
				) : isVideoMessage ? (
					<Box
						sx={{
							position: "relative",
							display: "block",
							cursor: "pointer",
							...bubbleBorderRadius,
							overflow: "hidden",
							maxWidth: 240,
						}}
						onClick={() => {
							setSelectedMessageId(message.id);
							setGalleryModalOpen(true);
						}}
					>
						<Box
							component="video"
							src={resolveCdnUrl(message.content)}
							preload="metadata"
							muted
							sx={{
								display: "block",
								maxWidth: 240,
								maxHeight: 180,
								width: "100%",
								height: "auto",
							}}
						/>
						<Box
							sx={{
								position: "absolute",
								inset: 0,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								bgcolor: "rgba(0,0,0,0.28)",
								transition: "bgcolor 0.15s",
								"&:hover": { bgcolor: "rgba(0,0,0,0.42)" },
							}}
						>
							<Box
								sx={{
									width: 44,
									height: 44,
									borderRadius: "50%",
									bgcolor: "rgba(255,255,255,0.5)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									"&:hover": { bgcolor: "rgba(255,255,255,0.8)" },
								}}
							>
								<Box
									sx={{
										width: 0,
										height: 0,
										borderStyle: "solid",
										borderWidth: "9px 0 9px 16px",
										borderColor: "transparent transparent transparent #1a1a2e",
										ml: "3px",
									}}
								/>
							</Box>
						</Box>
						{message.metadata?.duration && (
							<Box
								sx={{
									position: "absolute",
									bottom: 0,
									left: 0,
									right: 0,
									px: 1,
									py: 0.5,
									justifyContent: "space-between",
									alignItems: "center",
									gap: 1,
								}}
							>
								<Chip
									label={formatVideoDuration(message.metadata.duration / 1000)}
									size="small"
									sx={{
										height: 18,
										fontSize: 10,
										color: "#fff",
										bgcolor: "rgba(0,0,0,0.7)",
										borderRadius: 1,
										"& .MuiChip-label": { px: 0.75 },
									}}
								/>
							</Box>
						)}
					</Box>
				) : isFileMessage ? (
					<Box
						onClick={() => {
							if (message.pending) return;
							setFilePreviewUrl(resolveCdnUrl(message.content));
							setFilePreviewName(fileDisplayName);
							setFilePreviewExt(fileExt);
							setFilePreviewOpen(true);
						}}
						sx={{
							display: "flex",
							alignItems: "center",
							gap: 1.5,
							minWidth: 180,
							maxWidth: 280,
							cursor: message.pending ? "default" : "pointer",
							borderRadius: 1.5,
							mx: -0.5,
							px: 0.5,
							py: 0.25,
							transition: "all 0.2s ease",
							"&:hover": message.pending
								? {}
								: {
										bgcolor: "rgba(0,0,0,0.08)",
										"& .download-icon": {
											opacity: 1,
											transform: "scale(1.2)",
										},
									},
						}}
					>
						<Box
							sx={{
								width: 40,
								height: 40,
								borderRadius: 1.5,
								bgcolor: fileIconCfg?.color ?? "#546e7a",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								flexShrink: 0,
								opacity: message.pending ? 0.5 : 1,
							}}
						>
							{fileIconCfg?.icon}
						</Box>
						<Box sx={{ flex: 1, minWidth: 0 }}>
							<Typography
								variant="body2"
								noWrap
								sx={{ fontWeight: 500, color: bubbleTextColor }}
							>
								{fileDisplayName || "Tệp đính kèm"}
							</Typography>
							<Typography
								variant="caption"
								sx={{ opacity: 0.6, color: bubbleTextColor }}
							>
								{fileIconCfg?.label ??
									(fileExt ? fileExt.slice(1).toUpperCase() : "Tệp")}
								{message.metadata?.size
									? ` - ${formatFileSize(message.metadata?.size)}`
									: ""}
							</Typography>
						</Box>
						<DownloadIcon
							className="download-icon"
							sx={{
								fontSize: 16,
								opacity: message.pending ? 0 : 0.5,
								flexShrink: 0,
								color: bubbleTextColor,
								transition: "all 0.2s ease",
							}}
						/>
					</Box>
				) : isStickerMessage ? (
					<Box
						component="img"
						src={resolveCdnUrl(message.content)}
						alt="Sticker"
						sx={{
							display: "block",
							p: 0,
							maxWidth: 120,
							maxHeight: 120,
							width: "auto",
							height: "auto",
						}}
					/>
				) : isImageMessage ? (
					<Box
						sx={{
							display: "block",
							width: "fit-content",
							...bubbleBorderRadius,
							overflow: "hidden",
							cursor: "pointer",
						}}
						onClick={() => {
							setSelectedMessageId(message.id);
							setGalleryModalOpen(true);
						}}
					>
						<Box
							component="img"
							src={resolveCdnUrl(message.content)}
							alt="Image"
							sx={{
								display: "block",
								p: 0,
								maxWidth: 200,
								maxHeight: 200,
								width: "auto",
								height: "auto",
							}}
						/>
					</Box>
				) : isFlagMessage ? (
					<Box
						component="img"
						src={`/flags/4x3/${flagCode?.toLowerCase()}.svg`}
						alt={flagCode ?? "flag"}
						sx={{ width: 72, height: 54, objectFit: "contain" }}
					/>
				) : isEmojiOnlyMessage ? (
					<Box
						onDoubleClick={() => onToggleReaction?.(message, "❤️")}
						sx={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							fontSize: 34,
							lineHeight: 1.1,
							cursor: "pointer",
							whiteSpace: "pre-wrap",
						}}
					>
						{message.content}
					</Box>
				) : (
					<Box
						onDoubleClick={() => onToggleReaction?.(message, "❤️")}
						sx={{ display: "inline", cursor: "pointer" }}
					>
						<Linkify
							options={{
								target: "_blank",
								rel: "noopener noreferrer",
								className: "message-link",
								render: {
									url: (props: {
										attributes: React.AnchorHTMLAttributes<HTMLAnchorElement>;
										content: React.ReactNode;
									}) => (
										<a
											{...props.attributes}
											style={{ color: "#4dabf7", textDecoration: "none" }}
										>
											{props.content}
										</a>
									),
								},
							}}
						>
							{message.content}
						</Linkify>
					</Box>
				)}
			</Box>

			{edited && (
				<Typography
					variant="caption"
					onClick={(e) => {
						e.stopPropagation();
						onViewHistories?.(message);
					}}
					sx={{
						display: "block",
						mt: 0.35,
						textAlign: isCurrentUserSender ? "right" : "left",
						fontSize: "10px",
						lineHeight: 1.2,
						color: bubbleTextColor,
						opacity: 0.72,
						fontStyle: "italic",
						cursor: "pointer",
						transition: "opacity 0.2s ease",
						"&:hover": { opacity: 1 },
					}}
				>
					Đã sửa
				</Typography>
			)}

			<ImageGalleryModal
				open={galleryModalOpen}
				onClose={() => setGalleryModalOpen(false)}
				messages={messages}
				initialMessageId={selectedMessageId}
				onNavigateToMessage={onJumpToMessage}
			/>
			<FilePreviewModal
				open={filePreviewOpen}
				onClose={() => setFilePreviewOpen(false)}
				fileUrl={filePreviewUrl}
				filename={filePreviewName}
				fileExt={filePreviewExt}
			/>
		</>
	);
};
