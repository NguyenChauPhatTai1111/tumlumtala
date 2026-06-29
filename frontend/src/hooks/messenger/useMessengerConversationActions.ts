import { messengerKeys } from "@hooks/keys/messengerKeys";
import {
	addConversationMembers,
	archiveConversation,
	deleteConversation,
	getConversationMembers,
	leaveConversation,
	markAsRead,
	removeConversationMember,
	renameConversation,
	restoreConversation,
	setConversationNickname,
	updateConversationAvatar,
	updateConversationBackground,
	updateConversationNotifications,
} from "@services/messengerService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Conversation, PaginatedResult } from "@/types/messenger";

export const useMessengerConversationActions = () => {
	const queryClient = useQueryClient();

	const syncConversationParticipants = async (conversationId: number) => {
		try {
			const participants = await getConversationMembers(conversationId);

			queryClient.setQueriesData<PaginatedResult<Conversation>>(
				{ queryKey: messengerKeys.conversationsRoot() },
				(oldData) => {
					if (!oldData || !Array.isArray(oldData.items)) {
						return oldData;
					}

					return {
						...oldData,
						items: oldData.items.map((conversation) =>
							conversation.id === conversationId
								? { ...conversation, participants }
								: conversation,
						),
					};
				},
			);

			queryClient.setQueryData<Conversation>(
				messengerKeys.conversation(String(conversationId)),
				(oldConversation) =>
					oldConversation
						? { ...oldConversation, participants }
						: oldConversation,
			);
		} catch {
			await queryClient.invalidateQueries({
				queryKey: messengerKeys.conversationsRoot(),
			});
		}
	};

	const patchConversationReadState = (
		conversationId: number,
		patch: {
			lastReadSeq?: number;
			lastMessageAt?: string;
			lastMessageContent?: string;
			lastMessageSenderId?: number;
			currentUserId?: number;
		},
	) => {
		queryClient.setQueriesData(
			{ queryKey: [...messengerKeys.all, "conversations"] },
			(oldData) => {
				const data = oldData as PaginatedResult<Conversation> | undefined;
				if (!data || !Array.isArray(data.items)) {
					return oldData;
				}

				return {
					...data,
					items: data.items.map((conversation) => {
						if (conversation.id !== conversationId) {
							return conversation;
						}

						// Update participant's last_read_seq
						const updatedParticipants = conversation.participants.map((p) => {
							if (
								patch.currentUserId &&
								p.id === patch.currentUserId &&
								patch.lastReadSeq != null
							) {
								return { ...p, last_read_seq: patch.lastReadSeq };
							}
							return p;
						});

						return {
							...conversation,
							unread_count: 0,
							last_message_at:
								patch.lastMessageAt ?? conversation.last_message_at,
							last_message_content:
								patch.lastMessageContent ?? conversation.last_message_content,
							last_message_sender_id:
								patch.lastMessageSenderId ??
								conversation.last_message_sender_id,
							participants: updatedParticipants,
						};
					}),
				};
			},
		);

		queryClient.setQueryData(
			messengerKeys.conversation(String(conversationId)),
			(oldConversation: Conversation | undefined) => {
				if (!oldConversation) {
					return oldConversation;
				}

				// Update participant's last_read_seq
				const updatedParticipants = oldConversation.participants.map((p) => {
					if (
						patch.currentUserId &&
						p.id === patch.currentUserId &&
						patch.lastReadSeq != null
					) {
						return { ...p, last_read_seq: patch.lastReadSeq };
					}
					return p;
				});

				return {
					...oldConversation,
					unread_count: 0,
					last_message_at:
						patch.lastMessageAt ?? oldConversation.last_message_at,
					last_message_content:
						patch.lastMessageContent ?? oldConversation.last_message_content,
					last_message_sender_id:
						patch.lastMessageSenderId ?? oldConversation.last_message_sender_id,
					participants: updatedParticipants,
				};
			},
		);
	};

	const archive = useMutation({
		mutationFn: (conversationId: number) => archiveConversation(conversationId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: messengerKeys.all });
		},
	});

	const restore = useMutation({
		mutationFn: (conversationId: number) => restoreConversation(conversationId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: messengerKeys.all });
		},
	});

	const delete_ = useMutation({
		mutationFn: (conversationId: number) => deleteConversation(conversationId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: messengerKeys.all });
		},
	});

	const markRead = useMutation({
		mutationFn: ({
			conversationId,
			lastReadSeq,
		}: {
			conversationId: number;
			lastReadSeq?: number;
			lastMessageAt?: string;
			lastMessageContent?: string;
			lastMessageSenderId?: number;
			currentUserId?: number;
		}) => markAsRead(conversationId, lastReadSeq),
		onSuccess: async (_result, variables) => {
			patchConversationReadState(variables.conversationId, {
				lastReadSeq: variables.lastReadSeq,
				lastMessageAt: variables.lastMessageAt,
				lastMessageContent: variables.lastMessageContent,
				lastMessageSenderId: variables.lastMessageSenderId,
				currentUserId: variables.currentUserId,
			});
			await queryClient.invalidateQueries({ queryKey: messengerKeys.all });
			await queryClient.refetchQueries({
				queryKey: [...messengerKeys.all, "conversations"],
				type: "active",
			});
		},
	});

	const rename = useMutation({
		mutationFn: ({
			conversationId,
			name,
		}: {
			conversationId: number;
			name: string;
		}) => renameConversation(conversationId, name),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: messengerKeys.all });
		},
	});

	const addMembers = useMutation({
		mutationFn: ({
			conversationId,
			userIds,
		}: {
			conversationId: number;
			userIds: number[];
		}) => addConversationMembers(conversationId, userIds),
		onSuccess: async (_result, variables) => {
			await syncConversationParticipants(variables.conversationId);
		},
	});

	const removeMember = useMutation({
		mutationFn: ({
			conversationId,
			userId,
		}: {
			conversationId: number;
			userId: number;
		}) => removeConversationMember(conversationId, userId),
		onSuccess: async (_result, variables) => {
			await syncConversationParticipants(variables.conversationId);
		},
	});

	const updateBackground = useMutation({
		mutationFn: ({
			conversationId,
			themeId,
			themeUrl,
			customIncomingBubbleColor,
			customOutgoingBubbleColor,
			customIncomingTextColor,
			customOutgoingTextColor,
			background,
			backgroundColor,
		}: {
			conversationId: number;
			themeId?: number;
			themeUrl?: string | File;
			background?: string;
			backgroundColor?: string;
			customIncomingBubbleColor?: string;
			customOutgoingBubbleColor?: string;
			customIncomingTextColor?: string;
			customOutgoingTextColor?: string;
		}) =>
			updateConversationBackground(conversationId, {
				theme_id: themeId,
				theme_url: themeUrl,
				background,
				background_color: backgroundColor,
				custom_incoming_bubble_color: customIncomingBubbleColor,
				custom_outgoing_bubble_color: customOutgoingBubbleColor,
				custom_incoming_text_color: customIncomingTextColor,
				custom_outgoing_text_color: customOutgoingTextColor,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: messengerKeys.all });
		},
	});

	const updateAvatar = useMutation({
		mutationFn: ({
			conversationId,
			avatar,
		}: {
			conversationId: number;
			avatar: string | File;
		}) => updateConversationAvatar(conversationId, avatar),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: messengerKeys.all });
		},
	});

	const updateNotifications = useMutation({
		mutationFn: ({
			conversationId,
			enabled,
		}: {
			conversationId: number;
			enabled: boolean;
		}) => updateConversationNotifications(conversationId, enabled),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: messengerKeys.all });
		},
	});

	const setNickname = useMutation({
		mutationFn: ({
			conversationId,
			targetUserId,
			nickname,
		}: {
			conversationId: number;
			targetUserId: number;
			nickname: string;
		}) => setConversationNickname(conversationId, targetUserId, nickname),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: messengerKeys.all });
		},
	});

	const leave = useMutation({
		mutationFn: (conversationId: number) => leaveConversation(conversationId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: messengerKeys.all });
		},
	});

	const patchParticipantSeenSeq = (
		conversationId: number,
		userId: number,
		lastReadSeq: number,
	) => {
		const updateParticipants = (participants: Conversation["participants"]) =>
			participants.map((p) => {
				if (p.id === userId && lastReadSeq > (p.last_read_seq ?? 0)) {
					return { ...p, last_read_seq: lastReadSeq };
				}
				return p;
			});

		queryClient.setQueriesData(
			{ queryKey: [...messengerKeys.all, "conversations"] },
			(oldData) => {
				const data = oldData as PaginatedResult<Conversation> | undefined;
				if (!data || !Array.isArray(data.items)) return oldData;
				return {
					...data,
					items: data.items.map((conversation) => {
						if (conversation.id !== conversationId) return conversation;
						return {
							...conversation,
							participants: updateParticipants(conversation.participants),
						};
					}),
				};
			},
		);

		queryClient.setQueryData(
			messengerKeys.conversation(String(conversationId)),
			(oldConversation: Conversation | undefined) => {
				if (!oldConversation) return oldConversation;
				return {
					...oldConversation,
					participants: updateParticipants(oldConversation.participants),
				};
			},
		);
	};

	return {
		archive,
		restore,
		delete: delete_,
		markRead,
		rename,
		addMembers,
		removeMember,
		updateBackground,
		updateAvatar,
		updateNotifications,
		setNickname,
		leave,
		patchParticipantSeenSeq,
	};
};
