import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";
import { Box, IconButton, Menu, MenuItem, Typography } from "@mui/material";
import { useState } from "react";
import type { Conversation } from "@/types/chat";

interface ChatHeaderProps {
	conversation?: Conversation;
	onRestore: (conversationId: string) => void;
	onClearHistory: (conversationId: string) => void;
	onDelete: (conversationId: string) => void;
}

export const ChatHeader = ({
	conversation,
	onRestore,
	onClearHistory,
	onDelete,
}: ChatHeaderProps) => {
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

	return (
		<Box
			sx={{
				px: 2,
				py: 1.5,
				borderBottom: "1px solid",
				borderColor: "divider",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
			}}
		>
			<Box>
				<Typography variant="subtitle1" fontWeight={600}>
					{conversation?.title || "AI Chat"}
				</Typography>
				<Typography variant="caption" color="text.secondary">
					Context: {conversation?.context || "general"}
				</Typography>
			</Box>

			{conversation && (
				<>
					<IconButton onClick={(event) => setAnchorEl(event.currentTarget)}>
						<MoreVertIcon />
					</IconButton>
					<Menu
						anchorEl={anchorEl}
						open={Boolean(anchorEl)}
						onClose={() => setAnchorEl(null)}
					>
						{conversation.is_archived && (
							<MenuItem
								onClick={() => {
									onRestore(conversation.id);
									setAnchorEl(null);
								}}
							>
								<RestoreFromTrashIcon fontSize="small" sx={{ mr: 1 }} />
								Restore
							</MenuItem>
						)}
						<MenuItem
							onClick={() => {
								onClearHistory(conversation.id);
								setAnchorEl(null);
							}}
						>
							<DeleteSweepIcon fontSize="small" sx={{ mr: 1 }} />
							Clear history
						</MenuItem>
						<MenuItem
							onClick={() => {
								onDelete(conversation.id);
								setAnchorEl(null);
							}}
						>
							<DeleteOutlineIcon fontSize="small" sx={{ mr: 1 }} />
							Delete conversation
						</MenuItem>
					</Menu>
				</>
			)}
		</Box>
	);
};
