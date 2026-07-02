import { UserSearchDialog } from "@components/messenger";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { useLocation } from "react-router-dom";
import { useAppErrorStore } from "@store/appErrorStore";
import { MiniChatWindow } from "./miniMessenger/MiniChatWindow";
import { MiniConversationRail } from "./miniMessenger/MiniConversationRail";
import { useMiniMessenger } from "./miniMessenger/hooks/useMiniMessenger";

export function MiniMessenger() {
	const theme = useTheme();
	const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));
	const location = useLocation();
	const hasBlockingError = useAppErrorStore((s) => s.hasBlockingError);

	const {
		currentUserId,
		windowConversations,
		railConversations,
		railConversationTotal,
		openConversationIds,
		activeConversationId,
		setActiveConversationId,
		newMessageOpen,
		setNewMessageOpen,
		creatingConversation,
		openConversation,
		minimizeConversation,
		closeConversation,
		closeAllConversations,
		minimizeAllConversations,
		dismissConversation,
		handleSelectNewMessageUser,
	} = useMiniMessenger();

	if (
		!currentUserId ||
		isSmallScreen ||
		hasBlockingError ||
		location.pathname.startsWith("/messenger")
	) {
		return null;
	}

	return (
		<>
			<Box
				sx={{
					position: "fixed",
					right: 96,
					bottom: 24,
					zIndex: (muiTheme) => muiTheme.zIndex.modal - 1,
					display: "flex",
					flexDirection: "row-reverse",
					alignItems: "flex-end",
					gap: 1.25,
					pointerEvents: "none",
					"& > *": { pointerEvents: "auto" },
				}}
			>
				{windowConversations.map((conversation) => (
					<MiniChatWindow
						key={conversation.id}
						conversation={conversation}
						currentUserId={currentUserId}
						isActive={activeConversationId === conversation.id}
						onClose={closeConversation}
						onMinimize={minimizeConversation}
						onFocus={() => setActiveConversationId(conversation.id)}
					/>
				))}
			</Box>

			<MiniConversationRail
				conversations={railConversations}
				currentUserId={currentUserId}
				total={railConversationTotal}
				openIds={openConversationIds}
				onOpen={openConversation}
				onDismiss={dismissConversation}
				onCloseAll={closeAllConversations}
				onMinimizeAll={minimizeAllConversations}
				onOpenNewMessage={() => setNewMessageOpen(true)}
			/>

			<UserSearchDialog
				open={newMessageOpen}
				onClose={() => setNewMessageOpen(false)}
				onSelect={(user) => {
					void handleSelectNewMessageUser(user);
				}}
				loading={creatingConversation}
				title="New message"
			/>
		</>
	);
}
