import AddIcon from "@mui/icons-material/Add";
import ArchiveIcon from "@mui/icons-material/Archive";
import UnarchiveIcon from "@mui/icons-material/Unarchive";
import {
	Box,
	Button,
	CircularProgress,
	IconButton,
	List,
	ListItem,
	ListItemText,
	Tab,
	Tabs,
	Tooltip,
	Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import type { Conversation } from "@/types/chat";

type ConversationFilter = "active" | "archived";

interface ConversationSidebarProps {
	conversations: Conversation[];
	selectedConversationId?: string;
	loading: boolean;
	error?: string;
	onSelectConversation: (conversationId: string) => void;
	onCreateConversation: () => void;
	onArchiveToggle: (conversation: Conversation) => void;
}

export const ConversationSidebar = ({
	conversations,
	selectedConversationId,
	loading,
	error,
	onSelectConversation,
	onCreateConversation,
	onArchiveToggle,
}: ConversationSidebarProps) => {
	const [conversationFilter, setConversationFilter] =
		useState<ConversationFilter>("active");

	const activeConversations = useMemo(
		() =>
			conversations.filter(
				(conversation) => !conversation.is_archived && !conversation.deleted_at,
			),
		[conversations],
	);
	const archivedConversations = useMemo(
		() =>
			conversations.filter(
				(conversation) => conversation.is_archived && !conversation.deleted_at,
			),
		[conversations],
	);
	const _deletedConversations = useMemo(
		() =>
			conversations.filter((conversation) => Boolean(conversation.deleted_at)),
		[conversations],
	);

	const filteredConversations = useMemo(() => {
		if (conversationFilter === "archived") return archivedConversations;
		return activeConversations;
	}, [activeConversations, archivedConversations, conversationFilter]);

	return (
		<Box
			sx={{
				width: { xs: "100%", md: 320 },
				minHeight: 0,
				maxHeight: { xs: "40%", md: "100%" },
				borderRight: { xs: "none", md: "1px solid" },
				borderBottom: { xs: "1px solid", md: "none" },
				borderColor: "divider",
				p: 1.5,
				display: "flex",
				flexDirection: "column",
				gap: 1,
				overflow: "hidden",
			}}
		>
			<Button
				variant="contained"
				startIcon={<AddIcon />}
				onClick={onCreateConversation}
				sx={{ textTransform: "none" }}
			>
				Tạo cuộc trò chuyện mới
			</Button>

			<Box
				sx={{
					border: "1px solid",
					borderColor: "divider",
					borderRadius: 1.5,
					overflow: "hidden",
				}}
			>
				<Tabs
					value={conversationFilter}
					onChange={(_event, value: ConversationFilter) =>
						setConversationFilter(value)
					}
					variant="fullWidth"
					sx={{ minHeight: 36 }}
				>
					<Tab
						value="active"
						label={`Gần đây (${activeConversations.length})`}
						sx={{
							minHeight: 36,
							textTransform: "none",
							fontSize: 12,
							fontWeight: 700,
						}}
					/>
					<Tab
						value="archived"
						label={`Đã lưu trữ (${archivedConversations.length})`}
						sx={{
							minHeight: 36,
							textTransform: "none",
							fontSize: 12,
							fontWeight: 700,
						}}
					/>
				</Tabs>
			</Box>

			{loading && (
				<Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
					<CircularProgress size={24} />
				</Box>
			)}

			{!loading && error && (
				<Typography color="error" variant="body2">
					{error}
				</Typography>
			)}

			{!loading && !error && filteredConversations.length === 0 && (
				<Typography color="text.secondary" variant="body2" sx={{ py: 2 }}>
					Không có hội thoại trong nhóm{" "}
					{conversationFilter === "active"
						? "Gần đây"
						: conversationFilter === "archived"
							? "Đã lưu trữ"
							: "Đã xóa"}
					.
				</Typography>
			)}

			{!loading && !error && filteredConversations.length > 0 && (
				<List sx={{ overflowY: "auto", p: 0 }}>
					{filteredConversations.map((conversation) => {
						const isSelected = selectedConversationId === conversation.id;
						const canArchiveToggle = !conversation.deleted_at;
						return (
							<ListItem
								key={conversation.id}
								disablePadding
								sx={{
									mb: 0.5,
									border: "1px solid",
									borderColor: isSelected ? "primary.main" : "divider",
									borderRadius: 1,
									bgcolor: isSelected ? "action.selected" : "transparent",
								}}
								secondaryAction={
									canArchiveToggle ? (
										<Tooltip
											title={
												conversation.is_archived
													? "Khôi phục hội thoại"
													: "Lưu trữ hội thoại"
											}
										>
											<IconButton
												edge="end"
												size="small"
												onClick={() => onArchiveToggle(conversation)}
											>
												{conversation.is_archived ? (
													<UnarchiveIcon fontSize="small" />
												) : (
													<ArchiveIcon fontSize="small" />
												)}
											</IconButton>
										</Tooltip>
									) : undefined
								}
							>
								<Box
									onClick={() => onSelectConversation(conversation.id)}
									sx={{ px: 1.5, py: 1.25, width: "100%", cursor: "pointer" }}
								>
									<ListItemText
										primary={
											<Typography
												variant="body2"
												fontWeight={conversation.is_archived ? 400 : 600}
											>
												{conversation.title || "Cuộc trò chuyện"}
											</Typography>
										}
										secondary={
											<Typography variant="caption" color="text.secondary">
												{conversation.context} •{" "}
												{new Date(conversation.updated_at).toLocaleString(
													"vi-VN",
												)}
											</Typography>
										}
									/>
								</Box>
							</ListItem>
						);
					})}
				</List>
			)}
		</Box>
	);
};
