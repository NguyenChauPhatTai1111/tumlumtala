import {
	getEmojiText,
	normalizeEmojiType,
} from "@components/messenger/composer/utils/emoji";
import type {
	ContextMenuProps,
	MessageContextMenuState,
} from "@components/messenger/types/message-ui";
import { useMessengerEmoji } from "@context/MessengerEmojiContext";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import EditIcon from "@mui/icons-material/Edit";
import HistoryIcon from "@mui/icons-material/History";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import ReplyIcon from "@mui/icons-material/Reply";
import {
	Box,
	Divider,
	IconButton,
	ListItemIcon,
	Menu,
	MenuItem,
	Popover,
	Tab,
	Tabs,
	Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import { speakText } from "@/services/ttsService";
import { resolveCdnUrl } from "@/utils/urlUtils";

export type { MessageContextMenuState };

const REACTION_OPTIONS = ["❤️", "👍", "😂", "😮", "😢", "😡"];

export const ContextMenu = ({
	ctxMenu,
	currentUser,
	currentUserId,
	sortedMessages,
	getSenderProfile,
	formatTimestamp,
	onClose,
	onToggleReaction,
	onReplyMessage,
	onEditMessage,
	onViewHistories,
	onDeleteMessage,
}: ContextMenuProps) => {
	const [ctxExtraReactionAnchorEl, setCtxExtraReactionAnchorEl] =
		useState<HTMLElement | null>(null);
	const [ctxActiveReactionPackTab, setCtxActiveReactionPackTab] = useState("");
	const { emojiTypeGroups, emojiTypeMap } = useMessengerEmoji();

	const ctxReactionEmojiTabs = useMemo(
		() =>
			Array.from(emojiTypeGroups.keys())
				.filter((type) =>
					(emojiTypeGroups.get(type) ?? []).some(
						(item) => normalizeEmojiType(item.type) !== "sticker",
					),
				)
				.map((type) => ({ key: type, label: emojiTypeMap[type] || type })),
		[emojiTypeGroups, emojiTypeMap],
	);

	const ctxExtraReactionOpen = Boolean(ctxExtraReactionAnchorEl);
	const ctxCurrentReactionPackTab =
		ctxActiveReactionPackTab || ctxReactionEmojiTabs[0]?.key || "";

	const ctxReactionEmojiList = useMemo(
		() =>
			(emojiTypeGroups.get(ctxCurrentReactionPackTab) ?? []).filter(
				(item) => normalizeEmojiType(item.type) !== "sticker",
			),
		[emojiTypeGroups, ctxCurrentReactionPackTab],
	);

	const handleClose = () => {
		onClose();
		setCtxExtraReactionAnchorEl(null);
	};

	const handleDownload = async () => {
		if (!ctxMenu) return;
		const url = resolveCdnUrl(ctxMenu.message.content);
		if (!url) return;
		const filename =
			ctxMenu.message.metadata?.original_name ||
			url.split("/").pop() ||
			"download";
		handleClose();
		try {
			const res = await fetch(url);
			const blob = await res.blob();
			const objectUrl = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = objectUrl;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(objectUrl);
		} catch {
			window.open(url, "_blank");
		}
	};

	const ctxIsCurrentUserSender = ctxMenu
		? ctxMenu.message.sender_id === currentUserId
		: false;

	const ctxLiveMessage = ctxMenu
		? (sortedMessages.find((m) => m.id === ctxMenu.message.id) ??
			ctxMenu.message)
		: null;

	const ctxMyReaction = ctxLiveMessage
		? ctxLiveMessage.my_reaction ||
			ctxLiveMessage.reactions?.find(
				(r) => String(r.user_id) === String(currentUser?.id),
			)?.emoji ||
			null
		: null;

	const ctxMsgType = (ctxMenu?.message.message_type ?? "text").toLowerCase();
	const ctxCanEdit =
		ctxIsCurrentUserSender &&
		ctxMsgType !== "emoji" &&
		ctxMsgType !== "sticker" &&
		ctxMsgType !== "image" &&
		ctxMsgType !== "video" &&
		ctxMsgType !== "file" &&
		ctxMenu?.message.emoji_source_type !== "flag";

	const ctxIsUpdated = Boolean(ctxMenu?.message.is_updated);
	const ctxCanDownload =
		ctxMsgType === "image" || ctxMsgType === "video" || ctxMsgType === "file";
	const ctxCanSpeak =
		ctxMsgType === "text" || ctxMsgType === "" || ctxMsgType === "markdown";

	const cleanTextForTTS = (text: string) => {
		return (
			text
				// Remove emoji sequences: ZWJ combos, variation selectors, skin tones, flags
				.replace(
					/(\p{Emoji_Presentation}|\p{Extended_Pictographic})(‍(\p{Emoji_Presentation}|\p{Extended_Pictographic})|️|\p{Emoji_Modifier})*/gu,
					"",
				)
				// Remove leftover variation selectors and zero-width joiners
				.replace(/[︀-️‍]/g, "")
				.replace(/\s+/g, " ")
				.trim()
		);
	};

	const handleSpeak = () => {
		if (!ctxMenu) return;

		handleClose();

		const text = cleanTextForTTS(ctxMenu.message.content);

		if (!text) return;

		speakText(text, ctxMenu.message.sender_gender).catch(() => {});
	};

	return (
		<Menu
			open={Boolean(ctxMenu)}
			onClose={handleClose}
			anchorReference="anchorPosition"
			anchorPosition={ctxMenu?.pos}
			transformOrigin={{
				horizontal: ctxIsCurrentUserSender ? "right" : "left",
				vertical: "top",
			}}
			slotProps={{
				paper: {
					sx: {
						bgcolor: "background.paper",
						color: "text.primary",
						boxShadow: (theme) => theme.shadows[8],
						backgroundImage: "none",
						border: "1px solid",
						borderColor: "divider",
					},
				},
			}}
		>
			{ctxMenu ? (
				<Box
					key="ctx-header"
					sx={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: 1,
						px: 2,
						pt: 1.5,
						pb: 1,
					}}
				>
					<Typography
						variant="subtitle2"
						fontWeight={700}
						noWrap
						sx={{ flex: 1, minWidth: 0 }}
					>
						{ctxIsCurrentUserSender
							? "Bạn"
							: getSenderProfile(ctxMenu.message.sender_id).name ||
								"Người dùng"}
					</Typography>
					<Typography
						variant="caption"
						sx={{ color: "text.secondary", flexShrink: 0 }}
					>
						{formatTimestamp(ctxMenu.message.created_at)}
					</Typography>
				</Box>
			) : null}
			{ctxMenu ? <Divider key="ctx-divider-top" /> : null}

			{onToggleReaction && ctxMenu ? (
				<Box sx={{ display: "flex", gap: 0.5, px: 1, py: 0.5 }}>
					{REACTION_OPTIONS.map((emoji) => (
						<IconButton
							key={emoji}
							size="small"
							onClick={() => {
								const isRemoving = ctxMyReaction === emoji;
								onToggleReaction(
									ctxMenu.message,
									emoji,
									isRemoving ? "remove" : undefined,
								);
								handleClose();
							}}
							sx={(theme) => ({
								fontSize: 20,
								width: 36,
								height: 36,
								bgcolor:
									ctxMyReaction === emoji
										? `${theme.palette.primary.main}33`
										: "transparent",
								color: "text.primary",
								borderRadius: "50%",
								border:
									ctxMyReaction === emoji
										? `2px solid ${theme.palette.primary.main}`
										: "2px solid transparent",
								"&:hover": { transform: "scale(1.2)" },
								transition:
									"transform 0.15s ease, border-color 0.15s ease, background-color 0.15s ease",
							})}
						>
							{emoji}
						</IconButton>
					))}

					{ctxReactionEmojiTabs.length > 0 && (
						<IconButton
							size="small"
							onClick={(e) =>
								setCtxExtraReactionAnchorEl(
									ctxExtraReactionOpen ? null : e.currentTarget,
								)
							}
							sx={(theme) => ({
								fontSize: 16,
								width: 36,
								height: 36,
								bgcolor: ctxExtraReactionOpen
									? `${theme.palette.primary.main}`
									: "action.selected",
								color: "text.primary",
								borderRadius: "50%",
								border: ctxExtraReactionOpen
									? `2px solid ${theme.palette.primary.main}`
									: "2px solid transparent",
								"&:hover": { transform: "scale(1.1)" },
								transition:
									"transform 0.15s ease, border-color 0.15s ease, background-color 0.15s ease",
							})}
						>
							<AddIcon fontSize="inherit" />
						</IconButton>
					)}
				</Box>
			) : null}

			<Popover
				open={ctxExtraReactionOpen}
				anchorEl={ctxExtraReactionAnchorEl}
				onClose={() => setCtxExtraReactionAnchorEl(null)}
				anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
				transformOrigin={{ vertical: "top", horizontal: "center" }}
				disableAutoFocus
				disableEnforceFocus
				onClick={(e) => e.stopPropagation()}
				slotProps={{
					paper: {
						sx: { width: 300, mt: 0.5, overflow: "hidden", zIndex: 1000 },
					},
				}}
			>
				<Tabs
					value={ctxCurrentReactionPackTab}
					onChange={(_, value) => setCtxActiveReactionPackTab(String(value))}
					variant="scrollable"
					scrollButtons="auto"
					allowScrollButtonsMobile
					sx={{
						minHeight: 36,
						borderBottom: "1px solid",
						borderColor: "divider",
						"& .MuiTab-root": {
							minHeight: 36,
							py: 0.5,
							px: 1.5,
							fontSize: 12,
							textTransform: "none",
						},
					}}
				>
					{ctxReactionEmojiTabs.map((tab) => (
						<Tab key={tab.key} value={tab.key} label={tab.label} />
					))}
				</Tabs>

				<Box
					sx={{
						maxHeight: 220,
						overflowY: "auto",
						p: 1,
						display: "flex",
						flexWrap: "wrap",
						gap: 0.5,
					}}
				>
					{ctxReactionEmojiList.map((emoji) => {
						const value = getEmojiText(emoji);
						if (!value || !ctxMenu || !onToggleReaction) return null;
						const isSelected = value === ctxMyReaction;
						const type = normalizeEmojiType(emoji.type);
						return (
							<IconButton
								key={emoji.id}
								size="small"
								onClick={(e) => {
									e.stopPropagation();
									onToggleReaction(
										ctxMenu.message,
										value,
										isSelected ? "remove" : undefined,
									);
									handleClose();
								}}
								sx={(theme) => ({
									width: 34,
									height: 34,
									borderRadius: 1,
									bgcolor: isSelected
										? `${theme.palette.primary.main}33`
										: "transparent",
									border: isSelected
										? `1px solid ${theme.palette.primary.main}`
										: "1px solid transparent",
									transition: "all 0.12s ease",
									"&:hover": {
										bgcolor: "action.hover",
										transform: "scale(1.15)",
									},
								})}
							>
								{type === "flag" ? (
									<Box
										component="span"
										className={`fi fi-${String(value).toLowerCase()}`}
										sx={{ fontSize: 18 }}
									/>
								) : (
									<Typography sx={{ fontSize: 20, lineHeight: 1 }}>
										{value}
									</Typography>
								)}
							</IconButton>
						);
					})}
				</Box>
			</Popover>

			{onToggleReaction &&
			(onReplyMessage || ctxCanEdit || ctxIsUpdated || onDeleteMessage) ? (
				<Divider sx={{ my: 0.5 }} />
			) : null}

			{onReplyMessage && ctxMenu ? (
				<MenuItem
					onClick={() => {
						onReplyMessage(ctxMenu.message);
						handleClose();
					}}
				>
					<ListItemIcon>
						<ReplyIcon fontSize="small" />
					</ListItemIcon>
					Trả lời
				</MenuItem>
			) : null}

			{ctxCanEdit && onEditMessage && ctxMenu ? (
				<MenuItem
					onClick={() => {
						onEditMessage(ctxMenu.message);
						handleClose();
					}}
				>
					<ListItemIcon>
						<EditIcon fontSize="small" />
					</ListItemIcon>
					Sửa
				</MenuItem>
			) : null}

			{ctxIsUpdated && ctxMenu ? (
				<MenuItem
					onClick={() => {
						onViewHistories(ctxMenu.message);
						handleClose();
					}}
				>
					<ListItemIcon>
						<HistoryIcon fontSize="small" />
					</ListItemIcon>
					Xem lịch sử sửa
				</MenuItem>
			) : null}

			{ctxCanDownload && ctxMenu ? (
				<MenuItem onClick={handleDownload}>
					<ListItemIcon>
						<DownloadIcon fontSize="small" />
					</ListItemIcon>
					Tải xuống
				</MenuItem>
			) : null}

			{ctxCanSpeak && ctxMenu ? (
				<MenuItem onClick={handleSpeak}>
					<ListItemIcon>
						<RecordVoiceOverIcon fontSize="small" />
					</ListItemIcon>
					Đọc bằng AI
				</MenuItem>
			) : null}

			{ctxIsCurrentUserSender && onDeleteMessage && ctxMenu ? (
				<MenuItem
					onClick={() => {
						onDeleteMessage(ctxMenu.message.id);
						handleClose();
					}}
					sx={{ color: "error.main" }}
				>
					<ListItemIcon>
						<DeleteIcon fontSize="small" sx={{ color: "error.main" }} />
					</ListItemIcon>
					Xóa
				</MenuItem>
			) : null}
		</Menu>
	);
};
