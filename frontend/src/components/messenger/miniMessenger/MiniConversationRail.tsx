import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import {
	Avatar,
	Badge,
	Box,
	IconButton,
	Paper,
	Popover,
	Tooltip,
	Typography,
} from "@mui/material";
import { useState } from "react";
import type { Conversation } from "@/types/messenger";
import { ConversationTooltip } from "./ConversationTooltip";
import { getConversationAvatar, getConversationTitle } from "./utils";

const CONVERSATION_DISPLAY_LIMIT = 5;

function formatUnreadBadge(count: number) {
	if (count <= 0) return 0;
	return count > 99 ? "99+" : count;
}

export function MiniConversationRail({
	conversations,
	currentUserId,
	total,
	openIds,
	onOpen,
	onDismiss,
	onCloseAll,
	onMinimizeAll,
	onOpenNewMessage,
}: {
	conversations: Conversation[];
	currentUserId?: number | string;
	total: number;
	openIds: number[];
	onOpen: (conversationId: number) => void;
	onDismiss: (conversationId: number) => void;
	onCloseAll: () => void;
	onMinimizeAll: () => void;
	onOpenNewMessage: () => void;
}) {
	const [optionsAnchor, setOptionsAnchor] = useState<HTMLElement | null>(null);
	const hiddenCount = Math.max(0, total - CONVERSATION_DISPLAY_LIMIT);
	const hasListedChats = total > 0;
	const hasOpenChats = openIds.length > 0;
	const hasAnyChats = hasListedChats || hasOpenChats;
	const closeOptions = () => setOptionsAnchor(null);

	return (
		<Box
			sx={{
				position: "fixed",
				right: 24,
				bottom: 24,
				zIndex: (theme) => theme.zIndex.modal - 1,
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				gap: 0.8,
			}}
		>
			{hasAnyChats && (
				<Tooltip title="Tùy chọn chat" placement="left">
					<IconButton
						onClick={(event) => setOptionsAnchor(event.currentTarget)}
						sx={{
							width: 50,
							height: 50,
							bgcolor: "background.paper",
							boxShadow: "0 14px 34px rgba(0,0,0,0.35)",
							"&:hover": { bgcolor: "action.hover" },
						}}
					>
						<MoreHorizIcon />
					</IconButton>
				</Tooltip>
			)}

			{conversations.map((conversation) => {
				const title = getConversationTitle(conversation, currentUserId);
				const selected = openIds.includes(conversation.id);

				return (
					<Tooltip
						key={conversation.id}
						title={
							<ConversationTooltip
								conversation={conversation}
								currentUserId={currentUserId}
							/>
						}
						placement="left"
					>
						<Box
							sx={{
								position: "relative",
								width: 50,
								height: 50,
								"&:hover .mini-rail-dismiss": { opacity: 1 },
							}}
						>
							<IconButton
								onClick={() => onOpen(conversation.id)}
								sx={{
									width: 50,
									height: 50,
									p: 0,
									borderRadius: "50%",
									bgcolor: selected ? "primary.main" : "background.paper",
									boxShadow: "0 12px 30px rgba(0,0,0,0.34)",
									"&:hover": {
										bgcolor: selected ? "primary.dark" : "action.hover",
									},
								}}
							>
								<Badge
									color="primary"
									badgeContent={formatUnreadBadge(conversation.unread_count)}
								>
									<Avatar
										src={getConversationAvatar(conversation, currentUserId)}
										alt={title}
										sx={{ width: 46, height: 46 }}
									>
										{title.charAt(0).toUpperCase()}
									</Avatar>
								</Badge>
							</IconButton>
							<IconButton
								className="mini-rail-dismiss"
								size="small"
								onClick={(event) => {
									event.stopPropagation();
									onDismiss(conversation.id);
								}}
								sx={{
									position: "absolute",
									left: -6,
									top: -6,
									width: 22,
									height: 22,
									bgcolor: "#303030",
									color: "#fff",
									border: "1px solid rgba(255,255,255,0.16)",
									opacity: 0,
									transition: "opacity 0.15s",
									"&:hover": { bgcolor: "#4a4a4a" },
								}}
							>
								<CloseIcon sx={{ fontSize: 14 }} />
							</IconButton>
						</Box>
					</Tooltip>
				);
			})}

			<Popover
				open={Boolean(optionsAnchor)}
				anchorEl={optionsAnchor}
				onClose={closeOptions}
				anchorOrigin={{ vertical: "center", horizontal: "left" }}
				transformOrigin={{ vertical: "center", horizontal: "right" }}
				slotProps={{
					paper: {
						sx: {
							mb: 1,
							mr: 1.5,
							width: 330,
							borderRadius: 2,
							bgcolor: "#242526",
							color: "#f5f5f5",
							boxShadow: "0 18px 55px rgba(0,0,0,0.45)",
							overflow: "visible",
							"&::after": {
								content: '""',
								position: "absolute",
								right: -9,
								top: "50%",
								width: 18,
								height: 18,
								bgcolor: "#242526",
								transform: "translateY(-50%) rotate(45deg)",
							},
						},
					},
				}}
			>
				<Box sx={{ p: 1.25, position: "relative", zIndex: 1 }}>
					<Box
						component="button"
						disabled={!hasListedChats}
						onClick={() => {
							onCloseAll();
							closeOptions();
						}}
						sx={{
							all: "unset",
							width: "100%",
							display: "flex",
							alignItems: "center",
							gap: 1.5,
							px: 1,
							py: 1,
							borderRadius: 1.25,
							cursor: hasListedChats ? "pointer" : "default",
							opacity: hasListedChats ? 1 : 0.45,
							"&:hover": {
								bgcolor: hasListedChats
									? "rgba(255,255,255,0.08)"
									: "transparent",
							},
						}}
					>
						<CloseIcon />
						<Typography sx={{ fontWeight: 800 }}>Close all chats</Typography>
					</Box>
					<Box
						component="button"
						disabled={!hasOpenChats}
						onClick={() => {
							onMinimizeAll();
							closeOptions();
						}}
						sx={{
							all: "unset",
							width: "100%",
							display: "flex",
							alignItems: "center",
							gap: 1.5,
							px: 1,
							py: 1,
							borderRadius: 1.25,
							cursor: hasOpenChats ? "pointer" : "default",
							opacity: hasOpenChats ? 1 : 0.45,
							"&:hover": {
								bgcolor: hasOpenChats
									? "rgba(255,255,255,0.08)"
									: "transparent",
							},
						}}
					>
						<RemoveCircleOutlineIcon />
						<Typography sx={{ fontWeight: 800 }}>Minimise open chats</Typography>
					</Box>
				</Box>
			</Popover>

			{hiddenCount > 0 && (
				<Paper
					elevation={8}
					sx={{
						width: 54,
						height: 54,
						display: "grid",
						placeItems: "center",
						borderRadius: "50%",
						bgcolor: "background.paper",
						fontWeight: 800,
					}}
				>
					+{hiddenCount}
				</Paper>
			)}

			<Tooltip title="Tin nhắn mới" placement="left">
				<IconButton
					onClick={onOpenNewMessage}
					sx={{
						width: 58,
						height: 58,
						bgcolor: "background.paper",
						boxShadow: "0 14px 34px rgba(0,0,0,0.35)",
						"&:hover": { bgcolor: "action.hover" },
					}}
				>
					<EditIcon />
				</IconButton>
			</Tooltip>
		</Box>
	);
}
