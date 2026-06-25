import {
	AvatarTab,
	QuickReactionTab,
	RenameTab,
	type ThemePreset,
	ThemeTab,
} from "@components/messenger/tabs";
import {
	buildGradientFromStops,
	isImageBackgroundValue,
	toRenderableChatBackground,
} from "@components/messenger/utils/background";
import { getReadableTextColor } from "@components/messenger/utils/color";
import {
	DEFAULT_BACKGROUND_COLOR,
	DEFAULT_GRADIENT_ANGLE,
	DEFAULT_INCOMING_BUBBLE_COLOR,
	DEFAULT_OUTGOING_BUBBLE_COLOR,
} from "@constants/messenger";
import CloseIcon from "@mui/icons-material/Close";
import {
	Dialog,
	DialogContent,
	DialogTitle,
	IconButton,
	Tab,
	Tabs,
	Typography,
	useTheme,
} from "@mui/material";
import React from "react";
import { useAutoFocusFirstInput } from "@/hooks/ui/useAutoFocusFirstInput";
import type { Conversation } from "@/types/messenger";
import type { ITheme } from "@/types/theme";

type GradientStop = {
	id: number;
	color: string;
	position: number;
};

type MessengerCustomizeDialogProps = {
	open: boolean;
	conversation: Conversation;
	initialThemePresetId?: string;
	themes?: ITheme[];
	onClose: () => void;
	onRename: (conversation: Conversation, name: string) => Promise<void>;
	onChangeGroupAvatar: (
		conversation: Conversation,
		file: File,
	) => Promise<void>;
	onChangeBackground: (
		conversation: Conversation,
		config: {
			background: string;
			backgroundColor: string;
			incomingBubbleColor: string;
			outgoingBubbleColor: string;
			incomingTextColor: string;
			outgoingTextColor: string;
			presetId?: string;
			themeId?: number;
			themeUrl?: string | File;
		},
	) => Promise<void>;
	onChangeQuickReaction: (
		conversation: Conversation,
		quickReaction: string,
	) => Promise<void>;
};

