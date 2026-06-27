import AddIcon from "@mui/icons-material/Add";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import DownloadIcon from "@mui/icons-material/Download";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import InfoIcon from "@mui/icons-material/Info";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import NotificationsIcon from "@mui/icons-material/Notifications";
import PaletteIcon from "@mui/icons-material/Palette";
import PeopleIcon from "@mui/icons-material/People";
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt";
import SearchIcon from "@mui/icons-material/Search";
import {
	Box,
	Button,
	Chip,
	Collapse,
	IconButton,
	Menu,
	MenuItem,
	Paper,
	Tab,
	Tabs,
	Tooltip,
	Typography,
} from "@mui/material";
import MessengerCustomizeDialog from "@pages/messenger/dialogs/MessengerCustomizeDialog";
import React, { useMemo, useState } from "react";
import { AdminKeyBadge } from "@/components/messenger/AdminKeyBadge";
import {
	FilePreviewModal,
	getFileExtFromContent,
	getFileIconConfig,
} from "@/components/messenger/dialogs/FilePreviewModal";
import { ImageGalleryModal } from "@/components/messenger/dialogs/ImageGalleryModal";
import { VideoThumb } from "@/components/messenger/message/components/VideoThumb";
import { buildGeneratedAvatar } from "@/components/messenger/messengerUtils";
import { useMessengerPresence } from "@/context/MessengerPresenceContext";
import { useConversationMediaMessages } from "@/hooks/messenger/useConversationMediaMessages";
import type { IUser } from "@/types";
import type { Conversation, Message, Participant } from "@/types/messenger";
import type { ITheme } from "@/types/theme";
import { formatDateTime, resolveCdnUrl } from "@/utils";
import { formatDateV2 } from "@/utils/dateTime";

type InfoPanelProps = {
	open: boolean;
	conversation?: Conversation;
	currentUser?: IUser;
	themePresetId?: string;
	themes?: ITheme[];
	onClose: () => void;
	onMute: () => void;
	onSearch: () => void;
	onRename: (conversation: Conversation, name: string) => Promise<void>;
	onChangeGroupAvatar: (
		conversation: Conversation,
		file: File,
	) => Promise<void>;
	onChangeBackground: (
		conversation: Conversation,
		config: {
			background: string;
			backgroundColor: string;
			incomingBubbleColor: string;
			outgoingBubbleColor: string;
			incomingTextColor: string;
			outgoingTextColor: string;
			presetId?: string;
			themeId?: number;
			themeUrl?: string | File;
		},
	) => Promise<void>;
	onChangeQuickReaction: (
		conversation: Conversation,
		quickReaction: string,
	) => Promise<void>;
	onAddMember: (conversation: Conversation) => void;
	onLeaveConversation: (conversation: Conversation) => void;
	onDeleteConversation: (conversationId: number) => void;
	onEditMemberNickname: (participant: Participant) => void;
	onRemoveMember: (participant: Participant) => void;
	onStartDirectConversation?: (participant: Participant) => void;
	onCreateGroupWithUser?: (otherParticipant: Participant) => void;
};

