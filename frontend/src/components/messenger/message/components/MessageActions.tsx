import type { MessageActionsProps } from "@components/messenger/types/components";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import ReplyIcon from "@mui/icons-material/Reply";
import {
	Box,
	IconButton,
	Tooltip,
	useMediaQuery,
	useTheme,
} from "@mui/material";

export const MessageActions = ({
	canEditMessage,
	bubbleBackground,
	actionsSurfaceBackground,
	ambientTextColor,
	ambientBorderColor,
	actionButtonHoverBg,
	actionButtonHoverTextColor,
	actionsBoxShadow,
	canSpeak,
	onSpeak,
	hasCustomTheme,
	onReply,
	onDelete,
	onEdit,
	onMouseEnter,
	onMouseLeave,
}: MessageActionsProps) => {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
	const tooltipPlacement = isMobile ? "right" : "top";

	const btnSx = {
		color: ambientTextColor,
		padding: "2px 3px",
		"&:hover": {
			bgcolor: actionButtonHoverBg,
			color: actionButtonHoverTextColor,
		},
		"& .MuiSvgIcon-root": { fontSize: "1rem" },
	};

	return (
		<Box
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			sx={{
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				flexShrink: 0,
				gap: 0.25,
				zIndex: 32,
				bgcolor: hasCustomTheme ? bubbleBackground : actionsSurfaceBackground,
				border: "1px solid",
				borderColor: ambientBorderColor || "divider",
				borderRadius: 999,
				px: 0.75,
				py: 0.5,
				boxShadow: (t) =>
					actionsBoxShadow ||
					(t.palette.mode === "dark"
						? "0 8px 24px rgba(255,255,255,0.08), 0 0 12px rgba(255,255,255,0.04)"
						: "0 10px 30px rgba(0,0,0,0.18)"),
				animation: "messageActionsFade 0.08s ease",
				"@keyframes messageActionsFade": {
					from: { opacity: 0, transform: "scale(0.97)" },
					to: { opacity: 1, transform: "scale(1)" },
				},
			}}
		>
			<Tooltip title="Trả lời" placement={tooltipPlacement}>
				<IconButton size="small" onClick={onReply} sx={btnSx}>
					<ReplyIcon fontSize="small" />
				</IconButton>
			</Tooltip>

			<Tooltip title="Xóa" placement={tooltipPlacement}>
				<IconButton size="small" onClick={onDelete} sx={btnSx}>
					<DeleteIcon fontSize="small" />
				</IconButton>
			</Tooltip>

			{canEditMessage && (
				<Tooltip title="Sửa" placement={tooltipPlacement}>
					<IconButton size="small" onClick={onEdit} sx={btnSx}>
						<EditIcon fontSize="small" />
					</IconButton>
				</Tooltip>
			)}

			{canSpeak && (
				<Tooltip title="Đọc bằng AI" placement={tooltipPlacement}>
					<IconButton size="small" onClick={onSpeak} sx={btnSx}>
						<RecordVoiceOverIcon fontSize="small" />
					</IconButton>
				</Tooltip>
			)}
		</Box>
	);
};
