import {
	buildGeneratedAvatar,
	getConversationAvatar,
	getConversationDisplayName,
} from "@components/messenger/messengerUtils";
import type { MessengerHeaderProps } from "@components/messenger/types/components";
import {
	averageGradientColors,
	parseColorToRgb,
} from "@components/messenger/utils/color";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import CallIcon from "@mui/icons-material/Call";
import GroupIcon from "@mui/icons-material/Group";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import SearchIcon from "@mui/icons-material/Search";
import VideocamIcon from "@mui/icons-material/Videocam";
import {
	Avatar,
	Box,
	IconButton,
	ListItemIcon,
	Menu,
	MenuItem,
	Tooltip,
	Typography,
	useMediaQuery,
	useTheme,
} from "@mui/material";
import { useState } from "react";
import { useMessengerPresence } from "@/context/MessengerPresenceContext";
import { resolveCdnUrl } from "@/utils";

export const MessengerHeader = ({
	conversation,
	currentUser,
	useDefaultTheme = true,
	chatSurface,
	outgoingTextColor,
	onInfo,
	onSearch,
	onMute,
	onAudioCall,
	onVideoCall,
	callDisabled,
	callDisabledReason,
	showBackButton = false,
	onBack,
	overrideTextColor,
}: MessengerHeaderProps) => {
	const muiTheme = useTheme();
	const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));
	const onlineUserIds = useMessengerPresence();
	const [moreMenuAnchor, setMoreMenuAnchor] = useState<HTMLElement | null>(null);
	const currentUserId = Number(currentUser?.id ?? 0);
	const displayName = conversation
		? getConversationDisplayName(conversation, currentUserId)
		: "";
	const avatarSrc =
		(conversation
			? resolveCdnUrl(getConversationAvatar(conversation, currentUserId))
			: null) || buildGeneratedAvatar(displayName);
	const participantsCount = conversation?.participants?.length ?? 0;
	const isPeerOnline =
		Boolean(conversation && !conversation.is_group) &&
		Boolean(
			conversation?.participants?.some(
				(participant) =>
					Number(participant.id) !== currentUserId &&
					onlineUserIds.has(Number(participant.id)),
			),
		);
	const customBorderColor = chatSurface ? "rgba(148,163,184,0.35)" : "divider";
	const isNotificationEnabled = conversation?.notifications_enabled ?? false;

	const avg = parseColorToRgb(averageGradientColors(chatSurface ?? undefined));
	let headerColorChoices: {
		title: string;
		subtitle: string;
		icon: string;
		border: string;
	};
	if (overrideTextColor) {
		headerColorChoices = {
			title: overrideTextColor,
			subtitle: overrideTextColor,
			icon: overrideTextColor,
			border: customBorderColor,
		};
	} else if (avg) {
		const computedLuminance =
			(0.2126 * avg.r + 0.7152 * avg.g + 0.0722 * avg.b) / 255;
		const isLight = computedLuminance > 0.56;
		headerColorChoices = {
			title: isLight ? "text.primary" : "#fff",
			subtitle: isLight ? "text.secondary" : "rgba(255,255,255,0.72)",
			icon: isLight ? "text.primary" : "rgba(255,255,255,0.92)",
			border: isLight ? "divider" : customBorderColor,
		};
	} else {
		headerColorChoices = {
			title: "text.primary",
			subtitle: "text.secondary",
			icon: "text.primary",
			border: customBorderColor,
		};
	}

	return (
		<Box
			onClick={onInfo}
			sx={{
				px: 2,
				py: 1.5,
				position: "relative",
				zIndex: 10,
				bgcolor: "transparent",
				color: conversation?.outgoing_text_color || "text.primary",
				borderBottom: "1px solid",
				borderColor: useDefaultTheme ? "divider" : customBorderColor,
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: 2,
				transition: "all 0.25s ease",
				cursor: "pointer",
				"& .MuiIconButton-root, & .MuiSvgIcon-root": { color: "inherit" },
			}}
		>
			{/* LEFT */}
			<Box sx={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0 }}>
				{showBackButton && onBack ? (
					<IconButton
						onClick={onBack}
						size="small"
						sx={{ color: headerColorChoices.icon }}
					>
						<ArrowBackIosIcon fontSize="small" />
					</IconButton>
				) : null}

				<Box sx={{ position: "relative", width: 48, height: 48, flexShrink: 0 }}>
					<Avatar
						src={avatarSrc}
						sx={{
							width: 48,
							height: 48,
							border: !useDefaultTheme ? "1px solid" : undefined,
							borderColor: !useDefaultTheme
								? headerColorChoices.border
								: undefined,
						}}
					>
						{conversation?.is_group && !avatarSrc ? (
							<GroupIcon fontSize="medium" />
						) : (
							displayName.charAt(0).toUpperCase()
						)}
					</Avatar>
					{isPeerOnline && (
						<Box
							aria-label="Đang hoạt động"
							sx={{
								position: "absolute",
								top: -1,
								right: -1,
								width: 12,
								height: 12,
								borderRadius: "50%",
								bgcolor: "success.main",
								border: "2px solid",
								borderColor: useDefaultTheme
									? "background.paper"
									: headerColorChoices.border,
								pointerEvents: "none",
							}}
						/>
					)}
				</Box>

				<Box sx={{ minWidth: 0 }}>
					<Typography
						variant="subtitle1"
						fontWeight={700}
						noWrap
						sx={{ color: outgoingTextColor }}
					>
						{displayName || "Cuộc trò chuyện"}
					</Typography>
					{conversation ? (
						<Typography
							variant="body2"
							noWrap
							sx={{ color: outgoingTextColor, opacity: 0.5 }}
						>
							{conversation.is_group
								? `${participantsCount} thành viên`
								: "Trò chuyện riêng"}
						</Typography>
					) : null}
				</Box>
			</Box>

			{/* RIGHT */}
			<Box
				onClick={(e) => e.stopPropagation()}
				sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}
			>
				{/* Desktop: show all icons */}
				{!isMobile && (
					<>
						<Tooltip title={callDisabled ? (callDisabledReason ?? "Chỉ hỗ trợ cuộc trò chuyện 1-1") : "Gọi thoại"}>
							<span>
								<IconButton
									size="small"
									disabled={callDisabled}
									onClick={onAudioCall}
									sx={(theme) => ({
										color: outgoingTextColor || theme.palette.primary.main,
									})}
								>
									<CallIcon />
								</IconButton>
							</span>
						</Tooltip>

						<Tooltip title={callDisabled ? (callDisabledReason ?? "Chỉ hỗ trợ cuộc trò chuyện 1-1") : "Gọi video"}>
							<span>
								<IconButton
									size="small"
									disabled={callDisabled}
									onClick={onVideoCall}
									sx={(theme) => ({
										color: outgoingTextColor || theme.palette.primary.main,
									})}
								>
									<VideocamIcon />
								</IconButton>
							</span>
						</Tooltip>

						<IconButton
							size="small"
							onClick={onMute}
							sx={(theme) => ({
								color: outgoingTextColor || theme.palette.primary.main,
							})}
						>
							{isNotificationEnabled ? <NotificationsIcon /> : <NotificationsOffIcon />}
						</IconButton>

						<IconButton
							size="small"
							onClick={onSearch}
							sx={(theme) => ({
								color: outgoingTextColor || theme.palette.primary.main,
							})}
						>
							<SearchIcon />
						</IconButton>

						<IconButton
							size="small"
							onClick={onInfo}
							sx={(theme) => ({
								color: outgoingTextColor || theme.palette.primary.main,
							})}
						>
							<InfoOutlinedIcon />
						</IconButton>
					</>
				)}

				{/* Mobile: Audio/Video call visible, Search + Notification + Info in overflow menu */}
				{isMobile && (
					<>
						<Tooltip title={callDisabled ? (callDisabledReason ?? "Chỉ hỗ trợ cuộc trò chuyện 1-1") : "Gọi thoại"}>
							<span>
								<IconButton
									size="small"
									disabled={callDisabled}
									onClick={onAudioCall}
									sx={(theme) => ({
										color: outgoingTextColor || theme.palette.primary.main,
									})}
								>
									<CallIcon />
								</IconButton>
							</span>
						</Tooltip>

						<Tooltip title={callDisabled ? (callDisabledReason ?? "Chỉ hỗ trợ cuộc trò chuyện 1-1") : "Gọi video"}>
							<span>
								<IconButton
									size="small"
									disabled={callDisabled}
									onClick={onVideoCall}
									sx={(theme) => ({
										color: outgoingTextColor || theme.palette.primary.main,
									})}
								>
									<VideocamIcon />
								</IconButton>
							</span>
						</Tooltip>

						<IconButton
							size="small"
							onClick={(e) => setMoreMenuAnchor(e.currentTarget)}
							sx={(theme) => ({
								color: outgoingTextColor || theme.palette.primary.main,
							})}
						>
							<MoreVertIcon />
						</IconButton>

						<Menu
							anchorEl={moreMenuAnchor}
							open={Boolean(moreMenuAnchor)}
							onClose={() => setMoreMenuAnchor(null)}
							transformOrigin={{ horizontal: "right", vertical: "top" }}
							anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
						>
							<MenuItem onClick={() => { setMoreMenuAnchor(null); onSearch?.(); }}>
								<ListItemIcon><SearchIcon fontSize="small" /></ListItemIcon>
								Tìm kiếm
							</MenuItem>
							<MenuItem onClick={() => { setMoreMenuAnchor(null); onMute?.(); }}>
								<ListItemIcon>
									{isNotificationEnabled
										? <NotificationsIcon fontSize="small" />
										: <NotificationsOffIcon fontSize="small" />}
								</ListItemIcon>
								{isNotificationEnabled ? "Tắt thông báo" : "Bật thông báo"}
							</MenuItem>
							<MenuItem onClick={() => { setMoreMenuAnchor(null); onInfo?.(); }}>
								<ListItemIcon><InfoOutlinedIcon fontSize="small" /></ListItemIcon>
								Thông tin cuộc trò chuyện
							</MenuItem>
						</Menu>
					</>
				)}
			</Box>
		</Box>
	);
};
