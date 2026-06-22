import type { theme_PRESETS } from "@constants/messenger";
import type {
	ChangeEvent,
	MouseEvent,
	MutableRefObject,
	RefObject,
} from "react";
import type { IUser } from "@/types";
import type { Conversation } from "@/types/messenger";
import type { ITheme } from "@/types/theme";

export type AdminKeyBadgeProps = {
	src?: string;
	fallback?: string;
	size?: number;
	onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
	cursor?: string;
	showBadge?: boolean;
};

export interface MessengerHeaderProps {
	conversation?: Conversation;
	currentUser?: IUser;
	useDefaultTheme?: boolean;
	chatSurface?: string;
	outgoingTextColor?: string;
	onRestore: (conversationId: number) => void;
	onDelete: (conversationId: number) => void;
	onInfo: () => void;
	onSearch: () => void;
	onMute: () => void;
	showBackButton?: boolean;
	onBack?: () => void;
	overrideTextColor?: string;
}

export type VideoThumbProps = {
	src: string;
	duration?: number;
	onClick?: () => void;
	sx?: object;
	playIconSize?: number;
};

export type MessageActionsProps = {
	canEditMessage: boolean;
	bubbleBackground: string;
	actionsSurfaceBackground: string;
	ambientTextColor?: string;
	ambientBorderColor?: string;
	actionButtonHoverBg: string;
	actionButtonHoverTextColor: string;
	actionsBoxShadow?: string;
	canSpeak: boolean;
	onSpeak: () => void;
	hasCustomTheme: boolean;
	onReply: () => void;
	onDelete: () => void;
	onEdit: () => void;
	onMouseEnter: () => void;
	onMouseLeave: () => void;
};

export type ComposerInputProps = {
	disabled?: boolean;
	text: string;
	inputRef: MutableRefObject<HTMLTextAreaElement | null>;
	outgoingTextColor?: string;
	onTextChange: (value: string) => void;
	onSend: () => void;
	onPaste: (event: React.ClipboardEvent<HTMLElement>) => void;
	onOpenEmoji: (event: MouseEvent<HTMLButtonElement>) => void;
	onSelectImages: (event: ChangeEvent<HTMLInputElement>) => void;
	onSelectVideo: (event: ChangeEvent<HTMLInputElement>) => void;
	onSelectFile: (event: ChangeEvent<HTMLInputElement>) => void;
	isCanSend: boolean;
	quickReaction?: string;
	onQuickEmoji: () => void;
};

export type GradientStop = {
	id: number;
	color: string;
	position: number;
};

export type ThemePreset =
	| ((typeof theme_PRESETS)[number] & { themeId?: number })
	| {
			id: string;
			name: string;
			background: string;
			backgroundColor: string;
			incomingBubbleColor: string;
			outgoingBubbleColor: string;
			incomingTextColor: string;
			outgoingTextColor: string;
			themeId?: number;
			themeUrl?: string;
			rawTheme?: ITheme;
	  };

export type ThemeTabProps = {
	themePresetId: string;
	selectedThemeId?: number;
	themePresets?: ThemePreset[];
	onSelectThemePreset: (preset: ThemePreset) => void;
	backgroundInputRef: RefObject<HTMLInputElement | null>;
	onBackgroundImageSelected: (
		event: React.ChangeEvent<HTMLInputElement>,
	) => void;
	selectedBackgroundPreview: string;
	backgroundValue: string;
	backgroundColorValue: string;
	incomingBubbleColorValue: string;
	outgoingBubbleColorValue: string;
	incomingTextColorValue: string;
	outgoingTextColorValue: string;
	backgroundGradientStops: GradientStop[];
	onAddBackgroundGradientStop: () => void;
	onUpdateBackgroundGradientStop: (
		stopId: number,
		patch: Partial<GradientStop>,
	) => void;
	onRemoveBackgroundGradientStop: (stopId: number) => void;
	onIncomingBubbleColorChange: (value: string) => void;
	onOutgoingBubbleColorChange: (value: string) => void;
	onIncomingTextColorChange: (value: string) => void;
	onOutgoingTextColorChange: (value: string) => void;
	previewBackground?: string;
	previewIncomingTextColor: string;
	previewOutgoingTextColor: string;
	shouldShowBackgroundOverlay: boolean;
	onCancel: () => void;
	onSave: () => void;
};