export default function MessengerCustomizeDialog({
	open,
	conversation,
	initialThemePresetId = "",
	themes = [],
	onClose,
	onRename,
	onChangeGroupAvatar,
	onChangeBackground,
	onChangeQuickReaction,
}: MessengerCustomizeDialogProps) {
	const theme = useTheme();
	const [customizeTab, setCustomizeTab] = React.useState<string>("theme");
	const [renameValue, setRenameValue] = React.useState<string>(
		conversation.name || "",
	);
	const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
	const [avatarPreviewUrl, setAvatarPreviewUrl] = React.useState<string>("");
	const [backgroundValue, setBackgroundValue] = React.useState<string>(
		conversation.theme_url || conversation.background || "",
	);
	const [selectedBackgroundFile, setSelectedBackgroundFile] =
		React.useState<File | null>(null);
	const [selectedBackgroundPreview, setSelectedBackgroundPreview] =
		React.useState<string>("");
	const [themePresetId, setThemePresetId] =
		React.useState<string>(initialThemePresetId);
	const [selectedThemeId, setSelectedThemeId] = React.useState<
		number | undefined
	>(conversation.theme_id ?? conversation.theme?.id);
	const [backgroundColorValue, setBackgroundColorValue] = React.useState(
		DEFAULT_BACKGROUND_COLOR,
	);
	const [incomingBubbleColorValue, setIncomingBubbleColorValue] =
		React.useState(DEFAULT_INCOMING_BUBBLE_COLOR);
	const [outgoingBubbleColorValue, setOutgoingBubbleColorValue] =
		React.useState(DEFAULT_OUTGOING_BUBBLE_COLOR);
	const [incomingTextColorValue, setIncomingTextColorValue] = React.useState(
		conversation.incoming_text_color ||
			(theme.palette.mode === "dark" ? "#f8fafc" : "#1e293b"),
	);
	const [outgoingTextColorValue, setOutgoingTextColorValue] = React.useState(
		conversation.outgoing_text_color ||
			(theme.palette.mode === "dark" ? "#ffffff" : "#ffffff"),
	);
	const [backgroundGradientStops, setBackgroundGradientStops] = React.useState<
		GradientStop[]
	>([
		{ id: 1, color: "#ecf4ff", position: 0 },
		{ id: 2, color: "#d7e8ff", position: 100 },
	]);

	const avatarInputRef = React.useRef<HTMLInputElement | null>(null);
	const backgroundInputRef = React.useRef<HTMLInputElement | null>(null);
	const contentRef = React.useRef<HTMLDivElement | null>(null);
	const gradientStopIdRef = React.useRef(100);
	const isGroup = Boolean(conversation?.is_group);
	useAutoFocusFirstInput(contentRef, open, [customizeTab, isGroup]);

	React.useEffect(() => {
		if (!open) {
			return;
		}

		setCustomizeTab(isGroup ? "rename" : "theme");

		const currentPresetId =
			initialThemePresetId || conversation.theme?.preset_id || "";
		const currentThemeId = conversation.theme_id ?? conversation.theme?.id;

		setRenameValue(conversation.name || "");
		setBackgroundValue(conversation.theme_url || conversation.background || "");
		setSelectedBackgroundFile(null);
		setSelectedBackgroundPreview("");
		setThemePresetId(currentPresetId);
		setSelectedThemeId(currentThemeId);
		setBackgroundColorValue(
			conversation.background_color ||
				conversation.theme?.background_color ||
				DEFAULT_BACKGROUND_COLOR,
		);
		setIncomingBubbleColorValue(
			conversation.incoming_bubble_color ||
				conversation.theme?.incoming_bubble_color ||
				DEFAULT_INCOMING_BUBBLE_COLOR,
		);
		setOutgoingBubbleColorValue(
			conversation.outgoing_bubble_color ||
				conversation.theme?.outgoing_bubble_color ||
				DEFAULT_OUTGOING_BUBBLE_COLOR,
		);
		setIncomingTextColorValue(
			conversation.incoming_text_color ||
				conversation.theme?.incoming_text_color ||
				(theme.palette.mode === "dark" ? "#f8fafc" : "#1e293b"),
		);
		setOutgoingTextColorValue(
			conversation.outgoing_text_color ||
				conversation.theme?.outgoing_text_color ||
				(theme.palette.mode === "dark" ? "#ffffff" : "#ffffff"),
		);
	}, [open, conversation, initialThemePresetId, theme.palette.mode, isGroup]);

	React.useEffect(() => {
		if (!avatarFile) {
			queueMicrotask(() => setAvatarPreviewUrl(""));
			return;
		}

		const objectUrl = URL.createObjectURL(avatarFile);
		queueMicrotask(() => setAvatarPreviewUrl(objectUrl));

		return () => URL.revokeObjectURL(objectUrl);
	}, [avatarFile]);

	const handleBackgroundImageSelected = (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0];
		event.target.value = "";

		if (!file?.type.startsWith("image/")) {
			return;
		}

		const reader = new FileReader();
		reader.onload = () => {
			const result = typeof reader.result === "string" ? reader.result : "";
			setSelectedBackgroundFile(file);
			setSelectedBackgroundPreview(result);
		};
		reader.readAsDataURL(file);
	};

	const applyBackgroundGradientStops = (nextStops: GradientStop[]) => {
		setBackgroundGradientStops(nextStops);
		setBackgroundValue(
			buildGradientFromStops(nextStops, DEFAULT_GRADIENT_ANGLE),
		);
		setThemePresetId("");
		setSelectedThemeId(undefined);
		setSelectedBackgroundFile(null);
		setSelectedBackgroundPreview("");
	};

	const handleAddBackgroundGradientStop = () => {
		const nextStop: GradientStop = {
			id: gradientStopIdRef.current,
			color: "#ffffff",
			position: 50,
		};

		gradientStopIdRef.current += 1;
		applyBackgroundGradientStops([...backgroundGradientStops, nextStop]);
	};

	const handleUpdateBackgroundGradientStop = (
		stopId: number,
		patch: Partial<GradientStop>,
	) => {
		applyBackgroundGradientStops(
			backgroundGradientStops.map((stop) =>
				stop.id === stopId
					? {
							...stop,
							...patch,
							position: Math.min(
								100,
								Math.max(0, patch.position ?? stop.position),
							),
						}
					: stop,
			),
		);
	};

	const handleRemoveBackgroundGradientStop = (stopId: number) => {
		if (backgroundGradientStops.length <= 2) {
			return;
		}

		applyBackgroundGradientStops(
			backgroundGradientStops.filter((stop) => stop.id !== stopId),
		);
	};

	const handleSaveRename = async () => {
		const name = renameValue.trim();
		if (!name) {
			return;
		}

		await onRename(conversation, name);
		onClose();
	};

	const handleAvatarFileSelected = (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0];
		event.target.value = "";

		if (!file?.type.startsWith("image/")) {
			return;
		}

		setAvatarFile(file);
	};

	const handleSaveAvatar = async () => {
		if (!avatarFile) {
			return;
		}

		await onChangeGroupAvatar(conversation, avatarFile);
		setAvatarFile(null);
		onClose();
	};

	const handleSaveBackground = async () => {
		const previewBackgroundRaw =
			selectedBackgroundPreview ||
			backgroundValue ||
			buildGradientFromStops(backgroundGradientStops, DEFAULT_GRADIENT_ANGLE);
		if (!previewBackgroundRaw) {
			return;
		}

		const shouldClearThemeUrl =
			!selectedBackgroundFile &&
			Boolean(conversation.theme_url) &&
			backgroundValue !== conversation.theme_url;

		await onChangeBackground(conversation, {
			background: previewBackgroundRaw,
			backgroundColor: backgroundColorValue,
			incomingBubbleColor: incomingBubbleColorValue,
			outgoingBubbleColor: outgoingBubbleColorValue,
			incomingTextColor: incomingTextColorValue,
			outgoingTextColor: outgoingTextColorValue,
			presetId: themePresetId || undefined,
			themeId: selectedThemeId,
			themeUrl:
				selectedBackgroundFile ?? (shouldClearThemeUrl ? "" : undefined),
		});
		onClose();
	};

	const themePresets = React.useMemo(
		() =>
			themes.map((item) => ({
				id: item.preset_id,
				name: item.name,
				background: item.background,
				backgroundColor: item.background_color,
				incomingBubbleColor: item.incoming_bubble_color,
				outgoingBubbleColor: item.outgoing_bubble_color,
				incomingTextColor: item.incoming_text_color,
				outgoingTextColor: item.outgoing_text_color,
				themeId: item.id,
				rawTheme: item,
			})),
		[themes],
	);

	const handleSelectThemePreset = React.useCallback((preset: ThemePreset) => {
		setThemePresetId(preset.id);
		setSelectedThemeId(preset.themeId);
		setSelectedBackgroundFile(null);
		setSelectedBackgroundPreview("");
		setBackgroundValue(preset.background);
		setBackgroundColorValue(preset.backgroundColor || preset.background);
		setIncomingBubbleColorValue(preset.incomingBubbleColor);
		setOutgoingBubbleColorValue(preset.outgoingBubbleColor);
		setIncomingTextColorValue(preset.incomingTextColor);
		setOutgoingTextColorValue(preset.outgoingTextColor);
		setBackgroundGradientStops([
			{ id: 1, color: "#ecf4ff", position: 0 },
			{ id: 2, color: "#d7e8ff", position: 100 },
		]);
	}, []);

	const clearSelectedTheme = React.useCallback(() => {
		setThemePresetId("");
	}, []);

	const handleIncomingBubbleColorChange = React.useCallback(
		(value: string) => {
			clearSelectedTheme();
			setIncomingBubbleColorValue(value);
		},
		[clearSelectedTheme],
	);

	const handleOutgoingBubbleColorChange = React.useCallback(
		(value: string) => {
			clearSelectedTheme();
			setOutgoingBubbleColorValue(value);
		},
		[clearSelectedTheme],
	);

	const handleIncomingTextColorChange = React.useCallback(
		(value: string) => {
			clearSelectedTheme();
			setIncomingTextColorValue(value);
		},
		[clearSelectedTheme],
	);

	const handleOutgoingTextColorChange = React.useCallback(
		(value: string) => {
			clearSelectedTheme();
			setOutgoingTextColorValue(value);
		},
		[clearSelectedTheme],
	);

	const handleSaveQuickReaction = async (reaction: string) => {
		await onChangeQuickReaction(conversation, reaction);
		onClose();
	};

	const previewBackgroundRaw =
		selectedBackgroundPreview ||
		backgroundValue ||
		buildGradientFromStops(backgroundGradientStops, DEFAULT_GRADIENT_ANGLE);
	const previewBackground = toRenderableChatBackground(
		previewBackgroundRaw,
		backgroundColorValue,
	);
	const previewIncomingTextColor = getReadableTextColor(
		incomingBubbleColorValue,
	);
	const previewOutgoingTextColor = getReadableTextColor(
		outgoingBubbleColorValue,
	);
	const shouldShowBackgroundOverlay =
		isImageBackgroundValue(previewBackgroundRaw);

	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					borderBottom: "1px solid",
					borderColor: "divider",
				}}
			>
				<Typography fontWeight={500}>Tùy chỉnh trò chuyện</Typography>
				<IconButton size="small" onClick={onClose}>
					<CloseIcon fontSize="small" />
				</IconButton>
			</DialogTitle>

			<Tabs
				value={customizeTab}
				onChange={(_, value) => setCustomizeTab(value as string)}
				variant="fullWidth"
			>
				{isGroup && <Tab value="rename" label="Đổi tên" />}
				{isGroup && <Tab value="avatar" label="Avatar nhóm" />}
				<Tab value="theme" label="Giao diện" />
				<Tab value="reaction" label="Biểu cảm" />
			</Tabs>

			<DialogContent ref={contentRef} sx={{ minHeight: 260, pt: 3 }}>
				{customizeTab === "rename" && isGroup && (
					<RenameTab
						renameValue={renameValue}
						onRenameValueChange={setRenameValue}
						onCancel={onClose}
						onSave={handleSaveRename}
						disabled={!renameValue.trim()}
					/>
				)}

				{customizeTab === "avatar" && isGroup && (
					<AvatarTab
						avatarPreviewUrl={avatarPreviewUrl}
						conversationAvatar={conversation.avatar}
						conversationName={conversation.name}
						avatarFile={avatarFile}
						avatarInputRef={avatarInputRef}
						onAvatarFileSelected={handleAvatarFileSelected}
						onClearAvatar={() => setAvatarFile(null)}
						onCancel={onClose}
						onSave={handleSaveAvatar}
					/>
				)}

				{customizeTab === "theme" && (
					<ThemeTab
						themePresetId={themePresetId}
						selectedThemeId={selectedThemeId}
						themePresets={themePresets}
						onSelectThemePreset={handleSelectThemePreset}
						backgroundInputRef={backgroundInputRef}
						onBackgroundImageSelected={handleBackgroundImageSelected}
						selectedBackgroundPreview={selectedBackgroundPreview}
						backgroundValue={backgroundValue}
						backgroundColorValue={backgroundColorValue}
						incomingBubbleColorValue={incomingBubbleColorValue}
						outgoingBubbleColorValue={outgoingBubbleColorValue}
						incomingTextColorValue={incomingTextColorValue}
						outgoingTextColorValue={outgoingTextColorValue}
						backgroundGradientStops={backgroundGradientStops}
						onAddBackgroundGradientStop={handleAddBackgroundGradientStop}
						onUpdateBackgroundGradientStop={handleUpdateBackgroundGradientStop}
						onRemoveBackgroundGradientStop={handleRemoveBackgroundGradientStop}
						onIncomingBubbleColorChange={handleIncomingBubbleColorChange}
						onOutgoingBubbleColorChange={handleOutgoingBubbleColorChange}
						onIncomingTextColorChange={handleIncomingTextColorChange}
						onOutgoingTextColorChange={handleOutgoingTextColorChange}
						previewBackground={previewBackground}
						previewIncomingTextColor={previewIncomingTextColor}
						previewOutgoingTextColor={previewOutgoingTextColor}
						shouldShowBackgroundOverlay={shouldShowBackgroundOverlay}
						onCancel={onClose}
						onSave={handleSaveBackground}
					/>
				)}

				{customizeTab === "reaction" && (
					<QuickReactionTab
						currentQuickReaction={conversation.quick_reaction ?? ""}
						onCancel={onClose}
						onSave={handleSaveQuickReaction}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}
