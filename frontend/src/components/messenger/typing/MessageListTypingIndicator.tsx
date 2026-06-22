import { buildGeneratedAvatar } from "@components/messenger/utils/avatar";
import { Avatar, Box, Typography } from "@mui/material";
import { resolveCdnUrl } from "@/utils";

type MessageListTypingIndicatorProps = {
	users: Array<{ id: number; name: string; avatar?: string }>;
};

export const MessageListTypingIndicator = ({
	users,
}: MessageListTypingIndicatorProps) => {
	const visibleUsers = users.slice(0, 3);
	const label =
		users.length > 1
			? `${users[0]?.name ?? "Người dùng"} +${users.length - 1}`
			: (users[0]?.name ?? "Người dùng");

	return (
		<Box
			aria-label="Đang nhập"
			sx={{
				display: "inline-flex",
				alignItems: "center",
				gap: 1,
				maxWidth: "100%",
				px: 1.5,
				py: 0.75,
				borderRadius: 999,
				bgcolor: "background.paper",
				border: "1px solid",
				borderColor: "divider",
				boxShadow: "0 8px 24px rgba(15, 23, 42, 0.16)",
			}}
		>
			<Box sx={{ display: "flex", alignItems: "center", pl: 0.25 }}>
				{visibleUsers.map((user, index) => (
					<Avatar
						key={user.id}
						src={resolveCdnUrl(user.avatar) || buildGeneratedAvatar(user.name)}
						alt={user.name}
						title={user.name}
						sx={{
							width: 28,
							height: 28,
							fontSize: 12,
							border: "2px solid",
							borderColor: "background.paper",
							ml: index === 0 ? 0 : -0.75,
							zIndex: visibleUsers.length - index,
						}}
					/>
				))}
			</Box>
			<Typography
				noWrap
				variant="body2"
				sx={{
					maxWidth: { xs: 140, sm: 220 },
					fontWeight: 600,
					color: "text.primary",
				}}
			>
				{label}
			</Typography>
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					gap: 0.45,
					color: "text.secondary",
					pr: 0.35,
				}}
			>
				{[0, 0.16, 0.32].map((delay) => (
					<Box
						key={delay}
						sx={{
							width: 6,
							height: 6,
							borderRadius: "50%",
							bgcolor: "currentColor",
							animation: "messengerTypingWave 1.05s ease-in-out infinite",
							animationDelay: `${delay}s`,
							"@keyframes messengerTypingWave": {
								"0%, 60%, 100%": {
									opacity: 0.42,
									transform: "translateY(0) scale(0.92)",
								},
								"30%": {
									opacity: 1,
									transform: "translateY(-4px) scale(1)",
								},
							},
						}}
					/>
				))}
			</Box>
		</Box>
	);
};