export function MessengerInfoPanel({
	open,
	conversation,
	currentUser,
	themePresetId,
	themes = [],
	onClose,
	onMute,
	onSearch,
	onRename,
	onChangeGroupAvatar,
	onChangeBackground,
	onAddMember,
	onLeaveConversation,
	onDeleteConversation,
	onEditMemberNickname,
	onRemoveMember,
	onStartDirectConversation,
	onChangeQuickReaction,
	onCreateGroupWithUser,
}: InfoPanelProps) {
	const onlineUserIds = useMessengerPresence();
	const [memberMenuAnchorEl, setMemberMenuAnchorEl] =
		React.useState<HTMLElement | null>(null);
	const [memberMenuParticipant, setMemberMenuParticipant] =
		React.useState<Participant | null>(null);
	const [customizeOpen, setCustomizeOpen] = React.useState(false);
	const [mediaExpanded, setMediaExpanded] = useState(true);
	const [mediaFilter, setMediaFilter] = useState<"image" | "video" | "file">(
		"image",
	);
	const [galleryOpen, setGalleryOpen] = useState(false);
	const [galleryMessageId, setGalleryMessageId] = useState<number | undefined>(
		undefined,
	);
	const [filePreviewOpen, setFilePreviewOpen] = useState(false);
	const [filePreviewMsg, setFilePreviewMsg] = useState<Message | null>(null);

	const { imageData, videoData, fileData } = useConversationMediaMessages(
		conversation?.id,
		open,
	);

	const imageMessages = useMemo(
		() =>
			(imageData?.items ?? [])
				.filter(
					(m: Message) =>
						m.message_type === "image" && !m.content.startsWith("blob:"),
				)
				.sort((a: Message, b: Message) => {
					const diff =
						new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
					return diff !== 0 ? diff : b.id - a.id;
				}),
		[imageData],
	);

	const videoMessages = useMemo(
		() =>
			(videoData?.items ?? [])
				.filter(
					(m: Message) =>
						m.message_type === "video" && !m.content.startsWith("blob:"),
				)
				.sort((a: Message, b: Message) => {
					const diff =
						new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
					return diff !== 0 ? diff : b.id - a.id;
				}),
		[videoData],
	);

	const fileMessages = useMemo(
		() =>
			(fileData?.items ?? [])
				.filter(
					(m: Message) =>
						m.message_type === "file" && !m.content.startsWith("blob:"),
				)
				.sort((a: Message, b: Message) => {
					const diff =
						new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
					return diff !== 0 ? diff : b.id - a.id;
				}),
		[fileData],
	);

	const hasMediaMessages =
		imageMessages.length > 0 ||
		videoMessages.length > 0 ||
		fileMessages.length > 0;
	const activeMediaMessages =
		mediaFilter === "image"
			? imageMessages
			: mediaFilter === "video"
				? videoMessages
				: fileMessages;

	const groupedMedia = useMemo(
		() =>
			activeMediaMessages.reduce(
				(acc: Record<string, Message[]>, msg: Message) => {
					const key = new Date(msg.created_at).toISOString().split("T")[0];
					if (!acc[key]) acc[key] = [];
					acc[key].push(msg);
					return acc;
				},
				{} as Record<string, Message[]>,
			),
		[activeMediaMessages],
	);

	const allMediaMessages = useMemo(
		() =>
			[...imageMessages, ...videoMessages].sort((a, b) => {
				const diff =
					new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
				return diff !== 0 ? diff : b.id - a.id;
			}),
		[imageMessages, videoMessages],
	);

	const handleOpenGallery = (messageId: number) => {
		setGalleryMessageId(messageId);
		setGalleryOpen(true);
	};

	const handleOpenMemberMenu = (
		event: React.MouseEvent<HTMLElement>,
		participant: Participant,
	) => {
		setMemberMenuAnchorEl(event.currentTarget);
		setMemberMenuParticipant(participant);
	};

	const handleCloseMemberMenu = () => {
		setMemberMenuAnchorEl(null);
		setMemberMenuParticipant(null);
	};

	const handleEditMemberNicknameClick = () => {
		if (!memberMenuParticipant) {
			return;
		}
		onEditMemberNickname(memberMenuParticipant);
		handleCloseMemberMenu();
	};

	const handleLeaveGroupClick = () => {
		if (!conversation) {
			return;
		}
		onLeaveConversation(conversation);
		handleCloseMemberMenu();
	};

	const handleRemoveMemberClick = () => {
		if (!memberMenuParticipant) {
			return;
		}
		onRemoveMember(memberMenuParticipant);
		handleCloseMemberMenu();
	};

	const handleStartDirectConversation = () => {
		if (!memberMenuParticipant || !onStartDirectConversation) return;
		if (Number(currentUser?.id) === memberMenuParticipant.id) {
			handleCloseMemberMenu();
			return;
		}
		onStartDirectConversation(memberMenuParticipant);
		handleCloseMemberMenu();
	};

	const isGroup = Boolean(conversation?.is_group);
	const isAdmin = conversation?.created_by === Number(currentUser?.id);
	const isCurrentUserParticipant =
		memberMenuParticipant?.id === Number(currentUser?.id);

	const otherParticipant = useMemo(() => {
		if (isGroup || !conversation) return null;
		return (
			conversation.participants.find((p) => p.id !== Number(currentUser?.id)) ??
			null
		);
	}, [conversation, currentUser?.id, isGroup]);

	if (!open || !conversation) {
		return null;
	}

	return (
		<Paper
			sx={{
				width: 360,
				maxWidth: "100%",
				borderRadius: 0,
				borderLeft: "1px solid",
				borderColor: "divider",
				boxShadow: 24,
				position: "absolute",
				right: 0,
				top: 0,
				bottom: 0,
				zIndex: 120,
				bgcolor: "background.paper",

				display: "flex",
				flexDirection: "column",
			}}
		>
			<Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
				<Box
					sx={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						gap: 1,
					}}
				>
					<Box>
						<Typography variant="h6" fontWeight={700} noWrap>
							{conversation.name || "Cuộc trò chuyện"}
						</Typography>
						<Typography variant="body2" color="text.secondary" noWrap>
							{conversation.is_group
								? `${conversation.participants?.length ?? 0} thành viên`
								: "Trò chuyện riêng"}
						</Typography>
					</Box>
					<IconButton size="small" onClick={onClose}>
						<ArrowBackIosIcon
							sx={{ transform: "rotate(180deg)" }}
							fontSize="small"
						/>
					</IconButton>
				</Box>
				<Box sx={{ display: "flex", justifyContent: "space-around", mt: 2 }}>
					{isGroup ? (
						<Box
							onClick={() => onAddMember(conversation)}
							sx={{
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								gap: 0.75,
								cursor: "pointer",
							}}
						>
							<Box
								sx={{
									width: 44,
									height: 44,
									borderRadius: "50%",
									bgcolor: "action.hover",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									transition: "all 0.2s ease",
									"&:hover": {
										bgcolor: "action.selected",
										transform: "scale(1.05)",
									},
								}}
							>
								<PersonAddAltIcon fontSize="small" />
							</Box>
							<Typography variant="caption">Thêm mới</Typography>
						</Box>
					) : onCreateGroupWithUser && otherParticipant ? (
						<Tooltip
							title={`Tạo nhóm với ${otherParticipant.nickname || otherParticipant.fullname}`}
						>
							<Box
								onClick={() => onCreateGroupWithUser(otherParticipant)}
								sx={{
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									gap: 0.75,
									cursor: "pointer",
								}}
							>
								<Box
									sx={{
										width: 44,
										height: 44,
										borderRadius: "50%",
										bgcolor: "action.hover",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										transition: "all 0.2s ease",
										"&:hover": {
											bgcolor: "action.selected",
											transform: "scale(1.05)",
										},
									}}
								>
									<GroupAddIcon fontSize="small" />
								</Box>
								<Typography
									variant="caption"
									noWrap
									sx={{ maxWidth: 64, textAlign: "center" }}
								>
									Tạo nhóm
								</Typography>
							</Box>
						</Tooltip>
					) : null}
					<Box
						onClick={onMute}
						sx={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: 0.75,
							cursor: "pointer",
						}}
					>
						<Box
							sx={{
								width: 44,
								height: 44,
								borderRadius: "50%",
								bgcolor: "action.hover",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								transition: "all 0.2s ease",
								"&:hover": {
									bgcolor: "action.selected",
									transform: "scale(1.05)",
								},
							}}
						>
							<NotificationsIcon fontSize="small" />
						</Box>
						<Typography variant="caption">Thông báo</Typography>
					</Box>
					<Box
						onClick={onSearch}
						sx={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: 0.75,
							cursor: "pointer",
						}}
					>
						<Box
							sx={{
								width: 44,
								height: 44,
								borderRadius: "50%",
								bgcolor: "action.hover",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								transition: "all 0.2s ease",
								"&:hover": {
									bgcolor: "action.selected",
									transform: "scale(1.05)",
								},
							}}
						>
							<SearchIcon fontSize="small" />
						</Box>
						<Typography variant="caption">Tìm kiếm</Typography>
					</Box>
					<Box
						onClick={() => setCustomizeOpen(true)}
						sx={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: 0.75,
							cursor: "pointer",
						}}
					>
						<Box
							sx={{
								width: 44,
								height: 44,
								borderRadius: "50%",
								bgcolor: "action.hover",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								transition: "all 0.2s ease",
								"&:hover": {
									bgcolor: "action.selected",
									transform: "scale(1.05)",
								},
							}}
						>
							<PaletteIcon fontSize="small" />
						</Box>
						<Typography variant="caption">Tùy chỉnh</Typography>
					</Box>
				</Box>
			</Box>
			<Box
				sx={{
					p: 2,
					flex: 1,
					overflowY: "auto",
				}}
			>
				{isGroup ? (
					<>
						<Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
							<InfoIcon fontSize="small" color="action" />
							<Typography variant="subtitle1" fontWeight={700}>
								Thông tin
							</Typography>
						</Box>
						<Box
							sx={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								gap: 2,
							}}
						>
							<Typography variant="body2">Ngày tạo</Typography>

							<Tooltip
								title={formatDateTime(conversation.created_at)}
								placement="left"
							>
								<Typography variant="body2" fontWeight={500}>
									{formatDateV2(conversation.created_at)}
								</Typography>
							</Tooltip>
						</Box>
					</>
				) : null}
				<Box
					sx={{
						mt: isGroup ? 3 : 0,
						mb: 1,
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: 1,
					}}
				>
					<Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
						<PeopleIcon fontSize="small" color="action" />
						<Typography variant="subtitle1" fontWeight={700}>
							Thành viên
						</Typography>
					</Box>
					{isGroup ? (
						<Button
							size="small"
							variant="text"
							startIcon={<AddIcon fontSize="small" />}
							onClick={() => onAddMember(conversation)}
							sx={{ textTransform: "none" }}
						>
							Thêm mới
						</Button>
					) : null}
				</Box>
				{(conversation.participants || []).map((participant) => (
					<Box
						key={participant.id}
						onClick={(event) => handleOpenMemberMenu(event, participant)}
						sx={{
							display: "flex",
							alignItems: "center",
							gap: 1.5,
							py: 1,
							cursor: "pointer",
						}}
					>
						<Box
							sx={{
								position: "relative",
								width: 32,
								height: 32,
								flexShrink: 0,
							}}
						>
							<AdminKeyBadge
								src={
									resolveCdnUrl(participant.avatar) ||
									buildGeneratedAvatar(
										participant.nickname || participant.fullname,
									)
								}
								fallback={(participant.nickname || participant.fullname || "U")
									.slice(0, 1)
									.toUpperCase()}
								size={32}
								showBadge={
									isGroup &&
									(participant.role === "admin" ||
										conversation.created_by === participant.id)
								}
							/>
							{onlineUserIds.has(Number(participant.id)) && (
								<Box
									aria-label="Đang hoạt động"
									sx={{
										position: "absolute",
										top: -1,
										left: -1,
										width: 10,
										height: 10,
										borderRadius: "50%",
										bgcolor: "success.main",
										border: "2px solid",
										borderColor: "background.paper",
										pointerEvents: "none",
									}}
								/>
							)}
						</Box>
						<Box sx={{ minWidth: 0 }}>
							<Typography variant="body2" noWrap>
								{(() => {
									const nickname = participant.nickname;
									const originalName = participant.fullname;
									if (nickname && nickname !== originalName) {
										return `${nickname} (${originalName})`;
									}
									return originalName || String(participant.id);
								})()}
							</Typography>
							<Typography variant="caption" color="text.secondary" noWrap>
								{participant.id === Number(currentUser?.id)
									? "Bạn"
									: isGroup &&
											(participant.role === "admin" ||
												conversation.created_by === participant.id)
										? "Trưởng nhóm"
										: "Thành viên"}
							</Typography>
						</Box>
						<IconButton
							size="small"
							sx={{ ml: "auto" }}
							onClick={(event) => handleOpenMemberMenu(event, participant)}
						>
							<MoreVertIcon fontSize="small" />
						</IconButton>
					</Box>
				))}
				<Menu
					anchorEl={memberMenuAnchorEl}
					open={Boolean(memberMenuAnchorEl)}
					onClose={handleCloseMemberMenu}
				>
					{memberMenuParticipant &&
						Number(memberMenuParticipant.id) !== Number(currentUser?.id) &&
						isGroup && (
							<MenuItem onClick={handleStartDirectConversation}>
								Trò chuyện trực tiếp
							</MenuItem>
						)}
					<MenuItem onClick={handleEditMemberNicknameClick}>
						Đổi nickname
					</MenuItem>
					{memberMenuParticipant ? (
						isCurrentUserParticipant && isGroup ? (
							<MenuItem
								onClick={handleLeaveGroupClick}
								sx={{ color: "error.main" }}
							>
								Rời khỏi nhóm
							</MenuItem>
						) : isGroup && isAdmin ? (
							<MenuItem
								onClick={handleRemoveMemberClick}
								sx={{ color: "error.main" }}
							>
								Xóa khỏi nhóm
							</MenuItem>
						) : null
					) : null}
				</Menu>

				{/* Ảnh & Video */}
				{hasMediaMessages && (
					<Box sx={{ mt: 3 }}>
						<Box
							onClick={() => setMediaExpanded((v) => !v)}
							sx={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								cursor: "pointer",
								mb: 1,
							}}
						>
							<Box
								sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0 }}
							>
								<AttachFileIcon fontSize="small" color="action" />
								<Typography variant="subtitle1" fontWeight={700}>
									Đính kèm
								</Typography>
							</Box>
							<Typography variant="caption" color="text.secondary">
								{mediaExpanded ? "Thu gọn" : "Mở rộng"}
							</Typography>
						</Box>

						<Collapse in={mediaExpanded}>
							{/* Filter tabs */}
							<Box sx={{ mb: 1.5 }}>
								<Tabs
									value={mediaFilter}
									onChange={(_, v) => setMediaFilter(v)}
									variant="fullWidth"
									sx={{
										minHeight: 32,
										borderBottom: 1,
										borderColor: "divider",
									}}
								>
									<Tab
										value="image"
										label={
											<Box
												sx={{
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													gap: 0.5,
													width: "100%",
												}}
											>
												Ảnh
												{imageMessages.length > 0 && (
													<Chip
														label={imageMessages.length}
														size="small"
														sx={{
															height: 16,
															fontSize: 10,
															bgcolor:
																mediaFilter === "image"
																	? "primary.main"
																	: "action.selected",
															color:
																mediaFilter === "image"
																	? "primary.contrastText"
																	: "text.secondary",
															"& .MuiChip-label": {
																px: 0.75,
															},
														}}
													/>
												)}
											</Box>
										}
										sx={{
											minHeight: 32,
											textTransform: "none",
											fontSize: 12,
											fontWeight: 700,
										}}
									/>
									<Tab
										value="video"
										label={
											<Box
												sx={{
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													gap: 0.5,
													width: "100%",
												}}
											>
												Video
												{videoMessages.length > 0 && (
													<Chip
														label={videoMessages.length}
														size="small"
														sx={{
															height: 16,
															fontSize: 10,
															bgcolor:
																mediaFilter === "video"
																	? "primary.main"
																	: "action.selected",
															color:
																mediaFilter === "video"
																	? "primary.contrastText"
																	: "text.secondary",
															"& .MuiChip-label": {
																px: 0.75,
															},
														}}
													/>
												)}
											</Box>
										}
										sx={{
											minHeight: 32,
											textTransform: "none",
											fontSize: 12,
											fontWeight: 700,
										}}
									/>
									<Tab
										value="file"
										label={
											<Box
												sx={{
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													gap: 0.5,
													width: "100%",
												}}
											>
												File
												{fileMessages.length > 0 && (
													<Chip
														label={fileMessages.length}
														size="small"
														sx={{
															height: 16,
															fontSize: 10,
															bgcolor:
																mediaFilter === "file"
																	? "primary.main"
																	: "action.selected",
															color:
																mediaFilter === "file"
																	? "primary.contrastText"
																	: "text.secondary",
															"& .MuiChip-label": {
																px: 0.75,
															},
														}}
													/>
												)}
											</Box>
										}
										sx={{
											minHeight: 32,
											textTransform: "none",
											fontSize: 12,
											fontWeight: 700,
										}}
									/>
								</Tabs>
							</Box>

							{mediaFilter === "file" ? (
								fileMessages.length === 0 ? (
									<Typography
										variant="caption"
										color="text.secondary"
										sx={{ display: "block", textAlign: "center", py: 2 }}
									>
										Không có file nào
									</Typography>
								) : (
									<Box
										sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
									>
										{fileMessages.map((msg) => {
											const fileName =
												msg.metadata?.original_name ||
												msg.content.split("/").pop() ||
												"file";
											const fileSize = msg.metadata?.size;
											const sizeLabel = fileSize
												? fileSize >= 1024 * 1024
													? `${(fileSize / (1024 * 1024)).toFixed(1)} MB`
													: `${Math.ceil(fileSize / 1024)} KB`
												: null;
											const fileExt = getFileExtFromContent(
												msg.content,
												msg.metadata?.original_name,
											);
											const iconCfg = getFileIconConfig(fileExt);
											return (
												<Box
													key={msg.id}
													onClick={() => {
														setFilePreviewMsg(msg);
														setFilePreviewOpen(true);
													}}
													sx={{
														display: "flex",
														alignItems: "center",
														gap: 1.5,
														p: 1,
														borderRadius: 1,
														border: "1px solid",
														borderColor: "divider",
														cursor: "pointer",
														color: "text.primary",
														"&:hover": {
															bgcolor: "action.hover",
															"& .file-download-btn": {
																opacity: 1,
																transform: "scale(1.15)",
															},
														},
													}}
												>
													<Box
														sx={{
															width: 36,
															height: 36,
															borderRadius: 1,
															bgcolor: iconCfg.color,
															display: "flex",
															alignItems: "center",
															justifyContent: "center",
															flexShrink: 0,
														}}
													>
														{iconCfg.icon}
													</Box>
													<Box sx={{ minWidth: 0, flex: 1 }}>
														<Typography variant="body2" noWrap title={fileName}>
															{fileName}
														</Typography>
														<Typography
															variant="caption"
															color="text.secondary"
															sx={{ display: "block" }}
														>
															{iconCfg.label}
															{sizeLabel ? ` · ${sizeLabel}` : ""}
														</Typography>
														<Typography
															variant="caption"
															color="text.secondary"
															sx={{ display: "block" }}
														>
															{formatDateV2(
																new Date(msg.created_at)
																	.toISOString()
																	.split("T")[0],
															)}
														</Typography>
													</Box>
													<DownloadIcon
														className="file-download-btn"
														fontSize="small"
														color="action"
														sx={{
															flexShrink: 0,
															opacity: 0,
															transition:
																"opacity 0.2s ease, transform 0.2s ease",
														}}
													/>
												</Box>
											);
										})}
									</Box>
								)
							) : activeMediaMessages.length === 0 ? (
								<Typography
									variant="caption"
									color="text.secondary"
									sx={{ display: "block", textAlign: "center", py: 2 }}
								>
									Không có {mediaFilter === "image" ? "ảnh" : "video"} nào
								</Typography>
							) : (
								Object.entries(groupedMedia)
									.sort(([a], [b]) => b.localeCompare(a))
									.map(([dateKey, items]) => (
										<Box key={dateKey} sx={{ mb: 1.5 }}>
											<Typography
												variant="caption"
												color="text.secondary"
												sx={{
													display: "block",
													mb: 0.75,
													fontWeight: 600,
												}}
											>
												{formatDateV2(dateKey)}
											</Typography>
											<Box
												sx={{
													display: "grid",
													gridTemplateColumns: "repeat(3, 1fr)",
													gap: 0.5,
												}}
											>
												{items.map((msg) => (
													<Box
														key={msg.id}
														onClick={() => handleOpenGallery(msg.id)}
														sx={{
															aspectRatio: "1",
															borderRadius: 1,
															overflow: "hidden",
															cursor: "pointer",
															position: "relative",
															bgcolor: "action.hover",
															"&:hover": { opacity: 0.85 },
														}}
													>
														{msg.message_type === "video" ? (
															<VideoThumb
																src={resolveCdnUrl(msg.content)}
																duration={msg.metadata?.duration}
															/>
														) : (
															<img
																src={resolveCdnUrl(msg.content)}
																alt=""
																style={{
																	width: "100%",
																	height: "100%",
																	objectFit: "fill",
																	display: "block",
																	transition: "opacity 0.15s",
																}}
															/>
														)}
													</Box>
												))}
											</Box>
										</Box>
									))
							)}
						</Collapse>
					</Box>
				)}
			</Box>

			<Box
				sx={{
					p: 2,
					borderTop: "1px solid",
					borderColor: "divider",
				}}
			>
				{isGroup ? (
					<Box sx={{ display: "flex", gap: 1 }}>
						<Button
							fullWidth
							color="error"
							variant="outlined"
							onClick={() => onLeaveConversation(conversation)}
						>
							Rời nhóm
						</Button>

						<Button
							fullWidth
							color="error"
							variant="contained"
							onClick={() => onDeleteConversation(conversation.id)}
						>
							Xóa
						</Button>
					</Box>
				) : (
					<Button
						fullWidth
						color="error"
						variant="contained"
						onClick={() => onDeleteConversation(conversation.id)}
					>
						Xóa cuộc trò chuyện
					</Button>
				)}
			</Box>

			<MessengerCustomizeDialog
				key={`${conversation.id}-${String(customizeOpen)}`}
				open={customizeOpen}
				conversation={conversation}
				initialThemePresetId={themePresetId}
				themes={themes}
				onClose={() => setCustomizeOpen(false)}
				onRename={onRename}
				onChangeGroupAvatar={onChangeGroupAvatar}
				onChangeBackground={onChangeBackground}
				onChangeQuickReaction={onChangeQuickReaction}
			/>

			<ImageGalleryModal
				open={galleryOpen}
				onClose={() => setGalleryOpen(false)}
				messages={allMediaMessages}
				initialMessageId={galleryMessageId}
			/>

			{filePreviewMsg && (
				<FilePreviewModal
					open={filePreviewOpen}
					onClose={() => setFilePreviewOpen(false)}
					fileUrl={resolveCdnUrl(filePreviewMsg.content)}
					filename={
						filePreviewMsg.metadata?.original_name ||
						filePreviewMsg.content.split("/").pop() ||
						"file"
					}
					fileExt={getFileExtFromContent(
						filePreviewMsg.content,
						filePreviewMsg.metadata?.original_name,
					)}
				/>
			)}
		</Paper>
	);
}
