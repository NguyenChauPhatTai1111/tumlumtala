import { Avatar, Box, Fade, IconButton, Paper, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface MessageToastItem {
	id: string;
	senderName?: string;
	conversationName?: string;
	content?: string;
	senderAvatar?: string;
}

const AUTO_CLOSE_MS = 5000;

function MessageToastCard({
	item,
	onClose,
	index,
}: {
	item: MessageToastItem;
	onClose: (id: string) => void;
	index: number;
}) {
	const [visible, setVisible] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const close = useCallback(() => {
		setVisible(false);
		setTimeout(() => onClose(item.id), 250);
	}, [item.id, onClose]);

	useEffect(() => {
		const enter = setTimeout(() => setVisible(true), index * 60);
		timerRef.current = setTimeout(close, AUTO_CLOSE_MS);
		return () => {
			clearTimeout(enter);
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, [close, index]);

	const title = item.conversationName ?? item.senderName ?? "Tin nhắn mới";
	const body = item.content?.trim()
		? item.conversationName && item.senderName
			? `${item.senderName}: ${item.content}`
			: item.content
		: item.senderName
			? `${item.senderName} đã gửi tin nhắn`
			: "Bạn có tin nhắn mới";

	return (
		<Fade in={visible} timeout={250}>
			<Paper
				elevation={6}
				onClick={() => { window.focus(); close(); }}
				sx={{
					display: "flex",
					alignItems: "flex-start",
					gap: 1.5,
					p: 1.5,
					width: 320,
					borderRadius: 2,
					cursor: "pointer",
					bgcolor: "background.paper",
					border: "1px solid",
					borderColor: "divider",
					transition: "background-color 0.15s",
					"&:hover": { bgcolor: "action.hover" },
				}}
			>
				<Avatar
					src={item.senderAvatar}
					sx={{ width: 40, height: 40, flexShrink: 0, mt: 0.25 }}
				>
					{(item.senderName ?? "?")[0].toUpperCase()}
				</Avatar>

				<Box sx={{ flex: 1, minWidth: 0 }}>
					<Typography variant="body2" fontWeight={700} noWrap>
						{title}
					</Typography>
					<Typography
						variant="caption"
						color="text.secondary"
						sx={{
							display: "-webkit-box",
							WebkitLineClamp: 2,
							WebkitBoxOrient: "vertical",
							overflow: "hidden",
							lineHeight: 1.5,
						}}
					>
						{body}
					</Typography>
				</Box>

				<IconButton
					size="small"
					onClick={(e) => { e.stopPropagation(); close(); }}
					sx={{ flexShrink: 0, mt: -0.5, mr: -0.5 }}
				>
					<CloseIcon sx={{ fontSize: 14 }} />
				</IconButton>
			</Paper>
		</Fade>
	);
}

export function MessageToastContainer({
	items,
	onClose,
}: {
	items: MessageToastItem[];
	onClose: (id: string) => void;
}) {
	if (items.length === 0) return null;
	return createPortal(
		<Box
			sx={{
				position: "fixed",
				bottom: 24,
				right: 24,
				zIndex: 9999,
				display: "flex",
				flexDirection: "column-reverse",
				gap: 1,
				pointerEvents: "none",
				"& > *": { pointerEvents: "auto" },
			}}
		>
			{items.map((item, index) => (
				<MessageToastCard key={item.id} item={item} onClose={onClose} index={index} />
			))}
		</Box>,
		document.body,
	);
}
