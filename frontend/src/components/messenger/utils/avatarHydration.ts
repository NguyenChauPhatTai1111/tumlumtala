import type { IUser } from "@/types";
import type { Conversation, Participant } from "@/types/messenger";

const normalize = (value?: string | number | null) =>
	String(value ?? "")
		.trim()
		.toLowerCase();

const buildUserIndexes = (users: IUser[]) => {
	const byId = new Map<string, IUser>();
	const byEmail = new Map<string, IUser>();
	const byName = new Map<string, IUser>();

	for (const user of users) {
		if (user.avatar) {
			byId.set(normalize(user.id), user);
			byEmail.set(normalize(user.email), user);
			byName.set(normalize(user.fullname), user);
		}
	}

	return { byId, byEmail, byName };
};

const getUserForParticipant = (
	participant: Participant,
	indexes: ReturnType<typeof buildUserIndexes>,
) =>
	indexes.byId.get(normalize(participant.id)) ??
	indexes.byEmail.get(normalize(participant.email)) ??
	indexes.byName.get(normalize(participant.fullname));

export const hydrateConversationParticipantAvatars = (
	conversation: Conversation,
	users: IUser[],
): Conversation => {
	if (users.length === 0 || conversation.participants.length === 0) {
		return conversation;
	}

	const indexes = buildUserIndexes(users);
	let changed = false;
	const participants = conversation.participants.map((participant) => {
		const user = getUserForParticipant(participant, indexes);
		if (!user?.avatar || participant.avatar === user.avatar) {
			return participant;
		}

		changed = true;
		return { ...participant, avatar: user.avatar };
	});

	return changed ? { ...conversation, participants } : conversation;
};

