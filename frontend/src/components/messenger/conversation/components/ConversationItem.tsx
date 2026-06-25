import {
	buildGeneratedAvatar,
	getConversationAvatar,
	getConversationDisplayName,
} from "@components/messenger/messengerUtils";
import type { ConversationItemProps } from "@components/messenger/types/conversation";
import type { Participant } from "@/types/messenger";
import AttachFileOutlinedIcon from "@mui/icons-material/AttachFileOutlined";
import GroupIcon from "@mui/icons-material/Group";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import {
	Avatar,
	AvatarGroup,
	Badge,
	Box,
	IconButton,
	ListItemAvatar,
	ListItemButton,
	Tooltip,
	Typography,
} from "@mui/material";
import { type MouseEvent, useMemo, useRef } from "react";
import { formatTimestampRealtime } from "@/utils";
import { resolveCdnUrl } from "@/utils/urlUtils";

function formatUnreadBadge(count: number) {
	if (count <= 0) return 0;
	return count > 99 ? "99+" : count;
}

const ConversationTypingPreview = ({
	avatar,
	label,
	showAvatar,
}: {
	avatar?: string;
	label: string;
	showAvatar?: boolean;
}) => (
	<Box
		component="span"
		sx={{
			display: "inline-flex",
			alignItems: "center",
			gap: 0.45,
			color: "primary.main",
			fontWeight: 600,
			minWidth: 0,
		}}
	>
		<Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
			{label}
		</Box>
		{showAvatar ? (
			<Avatar
				src={resolveCdnUrl(avatar) || buildGeneratedAvatar(label)}
				alt={label}
				sx={{
					width: 16,
					height: 16,
					fontSize: 8,
					flexShrink: 0,
					border: "1px solid",
					borderColor: "background.paper",
				}}
			/>
		) : null}
		<Box
			component="span"
			aria-hidden="true"
			sx={{
				display: "inline-flex",
				alignItems: "center",
				gap: 0.3,
				flexShrink: 0,
			}}
		>
			{[0, 0.16, 0.32].map((delay) => (
				<Box
					key={delay}
					component="span"
					sx={{
						width: 4,
						height: 4,
						borderRadius: "50%",
						bgcolor: "currentColor",
						animation: "conversationTypingWave 1.05s ease-in-out infinite",
						animationDelay: `${delay}s`,
						"@keyframes conversationTypingWave": {
							"0%, 60%, 100%": {
								opacity: 0.42,
								transform: "translateY(0) scale(0.92)",
							},
							"30%": {
								opacity: 1,
								transform: "translateY(-3px) scale(1)",
							},
						},
					}}
				/>
			))}
		</Box>
	</Box>
);

