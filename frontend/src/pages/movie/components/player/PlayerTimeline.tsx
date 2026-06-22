import { Box, Slider, Typography } from "@mui/material";
import { useRef, useState } from "react";

function formatTime(sec: number): string {
	if (!Number.isFinite(sec) || Number.isNaN(sec)) return "0:00";
	const h = Math.floor(sec / 3600);
	const m = Math.floor((sec % 3600) / 60);
	const s = Math.floor(sec % 60);
	if (h > 0)
		return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
	return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface PlayerTimelineProps {
	currentTime: number;
	duration: number;
	bufferedPct: number;
	controlsOpaque: boolean;
	onSeek: (e: unknown, v: number | number[]) => void;
	onSeekStart: () => void;
	onSeekEnd: (e: unknown, v: number | number[]) => void;
}

export function PlayerTimeline({
	currentTime,
	duration,
	bufferedPct,
	controlsOpaque,
	onSeek,
	onSeekStart,
	onSeekEnd,
}: PlayerTimelineProps) {
	const timelineRef = useRef<HTMLDivElement>(null);
	const [hoverTime, setHoverTime] = useState<number | null>(null);
	const [hoverPct, setHoverPct] = useState(0);

	return (
		<Box
			ref={timelineRef}
			sx={{
				px: 2,
				pb: 0.25,
				pointerEvents: controlsOpaque ? "auto" : "none",
				position: "relative",
			}}
			onClick={(e) => e.stopPropagation()}
			onMouseMove={(e) => {
				const el = timelineRef.current;
				if (!el || !duration) return;
				const rect = el.getBoundingClientRect();
				const padPx = 16;
				const trackWidth = rect.width - padPx * 2;
				const x = Math.max(
					0,
					Math.min(e.clientX - rect.left - padPx, trackWidth),
				);
				const pct = x / trackWidth;
				setHoverPct(pct * 100);
				setHoverTime(pct * duration);
			}}
			onMouseLeave={() => setHoverTime(null)}
		>
			{/* Hover time tooltip */}
			{hoverTime !== null && (
				<Box
					sx={{
						position: "absolute",
						bottom: "calc(100% - 4px)",
						left: `calc(${hoverPct}% + 16px)`,
						transform: "translateX(-50%)",
						bgcolor: "rgba(0,0,0,0.85)",
						color: "white",
						fontSize: 12,
						fontWeight: 700,
						px: 1,
						py: 0.4,
						borderRadius: 1,
						backdropFilter: "blur(6px)",
						border: "1px solid rgba(255,255,255,0.12)",
						pointerEvents: "none",
						whiteSpace: "nowrap",
						zIndex: 10,
					}}
				>
					{formatTime(hoverTime)}
				</Box>
			)}
			<Typography
				variant="caption"
				sx={{
					color: "rgba(255,255,255,0.85)",
					display: "block",
					textAlign: "right",
					fontVariantNumeric: "tabular-nums",
					letterSpacing: 0,
					fontSize: { xs: "0.65rem", sm: "0.75rem" },
					whiteSpace: "nowrap",
					mb: 0.25,
				}}
			>
				{formatTime(currentTime)} / {formatTime(duration)}
			</Typography>
			<Slider
				value={currentTime}
				min={0}
				max={duration || 1}
				step={0.5}
				onChange={onSeek}
				onChangeCommitted={onSeekEnd}
				onMouseDown={onSeekStart}
				size="small"
				sx={{
					width: "100%",
					color: "primary.main",
					"& .MuiSlider-rail": {
						height: 4,
						opacity: 1,
						background: `linear-gradient(to right, rgba(255,255,255,0.4) ${bufferedPct}%, rgba(255,255,255,0.15) ${bufferedPct}%)`,
					},
					"& .MuiSlider-track": { height: 4 },
					"& .MuiSlider-thumb": {
						width: 14,
						height: 14,
						"&:hover": {
							boxShadow: "0 0 0 8px rgba(255,255,255,0.15)",
						},
					},
				}}
			/>
		</Box>
	);
}
