import { MessengerConversationList } from "@components/messenger";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import CloseIcon from "@mui/icons-material/Close";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import RateReviewIcon from "@mui/icons-material/RateReview";
import SearchIcon from "@mui/icons-material/Search";
import {
	Avatar,
	Box,
	CircularProgress,
	IconButton,
	InputAdornment,
	List,
	ListItemAvatar,
	ListItemButton,
	ListItemText,
	Menu,
	MenuItem,
	Tab,
	Tabs,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import type { MouseEvent, SyntheticEvent } from "react";
import { memo, useRef, useState } from "react";
import {
	buildGeneratedAvatar,
	getConversationDisplayName,
} from "@/components/messenger/messengerUtils";
import { useMessengerConversationTyping } from "@/hooks/messenger/useMessengerConversationTyping";
import type { MessengerWebSocketService } from "@/services/messengerWebSocketService";
import type { Conversation, Message, User } from "@/types/messenger";
import { resolveCdnUrl } from "@/utils";

export type SearchResultGroup = {
	conversationId: number;
	totalMatched: number;
	latestMessage: Message;
};

type Props = {
	isMobile: boolean;
	isSidebarCollapsed: boolean;
	conversationTab: "active" | "unread" | "archived";
	activeConversations: Conversation[];
	unreadConversations: Conversation[];
	archivedConversations: Conversation[];
	visibleConversations: Conversation[];
	selectedConversationId: number | null;
	searchAllKeyword: string;
	searchAllLoading: boolean;
	isSidebarSearching: boolean;
	searchGroupedResults: SearchResultGroup[];
	searchAllUserResults: User[];
	onSearchKeywordChange: (value: string) => void;
	onExitSidebarSearch: () => void;
	onChangeConversationTab: (
		event: SyntheticEvent,
		value: "active" | "unread" | "archived",
	) => void;
	onSelectSearchConversationGroup: (conversationId: number) => void;
	onSelectUser: (user: User) => void;
	onOpenUserSearch: () => void;
	onOpenCreateGroupDialog: () => void;
	onSelectConversation: (conversationId: number) => void;
	onArchiveToggle: (conversation: Conversation) => void;
	onDelete: (conversationId: number) => void;
	onToggleNotifications: (conversation: Conversation) => void;
	onLeaveConversation: (conversation: Conversation) => void;
	onToggleSidebarCollapse: () => void;
	currentUserId: number;
	loading: boolean;
	ws?: MessengerWebSocketService | null;
	hasMoreConversations?: boolean;
	loadingMoreConversations?: boolean;
	onLoadMoreConversations?: () => void;
};

const highlightRegex = (keyword: string) => {
	const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return new RegExp(`(${escaped})`, "ig");
};

const renderHighlightedText = (text: string, keyword: string) => {
	const normalizedKeyword = keyword.trim();
	if (!normalizedKeyword) {
		return text;
	}

	const parts = text.split(highlightRegex(normalizedKeyword));
	return parts.map((part, index) =>
		part.toLowerCase() === normalizedKeyword.toLowerCase() ? (
			<Box
				// biome-ignore lint/suspicious/noArrayIndexKey: split text fragments are deterministic and never reordered
				key={`${part}-${index}`}
				component="mark"
				sx={{ px: 0.25, borderRadius: 0.5, bgcolor: "warning.light" }}
			>
				{part}
			</Box>
		) : (
			// biome-ignore lint/suspicious/noArrayIndexKey: split text fragments are deterministic and never reordered
			<Box key={`${part}-${index}`} component="span">
				{part}
			</Box>
		),
	);
};

export const MessengerSidebar = memo(
	({
		isMobile,
		isSidebarCollapsed,
		conversationTab,
		activeConversations,
		unreadConversations,
		archivedConversations,
		visibleConversations,
		selectedConversationId,
		searchAllKeyword,
		searchAllLoading,
		isSidebarSearching,
		searchGroupedResults,
		searchAllUserResults,
		onSearchKeywordChange,
		onExitSidebarSearch,
		onChangeConversationTab,
		onSelectSearchConversationGroup,
		onSelectUser,
		onOpenUserSearch,
		onOpenCreateGroupDialog,
		onSelectConversation,
		onArchiveToggle,
		onDelete,
		onToggleNotifications,
		onLeaveConversation,
		onToggleSidebarCollapse,
		currentUserId,
		loading,
		ws,
		hasMoreConversations,
		loadingMoreConversations,
		onLoadMoreConversations,
	}: Props) => {
		const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
		const lastLoadScrollHeightRef = useRef(0);
		const typingByConversation = useMessengerConversationTyping(ws ?? null);
		const openMenu = Boolean(anchorEl);

		const handleOpenMenu = (event: MouseEvent<HTMLElement>) => {
			setAnchorEl(event.currentTarget);
		};

		const handleCloseMenu = () => {
			setAnchorEl(null);
		};

		return (
			<Box
				sx={{
					width: isMobile ? "100%" : isSidebarCollapsed ? 80 : 400,
					height: "100%",
					overflow: "hidden",
					bgcolor: "background.paper",
					borderRadius: 0,
					boxShadow: 1,

					borderLeft: 1,
					borderRight: 1,
					borderColor: "divider",

					transition: "width 240ms cubic-bezier(0.4, 0, 0.2, 1)",
					display: "flex",
					flexDirection: "column",
					position: isMobile ? "relative" : "static",
					zIndex: isMobile ? 5 : "auto",
				}}
			>
				<Box
					sx={{
						px: 1.5,
						py: 2,
						display: "flex",
						flexDirection: "column",
						gap: 1,
					}}
				>
					<Box
						sx={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: 1,
						}}
					>
						{!isSidebarCollapsed ? (
							<>
								<Typography
									variant="h5"
									sx={{ fontWeight: 700, letterSpacing: 0.2 }}
								>
									Tin nhắn
								</Typography>
								<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
									<Tooltip title="Tạo nhóm mới">
										<IconButton
											onClick={onOpenCreateGroupDialog}
											sx={{
												width: 36,
												height: 36,
												bgcolor: "action.selected",
												color: "text.primary",
												"&:hover": { bgcolor: "action.hover" },
											}}
										>
											<GroupAddIcon fontSize="small" />
										</IconButton>
									</Tooltip>
									<Tooltip title="Tin nhắn mới">
										<IconButton
											onClick={onOpenUserSearch}
											sx={{
												width: 36,
												height: 36,
												bgcolor: "action.selected",
												color: "text.primary",
												"&:hover": { bgcolor: "action.hover" },
											}}
										>
											<RateReviewIcon fontSize="small" />
										</IconButton>
									</Tooltip>
									{!isMobile && (
										<IconButton size="small" onClick={onToggleSidebarCollapse}>
											<MenuOpenIcon />
										</IconButton>
									)}
								</Box>
							</>
						) : (
							<Box
								sx={{
									width: "100%",
									display: "flex",
									flexDirection: "row",
									justifyContent: "center",
									alignItems: "center",
									gap: 0.5,
								}}
							>
								<Tooltip title="Tạo mới" placement="bottom">
									<IconButton
										onClick={handleOpenMenu}
										sx={{
											width: 34,
											height: 34,
											color: "text.primary",
											"&:hover": { bgcolor: "action.hover" },
										}}
									>
										<MoreVertIcon fontSize="small" />
									</IconButton>
								</Tooltip>
								<Tooltip title="Mở rộng" placement="bottom">
									<IconButton size="small" onClick={onToggleSidebarCollapse}>
										<MenuOpenIcon sx={{ transform: "rotate(180deg)" }} />
									</IconButton>
								</Tooltip>
							</Box>
						)}
					</Box>
					{!isSidebarCollapsed ? (
						<Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
							{isSidebarSearching && (
								<IconButton
									size="small"
									onClick={onExitSidebarSearch}
									sx={{
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										width: 32,
										height: 32,
										flexShrink: 0,
									}}
								>
									<ArrowBackIosIcon fontSize="small" sx={{ ml: 0.5 }} />
								</IconButton>
							)}
							<TextField
								size="small"
								fullWidth
								placeholder="Tìm kiếm ..."
								value={searchAllKeyword}
								onChange={(event) => onSearchKeywordChange(event.target.value)}
								InputProps={{
									startAdornment: (
										<InputAdornment position="start">
											<SearchIcon
												fontSize="small"
												sx={{ color: "text.secondary" }}
											/>
										</InputAdornment>
									),
									endAdornment: (
										<InputAdornment position="end">
											{searchAllLoading ? (
												<CircularProgress size={16} />
											) : searchAllKeyword.trim() ? (
												<IconButton size="small" onClick={onExitSidebarSearch}>
													<CloseIcon fontSize="small" />
												</IconButton>
											) : null}
										</InputAdornment>
									),
								}}
								sx={{
									"& .MuiOutlinedInput-root": {
										borderRadius: 999,
										bgcolor: "action.selected",
										minHeight: 40,
										"& fieldset": { border: "none" },
									},
									"& input::placeholder": { opacity: 0.9 },
								}}
							/>
						</Box>
					) : null}
					{!isSidebarCollapsed && !isSidebarSearching && (
						<Tabs
							value={conversationTab}
							onChange={(event, value) =>
								onChangeConversationTab(
									event,
									value as "active" | "unread" | "archived",
								)
							}
							variant="fullWidth"
							sx={{ minHeight: 36 }}
						>
							<Tab
								value="active"
								label={`Tất cả (${activeConversations.length})`}
								sx={{
									minHeight: 36,
									textTransform: "none",
									fontSize: 12,
									fontWeight: 700,
								}}
							/>
							<Tab
								value="unread"
								label={`Chưa đọc (${unreadConversations.length})`}
								sx={{
									minHeight: 36,
									textTransform: "none",
									fontSize: 12,
									fontWeight: 700,
								}}
							/>
							<Tab
								value="archived"
								label={`Lưu trữ (${archivedConversations.length})`}
								sx={{
									minHeight: 36,
									textTransform: "none",
									fontSize: 12,
									fontWeight: 700,
								}}
							/>
						</Tabs>
					)}
				</Box>
				<Box
					sx={{ flex: 1, overflowY: "auto" }}
					onScroll={(event) => {
						if (
							isSidebarSearching ||
							!onLoadMoreConversations ||
							loadingMoreConversations ||
							!hasMoreConversations
						) {
							return;
						}
						const el = event.currentTarget;
						const distanceFromBottom =
							el.scrollHeight - el.scrollTop - el.clientHeight;
						if (distanceFromBottom > 160) {
							lastLoadScrollHeightRef.current = 0;
							return;
						}
						if (
							el.scrollTop > 0 &&
							distanceFromBottom < 100 &&
							lastLoadScrollHeightRef.current !== el.scrollHeight
						) {
							lastLoadScrollHeightRef.current = el.scrollHeight;
							onLoadMoreConversations();
						}
					}}
				>
					{isSidebarSearching ? (
						<List sx={{ width: "100%" }}>
							{searchGroupedResults.length > 0 ? (
								<>
									<Box sx={{ p: 1, pb: 1 }}>
										<Typography
											variant="subtitle2"
											color="text.secondary"
											sx={{
												textTransform: "uppercase",
												fontSize: 12,
												fontWeight: 700,
												textAlign: isSidebarCollapsed ? "center" : "left",
											}}
										>
											Tin nhắn
										</Typography>
									</Box>
									{searchGroupedResults.map((group) => {
										const conversation = visibleConversations.find(
											(conv) => conv.id === group.conversationId,
										);
										const conversationName = getConversationDisplayName(
											conversation,
											group.conversationId,
										);
										const conversationAvatar = conversation
											? resolveCdnUrl(conversation.avatar) ||
												buildGeneratedAvatar(conversationName)
											: buildGeneratedAvatar(
													`Conversation #${group.conversationId}`,
												);
										return (
											<ListItemButton
												key={`group-${group.conversationId}`}
												onClick={() =>
													onSelectSearchConversationGroup(group.conversationId)
												}
												sx={{
													py: 1.25,
													px: isSidebarCollapsed ? 1 : 2,
													justifyContent: isSidebarCollapsed
														? "center"
														: "flex-start",
												}}
											>
												<ListItemAvatar
													sx={{ minWidth: isSidebarCollapsed ? 0 : 48 }}
												>
													<Avatar src={conversationAvatar} />
												</ListItemAvatar>
												{!isSidebarCollapsed ? (
													<ListItemText
														primary={
															<Typography
																variant="subtitle2"
																sx={{ lineHeight: 1.2 }}
															>
																{renderHighlightedText(
																	conversationName,
																	searchAllKeyword,
																)}
															</Typography>
														}
														secondary={
															<Box sx={{ mt: 0.3 }}>
																<Typography
																	variant="caption"
																	color="text.secondary"
																	sx={{ display: "block", lineHeight: 1.2 }}
																>
																	{group.totalMatched} tin nhắn
																</Typography>
															</Box>
														}
													/>
												) : null}
											</ListItemButton>
										);
									})}
								</>
							) : null}
							{searchAllUserResults.length > 0 ? (
								<>
									<Box sx={{ p: 1, pt: 3 }}>
										<Typography
											variant="subtitle2"
											color="text.secondary"
											sx={{
												textTransform: "uppercase",
												fontSize: 12,
												fontWeight: 700,
												textAlign: isSidebarCollapsed ? "center" : "left",
											}}
										>
											Người dùng
										</Typography>
									</Box>
									{searchAllUserResults.map((user) => (
										<ListItemButton
											key={`user-${user.id}`}
											onClick={() => onSelectUser(user)}
											sx={{
												py: 1.25,
												px: isSidebarCollapsed ? 1 : 2,
												justifyContent: isSidebarCollapsed
													? "center"
													: "flex-start",
											}}
										>
											<ListItemAvatar
												sx={{ minWidth: isSidebarCollapsed ? 0 : 48 }}
											>
												<Avatar src={resolveCdnUrl(user.avatar)}>
													{(user.first_name || user.username || "U")
														.slice(0, 1)
														.toUpperCase()}
												</Avatar>
											</ListItemAvatar>
											{!isSidebarCollapsed ? (
												<ListItemText
													primary={
														<Typography
															variant="subtitle2"
															sx={{ lineHeight: 1.2 }}
														>
															{renderHighlightedText(
																user.first_name ||
																	user.username ||
																	"Người dùng",
																searchAllKeyword,
															)}
														</Typography>
													}
												/>
											) : null}
										</ListItemButton>
									))}
								</>
							) : null}
							{!searchAllLoading &&
							searchGroupedResults.length === 0 &&
							searchAllUserResults.length === 0 ? (
								<Typography
									variant="caption"
									color="text.secondary"
									sx={{ px: 2, py: 1, display: "block" }}
								>
									Không tìm thấy kết quả
								</Typography>
							) : null}
						</List>
					) : (
						<MessengerConversationList
							conversations={visibleConversations}
							selectedId={selectedConversationId}
							currentUserId={currentUserId}
							typingByConversation={typingByConversation}
							loading={loading}
							compact={!isMobile && isSidebarCollapsed}
							onSelect={onSelectConversation}
							onArchiveToggle={onArchiveToggle}
							onDelete={onDelete}
							onToggleNotifications={onToggleNotifications}
							onLeaveConversation={onLeaveConversation}
							hasMore={hasMoreConversations}
							loadingMore={loadingMoreConversations}
							onLoadMore={onLoadMoreConversations}
						/>
					)}
				</Box>

				<Menu
					anchorEl={anchorEl}
					open={openMenu}
					onClose={handleCloseMenu}
					anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
					transformOrigin={{ vertical: "top", horizontal: "left" }}
				>
					<MenuItem
						onClick={() => {
							onOpenCreateGroupDialog();
							handleCloseMenu();
						}}
					>
						<GroupAddIcon fontSize="small" sx={{ mr: 1.5 }} />
						<Typography variant="body2">Tạo nhóm mới</Typography>
					</MenuItem>
					<MenuItem
						onClick={() => {
							onOpenUserSearch();
							handleCloseMenu();
						}}
					>
						<RateReviewIcon fontSize="small" sx={{ mr: 1.5 }} />
						<Typography variant="body2">Tin nhắn mới</Typography>
					</MenuItem>
				</Menu>
			</Box>
		);
	},
);
