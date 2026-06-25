import ArchiveIcon from "@mui/icons-material/Archive";
import CallIcon from "@mui/icons-material/Call";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import LogoutIcon from "@mui/icons-material/Logout";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PaletteIcon from "@mui/icons-material/Palette";
import RemoveIcon from "@mui/icons-material/Remove";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import VideocamIcon from "@mui/icons-material/Videocam";
import {
	Avatar,
	Box,
	Divider,
	IconButton,
	ListItemIcon,
	Menu,
	MenuItem,
	Typography,
} from "@mui/material";
import type { Conversation } from "@/types/messenger";

interface MiniChatWindowHeaderProps {
	title: string;
	avatar: string | undefined;
	conversation: Conversation;
	actionsAnchor: HTMLElement | null;
	onOpenActionsMenu: (event: React.MouseEvent<HTMLElement>) => void;
	onCloseActionsMenu: () => void;
	onMinimize: () => void;
	onClose: () => void;
	onNavigateToMessenger: () => void;
	onOpenCustomize: () => void;
	onOpenNickname: () => void;
	onArchive: () => void;
	onDelete: () => void;
	onLeave: () => void;
	onOpenCreateGroup: () => void;
}

export function MiniChatWindowHeader({
	title,
	avatar,
	conversation,
	actionsAnchor,
	onOpenActionsMenu,
	onCloseActionsMenu,
	onMinimize,
	onClose,
	onNavigateToMessenger,
	onOpenCustomize,
	onOpenNickname,
	onArchive,
	onDelete,
	onLeave,
	onOpenCreateGroup,
}: MiniChatWindowHeaderProps) {
	return (
		<>
			<Box
				sx={{
					height: 56,
					display: "flex",
					alignItems: "center",
					gap: 1,
					px: 1.25,
					borderBottom: "1px solid",
					borderColor: "divider",
				}}
			>
				<Avatar src={avatar} alt={title} sx={{ width: 36, height: 36 }}>
					{title.charAt(0).toUpperCase()}
				</Avatar>
				<Typography
					fontWeight={800}
					noWrap
					sx={{ flex: 1, minWidth: 0, fontSize: 16 }}
				>
					{title}
				</Typography>
				<IconButton
					size="small"
					color="primary"
					onClick={onOpenActionsMenu}
				>
					<KeyboardArrowDownIcon fontSize="small" />
				</IconButton>
				<IconButton size="small" color="primary">
					<CallIcon fontSize="small" />
				</IconButton>
				<IconButton size="small" color="primary">
					<VideocamIcon fontSize="small" />
				</IconButton>
				<IconButton
					size="small"
					color="primary"
					onClick={onMinimize}
					sx={{
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<RemoveIcon fontSize="small" />
				</IconButton>
				<IconButton size="small" color="primary" onClick={onClose}>
					<CloseIcon fontSize="small" />
				</IconButton>
			</Box>

			<Menu
				anchorEl={actionsAnchor}
				open={Boolean(actionsAnchor)}
				onClose={onCloseActionsMenu}
				slotProps={{
					paper: {
						sx: {
							minWidth: 260,
							bgcolor: "#242526",
							color: "#e4e6eb",
							borderRadius: 2,
							boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
							"& .MuiListItemIcon-root": {
								color: "inherit",
								minWidth: 38,
							},
						},
					},
				}}
			>
				<MenuItem
					onClick={() => {
						onCloseActionsMenu();
						onNavigateToMessenger();
					}}
				>
					<ListItemIcon>
						<OpenInNewIcon fontSize="small" />
					</ListItemIcon>
					Open in Messenger
				</MenuItem>
				<Divider sx={{ borderColor: "rgba(255,255,255,0.14)" }} />
				<MenuItem
					onClick={() => {
						onCloseActionsMenu();
						onOpenCustomize();
					}}
				>
					<ListItemIcon>
						<PaletteIcon fontSize="small" />
					</ListItemIcon>
					Theme
				</MenuItem>
				<MenuItem
					onClick={() => {
						onCloseActionsMenu();
						onOpenCustomize();
					}}
				>
					<ListItemIcon>
						<ThumbUpIcon fontSize="small" />
					</ListItemIcon>
					Emoji
				</MenuItem>
				<MenuItem onClick={onOpenNickname}>
					<ListItemIcon>
						<EditIcon fontSize="small" />
					</ListItemIcon>
					Nickname
				</MenuItem>
				<Divider sx={{ borderColor: "rgba(255,255,255,0.14)" }} />
				{conversation.is_group ? (
					<MenuItem onClick={onLeave}>
						<ListItemIcon>
							<LogoutIcon fontSize="small" />
						</ListItemIcon>
						Leave group
					</MenuItem>
				) : (
					<MenuItem
						onClick={() => {
							onCloseActionsMenu();
							onOpenCreateGroup();
						}}
					>
						<ListItemIcon>
							<GroupAddIcon fontSize="small" />
						</ListItemIcon>
						Create group with...
					</MenuItem>
				)}
				<Divider sx={{ borderColor: "rgba(255,255,255,0.14)" }} />
				<MenuItem onClick={onArchive}>
					<ListItemIcon>
						<ArchiveIcon fontSize="small" />
					</ListItemIcon>
					Archive
				</MenuItem>
				<MenuItem onClick={onDelete} sx={{ color: "error.main" }}>
					<ListItemIcon sx={{ color: "error.main !important" }}>
						<DeleteIcon fontSize="small" />
					</ListItemIcon>
					Delete
				</MenuItem>
			</Menu>
		</>
	);
}
