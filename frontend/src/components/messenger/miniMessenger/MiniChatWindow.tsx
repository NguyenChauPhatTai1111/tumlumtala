import {
	CreateGroupDialog,
	MessageList,
	MessengerComposer,
} from "@components/messenger";
import {
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Paper,
	TextField,
} from "@mui/material";
import MessengerCustomizeDialog from "@pages/messenger/dialogs/MessengerCustomizeDialog";
import type { Conversation } from "@/types/messenger";
import { MiniChatWindowHeader } from "./MiniChatWindowHeader";
import { useMiniChatWindow } from "./hooks/useMiniChatWindow";
import { getConversationAvatar, getConversationTitle } from "./utils";

interface MiniChatWindowProps {
	conversation: Conversation;
	currentUserId?: number | string;
	isActive?: boolean;
	onClose: (conversationId: number) => void;
	onMinimize: (conversationId: number) => void;
	onFocus?: () => void;
}

export function MiniChatWindow({
	conversation,
	currentUserId,
	isActive,
	onClose,
	onMinimize,
	onFocus,
}: MiniChatWindowProps) {
	const title = getConversationTitle(conversation, currentUserId);
	const avatar = getConversationAvatar(conversation, currentUserId);

	const {
		loadingOlderMessages,
		replyingMessage,
		setReplyingMessage,
		actionsAnchor,
		setActionsAnchor,
		customizeOpen,
		setCustomizeOpen,
		nicknameOpen,
		setNicknameOpen,
		nicknameTargetId,
		setNicknameTargetId,
		nicknameValue,
		setNicknameValue,
		createGroupOpen,
		setCreateGroupOpen,
		confirmAction,
		setConfirmAction,
		creatingGroup,
		messages,
		miniTheme,
		replySenderName,
		otherParticipants,
		nicknameTarget,
		messagesQuery,
		themesQuery,
		ws,
		loadOlderMessages,
		handleSend,
		handleToggleReaction,
		handleRetryMessage,
		handleSaveNickname,
		handleCreateGroup,
		handleArchiveConversation,
		handleDeleteConversation,
		handleConfirmAction,
		handleLeaveConversation,
		handleChangeBackground,
		handleChangeQuickReaction,
		handleNavigateToMessenger,
		handleRename,
		handleChangeGroupAvatar,
		closeActionsMenu,
	} = useMiniChatWindow({ conversation, currentUserId, onClose });

	return (
		<Paper
			elevation={isActive ? 20 : 12}
			onMouseDown={onFocus}
			sx={{
				width: 380,
				height: 560,
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
				borderRadius: 2,
				bgcolor: "background.paper",
				border: "1px solid",
				borderColor: isActive ? "primary.main" : "divider",
				boxShadow: isActive
					? "0 28px 80px rgba(0,0,0,0.6)"
					: "0 28px 80px rgba(0,0,0,0.45)",
				zIndex: isActive ? 1 : 0,
				position: "relative",
				maxWidth: "calc(100vw - 132px)",
				minWidth: 0,
				overflowX: "hidden",
				"& .message-list-viewport": {
					overflowX: "hidden",
				},
				"& .message-list-viewport > *": {
					maxWidth: "100%",
				},
			}}
		>
			<MiniChatWindowHeader
				title={title}
				avatar={avatar}
				conversation={conversation}
				actionsAnchor={actionsAnchor}
				onOpenActionsMenu={(event) => setActionsAnchor(event.currentTarget)}
				onCloseActionsMenu={closeActionsMenu}
				onMinimize={() => onMinimize(conversation.id)}
				onClose={() => onClose(conversation.id)}
				onNavigateToMessenger={handleNavigateToMessenger}
				onOpenCustomize={() => setCustomizeOpen(true)}
				onOpenNickname={() => {
					const target = nicknameTarget;
					if (!target) return;
					setNicknameTargetId(target.id);
					setNicknameValue(target.nickname || target.fullname || "");
					setNicknameOpen(true);
					closeActionsMenu();
				}}
				onArchive={handleArchiveConversation}
				onDelete={handleDeleteConversation}
				onLeave={handleLeaveConversation}
				onOpenCreateGroup={() => setCreateGroupOpen(true)}
			/>

			<MessageList
				messages={messages}
				conversation={conversation}
				chatBackground={miniTheme.chatBackground}
				incomingBubbleColor={miniTheme.incomingBubbleColor}
				outgoingBubbleColor={miniTheme.outgoingBubbleColor}
				incomingTextColor={miniTheme.incomingTextColor}
				outgoingTextColor={miniTheme.outgoingTextColor}
				loading={messagesQuery.isLoading}
				error={messagesQuery.isError ? "Không thể tải tin nhắn" : undefined}
				hasMore={Boolean(messagesQuery.data?.hasMore)}
				loadingMore={loadingOlderMessages}
				onLoadMore={loadOlderMessages}
				onToggleReaction={handleToggleReaction}
				onReplyMessage={setReplyingMessage}
				onRetryMessage={handleRetryMessage}
				ws={ws}
			/>

			<Box
				sx={{
					minWidth: 0,
					overflowX: "hidden",
					"& > div": {
						minWidth: 0,
						maxWidth: "100%",
						overflowX: "hidden",
					},
					"& > div > div": {
						minWidth: 0,
						maxWidth: "100%",
					},
					"& .composer-attachment-preview-list": {
						overflowX: "hidden",
						overflowY: "auto",
						flexWrap: "wrap",
						maxHeight: 132,
						pr: 0.5,
					},
				}}
			>
				<MessengerComposer
					key={conversation.id}
					conversationId={conversation.id}
					replyMessage={replyingMessage}
					replySenderName={replySenderName}
					onCancelReply={() => setReplyingMessage(null)}
					onSend={handleSend}
					quickReaction={conversation.quick_reaction}
					ws={ws}
					useDefaultTheme
				/>
			</Box>

			<Dialog
				open={Boolean(confirmAction)}
				onClose={() => setConfirmAction(null)}
				maxWidth="xs"
				fullWidth
			>
				<DialogTitle sx={{ fontWeight: 850 }}>
					{confirmAction === "delete"
						? "Xóa cuộc trò chuyện?"
						: "Rời khỏi nhóm?"}
				</DialogTitle>
				<DialogContent sx={{ color: "text.secondary" }}>
					{confirmAction === "delete"
						? "Cuộc trò chuyện này sẽ bị xóa khỏi danh sách của bạn."
						: "Bạn sẽ không còn nhận tin nhắn từ nhóm này sau khi rời nhóm."}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmAction(null)}>Hủy</Button>
					<Button
						variant="contained"
						color={confirmAction === "delete" ? "error" : "primary"}
						onClick={() => {
							void handleConfirmAction();
						}}
					>
						{confirmAction === "delete" ? "Xóa" : "Rời nhóm"}
					</Button>
				</DialogActions>
			</Dialog>

			<MessengerCustomizeDialog
				open={customizeOpen}
				conversation={conversation}
				initialThemePresetId={conversation.theme?.preset_id ?? ""}
				themes={themesQuery.data ?? []}
				onClose={() => setCustomizeOpen(false)}
				onRename={handleRename}
				onChangeGroupAvatar={handleChangeGroupAvatar}
				onChangeBackground={handleChangeBackground}
				onChangeQuickReaction={handleChangeQuickReaction}
			/>

			<Dialog
				open={nicknameOpen}
				onClose={() => setNicknameOpen(false)}
				maxWidth="xs"
				fullWidth
			>
				<DialogTitle>Nickname</DialogTitle>
				<DialogContent sx={{ display: "grid", gap: 1.5, pt: 1 }}>
					{conversation.participants.length > 1 && (
						<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
							{conversation.participants.map((participant) => (
								<Button
									key={participant.id}
									size="small"
									variant={
										nicknameTarget?.id === participant.id
											? "contained"
											: "outlined"
									}
									onClick={() => {
										setNicknameTargetId(participant.id);
										setNicknameValue(
											participant.nickname || participant.fullname || "",
										);
									}}
								>
									{participant.nickname || participant.fullname || "User"}
								</Button>
							))}
						</Box>
					)}
					<TextField
						autoFocus
						label={nicknameTarget?.fullname || "Nickname"}
						value={nicknameValue}
						onChange={(event) => setNicknameValue(event.target.value)}
						fullWidth
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setNicknameOpen(false)}>Hủy</Button>
					<Button
						variant="contained"
						onClick={() => {
							void handleSaveNickname();
						}}
						disabled={!nicknameTarget}
					>
						Lưu
					</Button>
				</DialogActions>
			</Dialog>

			<CreateGroupDialog
				open={createGroupOpen}
				onClose={() => setCreateGroupOpen(false)}
				onCreateGroup={handleCreateGroup}
				loading={creatingGroup}
				preselectedParticipants={otherParticipants}
				currentUserId={Number(currentUserId)}
			/>
		</Paper>
	);
}
