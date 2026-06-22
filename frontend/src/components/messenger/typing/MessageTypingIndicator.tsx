import { Box } from "@mui/material";

export const MessageTypingIndicator = () => (
	<Box
		sx={{ display: "flex", gap: 0.5, alignItems: "center", color: "inherit" }}
	>
		{[0, 0.2, 0.4].map((delay) => (
			<Box
				key={delay}
				sx={{
					width: 6,
					height: 6,
					borderRadius: "50%",
					bgcolor: "currentColor",
					animation: "messengerTypingBounce 1.4s infinite",
					animationDelay: `${delay}s`,
					"@keyframes messengerTypingBounce": {
						"0%, 80%, 100%": { opacity: 0.35, transform: "translateY(0)" },
						"40%": { opacity: 1, transform: "translateY(-2px)" },
					},
				}}
			/>
		))}
	</Box>
);
