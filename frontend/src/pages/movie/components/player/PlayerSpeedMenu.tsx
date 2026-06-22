import SpeedIcon from "@mui/icons-material/Speed";
import { alpha, Box, Tooltip, useTheme } from "@mui/material";
import type React from "react";

interface PlayerSpeedMenuProps {
	speed: number;
	speedOptions: number[];
	speedMenuOpen: boolean;
	speedMenuRef: React.RefObject<HTMLDivElement | null>;
	onToggleMenu: () => void;
	onSelectSpeed: (s: number) => void;
}

export function PlayerSpeedMenu({
	speed,
	speedOptions,
	speedMenuOpen,
	speedMenuRef,
	onToggleMenu,
	onSelectSpeed,
}: PlayerSpeedMenuProps) {
	const theme = useTheme();
	return (
		<Box ref={speedMenuRef} sx={{ position: "relative" }}>
			<Tooltip title="Tốc độ phát">
				<Box
					component="button"
					onClick={(e) => {
						e.stopPropagation();
						onToggleMenu();
					}}
					sx={{
						display: "flex",
						alignItems: "center",
						gap: 0.5,
						px: 1,
						py: 0.5,
						borderRadius: 1,
						bgcolor: "rgba(255,255,255,0.15)",
						border: "none",
						color: "white",
						cursor: "pointer",
						fontFamily: "inherit",
						fontSize: 12,
						fontWeight: 700,
						backdropFilter: "blur(4px)",
						"&:hover": { bgcolor: "rgba(255,255,255,0.25)" },
					}}
				>
					<SpeedIcon sx={{ fontSize: 24 }} />
					{speed}x
				</Box>
			</Tooltip>
			{speedMenuOpen && (
				<Box
					sx={{
						position: "absolute",
						bottom: "calc(100% + 6px)",
						right: 0,
						bgcolor: alpha(theme.palette.background.paper, 0.95),
						backdropFilter: "blur(12px)",
						borderRadius: 1.5,
						border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
						overflow: "hidden",
						minWidth: 72,
						boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
						zIndex: 20,
					}}
					onClick={(e) => e.stopPropagation()}
				>
					{speedOptions.map((s) => (
						<Box
							key={s}
							onClick={() => onSelectSpeed(s)}
							sx={{
								px: 2,
								py: 0.75,
								fontSize: 13,
								fontWeight: speed === s ? 700 : 400,
								color: speed === s ? "primary.main" : "text.primary",
								cursor: "pointer",
								textAlign: "center",
								"&:hover": { bgcolor: theme.palette.action.hover },
							}}
						>
							{s}x
						</Box>
					))}
				</Box>
			)}
		</Box>
	);
}