export const ConversationItem = ({
	conversation,
	currentUserId,
	selected,
	compact,
	now,
	typingPreview,
	onSelect,
	onMenuOpen,
	onToggleNotifications,
}: ConversationItemProps) => {
	const skipNextSelectRef = useRef(false);
	const displayName = getConversationDisplayName(conversation, currentUserId);

	const avatarSrc =
		resolveCdnUrl(getConversationAvatar(conversation, currentUserId)) ||
		buildGeneratedAvatar(displayName);
	const conversationTime = useMemo(
		() => formatTimestampRealtime(conversation.last_message_at ?? "", now),
		[conversation.last_message_at, now],
	);
	const unreadCount = Number(conversation.unread_count || 0);

	const isLastMessageReaction = conversation.last_message_type === "reaction";
	const isLastMessageActivity = conversation.last_message_type === "activity";
	const showUnreadCount =
		unreadCount > 0 && !isLastMessageReaction && !isLastMessageActivity;
	const showReactionDot =
		(isLastMessageReaction || isLastMessageActivity) && unreadCount > 0;
	const draftText = conversation.draftText;
	const draftImageCount = conversation.draftImageCount;
	const draftVideoCount = conversation.draftVideoCount;
	const draftFileCount = conversation.draftFileCount;
	const hasSending = Boolean(conversation.hasSending);
	const hasDraft =
		!hasSending &&
		Boolean(
			draftText?.trim() || draftImageCount || draftVideoCount || draftFileCount,
		);
	const draftTotalAttachments =
		(draftImageCount ?? 0) + (draftVideoCount ?? 0) + (draftFileCount ?? 0);

	const isLastMessageMine =
		conversation.last_message_sender_id === currentUserId;
	const readRecipients = useMemo(() => {
		const lastMessageId = conversation.last_message_id;
		if (!isLastMessageMine || hasDraft || !lastMessageId) return [];
		// When the last message is a reaction, last_message_id points to the reaction row
		// but participants' last_read_seq is redirected to the previous non-reaction message
		// by MarkRead. Use last_read_message_id (the effective content message ID) as the
		// threshold so read avatars are shown correctly.
		const threshold =
			conversation.last_message_type === "reaction"
				? (conversation.last_read_message_id ?? lastMessageId)
				: lastMessageId;
		return (conversation.participants ?? []).filter(
			(p: Participant) =>
				p.id !== currentUserId &&
				p.last_read_seq != null &&
				p.last_read_seq >= threshold,
		);
	}, [
		isLastMessageMine,
		hasDraft,
		conversation.last_message_id,
		conversation.last_message_type,
		conversation.last_read_message_id,
		conversation.participants,
		currentUserId,
	]);

	const draftPreviewContent = draftText?.trim() ? (
		`Bạn: ${draftText.trim()}`
	) : draftTotalAttachments > 0 ? (
		<Box
			component="span"
			sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
		>
			<AttachFileOutlinedIcon sx={{ fontSize: 16 }} />
			{`${draftTotalAttachments} tệp đính kèm`}
		</Box>
	) : null;

	const handleOpenMenu = (event: MouseEvent<HTMLElement>) => {
		event.stopPropagation();
		const rect = event.currentTarget.getBoundingClientRect();
		onMenuOpen?.({ top: rect.bottom, left: rect.right }, conversation);
	};

	const handleContextMenu = (event: MouseEvent<HTMLElement>) => {
		event.preventDefault();
		event.stopPropagation();
		skipNextSelectRef.current = true;
		onMenuOpen?.({ top: event.clientY, left: event.clientX }, conversation);
	};

	const content = (
		<ListItemButton
			selected={selected}
			onMouseDown={(e) => {
				if (e.button === 0) skipNextSelectRef.current = false;
			}}
			onClick={(e) => {
				if (e.button !== 0) return;
				if (skipNextSelectRef.current) {
					skipNextSelectRef.current = false;
					return;
				}
				onSelect(conversation.id);
			}}
			onContextMenu={handleContextMenu}
			sx={{
				py: 1.5,
				px: compact ? 1 : 2,
				justifyContent: compact ? "center" : "flex-start",
				bgcolor: selected ? "action.selected" : "transparent",
				borderLeft: selected ? "4px solid" : "4px solid transparent",
				borderColor: selected ? "primary.main" : "transparent",
				transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
				"&.Mui-selected": {
					bgcolor: "action.selected",
				},
				"&:hover": {
					bgcolor: "action.hover",
				},
			}}
		>
			<ListItemAvatar sx={{ minWidth: compact ? 0 : 56, mr: compact ? 0 : 1 }}>
				<Box
					sx={{
						position: "relative",
						width: 40,
						height: 40,
					}}
				>
					<Avatar
						src={avatarSrc}
						sx={{
							width: 40,
							height: 40,
						}}
					>
						{conversation.is_group && !avatarSrc ? (
							<GroupIcon fontSize="medium" />
						) : null}
					</Avatar>

					{showUnreadCount && (
						<Badge
							color="primary"
							badgeContent={formatUnreadBadge(unreadCount)}
							overlap="circular"
							anchorOrigin={{
								vertical: "bottom",
								horizontal: "right",
							}}
							sx={{
								position: "absolute",
								top: 4,
								right: 4,
								"& .MuiBadge-badge": {
									fontSize: 10,
									minWidth: 18,
									height: 18,
								},
							}}
						/>
					)}
					{showReactionDot && (
						<Box
							sx={{
								position: "absolute",
								top: 0,
								right: -4,
								width: 12,
								height: 12,
								borderRadius: "50%",
								bgcolor: "primary.main",
								border: "2px solid",
								borderColor: "background.paper",
								"@keyframes reactionPulse": {
									"0%, 100%": { opacity: 1, transform: "scale(1)" },
									"50%": { opacity: 0.3, transform: "scale(0.7)" },
								},
								animation: "reactionPulse 1s ease-in-out infinite",
							}}
						/>
					)}
				</Box>
			</ListItemAvatar>

			{!compact && (
				<Box
					sx={{
						display: "flex",
						alignItems: "center",
						width: "100%",
						minWidth: 0,
					}}
				>
					<Box sx={{ minWidth: 0, flex: 1, mr: 1 }}>
						{/* Primary row: name + time */}
						<Box
							sx={{
								display: "flex",
								alignItems: "center",
								gap: 1,
								minWidth: 0,
							}}
						>
							<Typography
								component="span"
								variant="subtitle2"
								sx={{
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
									fontWeight: unreadCount > 0 ? 700 : 500,
								}}
							>
								{getConversationDisplayName(conversation, currentUserId)}
							</Typography>
							<Typography
								component="span"
								variant="caption"
								color={
									hasSending
										? "text.secondary"
										: hasDraft
											? "primary.main"
											: "text.secondary"
								}
								sx={{
									ml: "auto",
									flexShrink: 0,
									whiteSpace: "nowrap",
								}}
							>
								{hasSending
									? conversationTime
									: hasDraft
										? "Chưa gửi"
										: conversationTime}
							</Typography>
						</Box>

						{/* Secondary row: message preview + read avatars */}
						<Box
							sx={{
								display: "flex",
								alignItems: "center",
								gap: 0.5,
								mt: 0.25,
								minWidth: 0,
							}}
						>
							<Typography
								variant="body2"
								color="text.secondary"
								sx={{
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
									flex: 1,
									minWidth: 0,
									fontWeight: unreadCount > 0 ? 600 : 400,
									fontStyle: "normal",
								}}
							>
								{hasSending ? (
									<Box
										component="span"
										sx={{
											display: "inline-flex",
											alignItems: "center",
											gap: 0.5,
											color: "text.secondary",
											fontStyle: "italic",
										}}
									>
										Đang gửi...
									</Box>
								) : hasDraft ? (
									draftPreviewContent
								) : typingPreview ? (
									<ConversationTypingPreview
										avatar={typingPreview.avatar}
										label={typingPreview.label}
										showAvatar={typingPreview.showAvatar}
									/>
								) : conversation.last_message_content ? (
									(() => {
										const content = String(
											conversation.last_message_content ?? "",
										).trim();
										const message_type =
											conversation.last_message_type ?? "text";
										const isReaction = message_type === "reaction";
										const isActivity = message_type === "activity";
										if (isActivity) {
											return content;
										}
										const sender = isReaction
											? ""
											: conversation.last_message_sender_id === currentUserId
												? "Bạn: "
												: conversation.is_group
													? `${conversation.last_message_sender_name}: `
													: "";

										const match = content.match(/([A-Za-z]{2})/);
										if (
											match &&
											message_type === "emoji" &&
											conversation.emoji_source_type === "flag"
										) {
											const code = match[1].toLowerCase();
											return (
												<span>
													{sender}:{" "}
													<Box
														component="span"
														className={`fi fi-${code}`}
														sx={{
															display: "inline-block",
															verticalAlign: "middle",
															ml: 0.5,
														}}
													/>
												</span>
											);
										}

										const messageTypeLabels: Record<string, string> = {
											sticker: "Sticker",
											image: "Hình ảnh",
											video: "Video",
											file: "Tệp đính kèm",
											emoji: content,
										};

										const displayContent =
											messageTypeLabels[message_type] ?? content;

										return isReaction
											? displayContent
											: `${sender} ${displayContent}`;
									})()
								) : (
									"Chưa có tin nhắn"
								)}
							</Typography>

							{!typingPreview && readRecipients.length > 0 && (
								<AvatarGroup
									max={3}
									spacing={4}
									sx={{
										flexShrink: 0,
										"& .MuiAvatar-root": {
											width: 16,
											height: 16,
											fontSize: 8,
											border: "1.5px solid",
											borderColor: "background.paper",
										},
										"& .MuiAvatarGroup-surplus": {
											width: 16,
											height: 16,
											fontSize: 8,
											border: "1.5px solid",
											borderColor: "background.paper",
										},
									}}
								>
									{readRecipients.map((p: Participant) => (
										<Tooltip key={p.id} title={p.fullname}>
											<Avatar
												src={
													resolveCdnUrl(p.avatar) ||
													buildGeneratedAvatar(p.fullname)
												}
												alt={p.fullname}
											/>
										</Tooltip>
									))}
								</AvatarGroup>
							)}
						</Box>
					</Box>

					<Box
						sx={{
							ml: "auto",
							display: "flex",
							alignItems: "center",
							flexShrink: 0,
						}}
					>
						{!conversation.notifications_enabled ? (
							<Tooltip title="Bật lại thông báo">
								<IconButton
									size="small"
									onClick={(event) => {
										event.stopPropagation();
										onToggleNotifications?.(conversation);
									}}
									sx={{ mr: 0.25 }}
								>
									<NotificationsOffIcon
										fontSize="small"
										sx={{ color: "text.secondary" }}
									/>
								</IconButton>
							</Tooltip>
						) : null}
						{onMenuOpen ? (
							<IconButton size="small" onClick={handleOpenMenu}>
								<MoreVertIcon fontSize="small" />
							</IconButton>
						) : null}
					</Box>
				</Box>
			)}
		</ListItemButton>
	);

	return compact ? (
		<Tooltip title={getConversationDisplayName(conversation, currentUserId)}>
			{content}
		</Tooltip>
	) : (
		content
	);
};
