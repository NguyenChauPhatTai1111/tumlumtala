import type {
	FilePreview,
	ImagePreview,
	VideoPreview,
} from "@components/messenger/composer/types";
import type { MessengerWebSocketService } from "@/services/messengerWebSocketService";
import type { Message, SendMessagePayloadItem } from "@/types/messenger";

export interface MessengerComposerProps {
	key?: string | number;
	disabled?: boolean;
	focusKey?: number | null;
	replyMessage?: Message | null;
	replySenderName?: string;
	editingMessage?: Message | null;
	outgoingTextColor?: string;
	useDefaultTheme?: boolean;
	chatSurface?: string;
	conversationId?: number;
	draftText?: string;
	draftImages?: ImagePreview[];
	draftVideos?: VideoPreview[];
	draftFiles?: FilePreview[];
	onDraftChange?: (draft: {
		text: string;
		images: ImagePreview[];
		videos?: VideoPreview[];
		files?: FilePreview[];
	}) => void;
	quickReaction?: string;
	ws?: MessengerWebSocketService | null;
	onCancelReply?: () => void;
	onCancelEdit?: () => void;
	onSend: (
		text: string | SendMessagePayloadItem[],
		type?: string,
		id?: number,
		options?: { tempId?: string; skipOptimistic?: boolean },
	) => undefined | boolean | Promise<undefined | boolean>;
}
