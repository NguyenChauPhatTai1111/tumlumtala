import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import {
	Avatar,
	Box,
	CircularProgress,
	IconButton,
	InputAdornment,
	List,
	ListItemButton,
	Paper,
	TextField,
	Typography,
} from "@mui/material";
import React, { type UIEvent } from "react";
import {
	getSenderInSelectedConversation,
	renderHighlightedText,
} from "@/components/messenger/messengerUtils";
import type { IUser } from "@/types";
import type { Conversation, Message } from "@/types/messenger";
import { formatRelativeTime, resolveCdnUrl } from "@/utils";

type SearchDetailPanelProps = {
	open: boolean;
	selectedConversation?: Conversation;
	currentUser?: IUser;
	searchAllKeyword: string;
	searchDetailResults: Message[];
	searchDetailLoading: boolean;
	hasMoreSearchDetail: boolean;
	onKeywordChange: (value: string) => void;
	onClose: () => void;
	onSelectMessage: (message: Message) => void;
	onLoadMoreSearchDetail: () => void;
};

export function MessengerSearchDetailPanel({
	open,
	selectedConversation,
	currentUser,
	searchAllKeyword,
	searchDetailResults,
	searchDetailLoading,
	hasMoreSearchDetail,
	onKeywordChange,
	onClose,
	onSelectMessage,
	onLoadMoreSearchDetail,
}: SearchDetailPanelProps) {
	const loadMoreInFlightRef = React.useRef(false);

	if (!open || !selectedConversation) {
		return null;
	}

	const handleScroll = async (event: UIEvent<HTMLElement>) => {
		if (
			searchDetailLoading ||
			!hasMoreSearchDetail ||
			loadMoreInFlightRef.current
		) {
			return;
		}

		const target = event.currentTarget;
		const distanceToBottom =
			target.scrollHeight - target.clientHeight - target.scrollTop;

		if (distanceToBottom <= 120) {
			try {
				loadMoreInFlightRef.current = true;
				await Promise.resolve(onLoadMoreSearchDetail());
			} finally {
				loadMoreInFlightRef.current = false;
			}
		}
	};

	return (
		<Paper
			sx={{
				width: 400,
				maxWidth: "100%",
				borderRadius: 0,
				borderLeft: "1px solid",
				borderColor: "divider",
				boxShadow: 24,
				bgcolor: "background.paper",
				display: "flex",
				flexDirection: "column",
				minWidth: 0,
				position: "absolute",
				right: 0,
				top: 0,
				bottom: 0,
				zIndex: 130,
			}}
		>
			<Box
				sx={{
					p: 1.5,
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
				}}
			>
				<Typography variant="subtitle1" fontWeight={700}>
					Tìm kiếm
				</Typography>
				<IconButton size="small" onClick={onClose}>
					<CloseIcon fontSize="small" />
				</IconButton>
			</Box>
			<Box
				sx={{
					p: 1.5,
					pt: 0,
					borderBottom: "1px solid",
					borderColor: "divider",
				}}
			>
				<TextField
					fullWidth
					size="small"
					placeholder="Nhập từ khóa"
					value={searchAllKeyword}
					onChange={(event) => onKeywordChange(event.target.value)}
					InputProps={{
						startAdornment: (
							<InputAdornment position="start">
								<SearchIcon fontSize="small" />
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
			<List sx={{ p: 0, overflowY: "auto", flex: 1 }} onScroll={handleScroll}>
				{searchDetailResults.length > 0 && (
					<Box
						sx={{
							px: 2,
							py: 1,
							position: "sticky",
							top: 0,
							bgcolor: "background.paper",
							zIndex: 1,
						}}
					>
						<Typography variant="body2" color="text.secondary">
							Tìm thấy <strong>{searchDetailResults.length}</strong> kết quả
						</Typography>
					</Box>
				)}

				{searchDetailResults.map((item) => {
					const sender = getSenderInSelectedConversation(
						item,
						selectedConversation,
						currentUser,
					);

					return (
						<ListItemButton
							key={`detail-${item.id}`}
							sx={{ py: 1, px: 1.5, alignItems: "flex-start", gap: 1.25 }}
							onClick={() => onSelectMessage(item)}
						>
							<Avatar
								src={resolveCdnUrl(sender.avatar)}
								sx={{ width: 40, height: 40, mt: 0.2 }}
							>
								{(sender.name || "U").slice(0, 1).toUpperCase()}
							</Avatar>
							<Box sx={{ minWidth: 0, flex: 1 }}>
								<Typography
									variant="subtitle2"
									sx={{
										lineHeight: 1.2,
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap",
										pr: 1,
									}}
								>
									{sender.name}
								</Typography>
								<Typography
									variant="body2"
									color="text.secondary"
									sx={{
										mt: 0.35,
										lineHeight: 1.3,
										overflow: "hidden",
										textOverflow: "ellipsis",
										display: "-webkit-box",
										WebkitLineClamp: 2,
										WebkitBoxOrient: "vertical",
									}}
								>
									{renderHighlightedText(item.content || "", searchAllKeyword)}
								</Typography>
							</Box>
							<Typography
								variant="caption"
								color="text.secondary"
								sx={{ whiteSpace: "nowrap", mt: 0.2, ml: 0.5 }}
							>
								{formatRelativeTime(item.created_at)}
							</Typography>
						</ListItemButton>
					);
				})}
				{searchDetailLoading ? (
					<Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
						<CircularProgress size={22} />
					</Box>
				) : null}
				{!searchDetailLoading && searchDetailResults.length === 0 ? (
					<Typography
						variant="caption"
						color="text.secondary"
						sx={{ px: 2, py: 1, display: "block" }}
					>
						Không tìm thấy kết quả phù hợp
					</Typography>
				) : null}
			</List>
		</Paper>
	);
}
