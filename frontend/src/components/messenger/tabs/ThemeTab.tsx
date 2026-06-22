import type {
	ThemePreset,
	ThemeTabProps,
} from "@components/messenger/types/components";
import { theme_PRESETS } from "@constants/messenger";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import {
	Box,
	Button,
	IconButton,
	Stack,
	TextField,
	Typography,
} from "@mui/material";

export type { ThemePreset };

export default function ThemeTab({
	themePresetId,
	selectedThemeId,
	themePresets,
	onSelectThemePreset,
	backgroundInputRef,
	onBackgroundImageSelected,
	backgroundColorValue,
	incomingBubbleColorValue,
	outgoingBubbleColorValue,
	incomingTextColorValue,
	outgoingTextColorValue,
	backgroundGradientStops,
	onAddBackgroundGradientStop,
	onUpdateBackgroundGradientStop,
	onRemoveBackgroundGradientStop,
	onIncomingBubbleColorChange,
	onOutgoingBubbleColorChange,
	onIncomingTextColorChange,
	onOutgoingTextColorChange,
	previewBackground,
	previewIncomingTextColor,
	previewOutgoingTextColor,
	shouldShowBackgroundOverlay,
	onCancel,
	onSave,
}: ThemeTabProps) {
	const presets = themePresets?.length ? themePresets : theme_PRESETS;

	return (
		<Box sx={{ display: "grid", gap: 2 }}>
			<Typography variant="body2" color="text.secondary">
				Thay đổi giao diện cuộc trò chuyện
			</Typography>

			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "1fr", md: "1.2fr 1fr" },
					gap: 2,
				}}
			>
				<Box>
					<input
						ref={backgroundInputRef}
						accept="image/*"
						hidden
						type="file"
						onChange={onBackgroundImageSelected}
					/>
					<Button
						variant="outlined"
						onClick={() => backgroundInputRef.current?.click()}
					>
						Chọn hình từ máy
					</Button>
					<Typography
						variant="caption"
						color="text.secondary"
						sx={{ display: "block", mt: 1 }}
					>
						Hoặc chọn giao diện có sẵn
					</Typography>
					<Box
						sx={{
							display: "grid",
							gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
							gap: 0.8,
							mt: 1,
						}}
					>
						{presets.map((preset) => {
							const presetThemeId = (preset as { themeId?: number }).themeId;
							const isActive =
								selectedThemeId != null && presetThemeId != null
									? selectedThemeId === presetThemeId
									: themePresetId === preset.id;
							return (
								<Box
									key={preset.id}
									role="button"
									tabIndex={0}
									onClick={() => onSelectThemePreset(preset)}
									onKeyDown={(event) => {
										if (event.key === "Enter" || event.key === " ") {
											event.preventDefault();
											onSelectThemePreset(preset);
										}
									}}
									sx={{
										display: "flex",
										flexDirection: "column",
										alignItems: "center",
										gap: 0.4,
										cursor: "pointer",
										px: 0.25,
										py: 0.5,
										borderRadius: 1,
										outline: "none",
										border: "1px solid",
										borderColor: isActive ? "primary.main" : "transparent",
										bgcolor: isActive ? "action.hover" : "transparent",
										transition: "all .16s ease",
										"&:hover": { bgcolor: "action.hover" },
										"&:focus-visible": {
											borderColor: "primary.main",
											boxShadow: (theme) =>
												`0 0 0 2px ${theme.palette.primary.main}33`,
										},
									}}
								>
									<Box
										sx={{
											width: 34,
											height: 34,
											borderRadius: "50%",
											background: preset.background,
											border: "2px solid",
											borderColor: isActive
												? "primary.main"
												: "rgba(148,163,184,0.44)",
											boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.36)",
										}}
									/>
									<Typography
										variant="caption"
										sx={{
											textAlign: "center",
											lineHeight: 1.2,
											fontSize: "0.62rem",
											fontWeight: isActive ? 700 : 500,
											color: isActive ? "text.primary" : "text.secondary",
										}}
									>
										{preset.name}
									</Typography>
								</Box>
							);
						})}
					</Box>
				</Box>

				<Box>
					<Box
						sx={{
							p: 1.25,
							border: "1px solid",
							borderColor: "divider",
							borderRadius: 1,
							mt: 2,
						}}
					>
						<Box
							sx={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								mb: 1,
							}}
						>
							<Typography variant="caption" sx={{ fontWeight: 700 }}>
								Tùy chỉnh màu nền
							</Typography>
							<IconButton size="small" onClick={onAddBackgroundGradientStop}>
								<AddIcon fontSize="small" />
							</IconButton>
						</Box>
						<Stack spacing={1}>
							{backgroundGradientStops.map((stop) => (
								<Stack
									key={stop.id}
									direction="row"
									spacing={1}
									alignItems="center"
								>
									<TextField
										type="color"
										size="small"
										value={stop.color}
										onChange={(event) =>
											onUpdateBackgroundGradientStop(stop.id, {
												color: event.target.value,
											})
										}
										sx={{ width: 72 }}
									/>
									<TextField
										type="number"
										size="small"
										label="%"
										value={stop.position}
										onChange={(event) =>
											onUpdateBackgroundGradientStop(stop.id, {
												position: Number(event.target.value),
											})
										}
										InputProps={{ inputProps: { min: 0, max: 100 } }}
										sx={{ width: 90 }}
									/>
									<IconButton
										size="small"
										disabled={backgroundGradientStops.length <= 2}
										onClick={() => onRemoveBackgroundGradientStop(stop.id)}
									>
										<CloseIcon fontSize="small" />
									</IconButton>
								</Stack>
							))}
						</Stack>
					</Box>

					<Box
						sx={{
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: 1.5,
							mt: 2,
						}}
					>
						<TextField
							type="color"
							label="Màu tin nhắn của người khác"
							value={incomingBubbleColorValue}
							onChange={(event) =>
								onIncomingBubbleColorChange(event.target.value)
							}
							InputLabelProps={{ shrink: true }}
						/>
						<TextField
							type="color"
							label="Màu tin nhắn của bạn"
							value={outgoingBubbleColorValue}
							onChange={(event) =>
								onOutgoingBubbleColorChange(event.target.value)
							}
							InputLabelProps={{ shrink: true }}
						/>
					</Box>

					<Box
						sx={{
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: 1.5,
							mt: 2,
						}}
					>
						<TextField
							type="color"
							label="Màu chữ người khác"
							value={incomingTextColorValue}
							onChange={(event) =>
								onIncomingTextColorChange(event.target.value)
							}
							InputLabelProps={{ shrink: true }}
						/>

						<TextField
							type="color"
							label="Màu chữ của bạn"
							value={outgoingTextColorValue}
							onChange={(event) =>
								onOutgoingTextColorChange(event.target.value)
							}
							InputLabelProps={{ shrink: true }}
						/>
					</Box>
				</Box>
			</Box>
			<Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
				<Box
					sx={{
						borderRadius: 1.5,
						border: "1px solid",
						borderColor: "divider",
						overflow: "hidden",
					}}
				>
					<Typography
						variant="caption"
						sx={{
							display: "block",
							px: 1.25,
							py: 0.75,
							color: "text.primary",
							bgcolor: "background.paper",
						}}
					>
						Xem trước giao diện chat
					</Typography>
					<Box
						sx={{
							position: "relative",
							px: 1.25,
							py: 1.5,
							minHeight: 200,
							...(previewBackground
								? {
										background: previewBackground,
										backgroundSize: "cover",
										backgroundPosition: "center",
									}
								: { bgcolor: backgroundColorValue }),
							...(shouldShowBackgroundOverlay
								? {
										"&::before": {
											content: '""',
											position: "absolute",
											inset: 0,
											background: "rgba(14, 23, 38, 0.34)",
										},
										"& > *": {
											position: "relative",
											zIndex: 1,
										},
									}
								: null),
						}}
					>
						<Box sx={{ display: "flex", justifyContent: "flex-start", mb: 1 }}>
							<Box
								sx={{
									maxWidth: "82%",
									px: 1.2,
									py: 0.8,
									borderRadius: 2,
									bgcolor: incomingBubbleColorValue,
									color: incomingTextColorValue ?? previewIncomingTextColor,
									fontSize: 13,
									boxShadow: 1,
								}}
							>
								Tin nhắn từ người khác sẽ được hiển thị như thế này.
							</Box>
						</Box>
						<Box sx={{ display: "flex", justifyContent: "flex-end" }}>
							<Box
								sx={{
									maxWidth: "82%",
									px: 1.2,
									py: 0.8,
									borderRadius: 2,
									bgcolor: outgoingBubbleColorValue,
									color: outgoingTextColorValue ?? previewOutgoingTextColor,
									fontSize: 13,
									boxShadow: 1,
								}}
							>
								Tin nhắn của bạn sẽ được hiển thị như thế này.
							</Box>
						</Box>
					</Box>
				</Box>
			</Box>

			<Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
				<Button onClick={onCancel}>Hủy</Button>
				<Button variant="contained" onClick={onSave}>
					Lưu
				</Button>
			</Box>
		</Box>
	);
}
