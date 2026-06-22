import type { VideoThumbProps } from "@components/messenger/types/components";
import { formatVideoDuration } from "@components/messenger/utils/format";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import { Box, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";

export const VideoThumb = ({
	src,
	duration,
	onClick,
	sx,
	playIconSize = 28,
}: VideoThumbProps) => {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const [resolvedDuration, setResolvedDuration] = useState<number | null>(
		duration ? duration / 1000 : null,
	);

	useEffect(() => {
		if (duration) {
			setResolvedDuration(duration / 1000);
			return;
		}
		const v = videoRef.current;
		if (!v) return;
		const onMeta = () => {
			if (Number.isFinite(v.duration)) setResolvedDuration(v.duration);
		};
		v.addEventListener("loadedmetadata", onMeta);
		if (Number.isFinite(v.duration) && v.duration > 0) onMeta();
		return () => v.removeEventListener("loadedmetadata", onMeta);
	}, [duration]);

	const durationLabel = resolvedDuration
		? formatVideoDuration(resolvedDuration)
		: "";

	return (
		<Box
			onClick={onClick}
			sx={{
				position: "relative",
				width: "100%",
				height: "100%",
				cursor: "pointer",
				...sx,
			}}
		>
			<Box
				component="video"
				ref={videoRef}
				src={src}
				preload="metadata"
				muted
				sx={{
					width: "100%",
					height: "100%",
					objectFit: "cover",
					display: "block",
				}}
			/>
			<Box
				sx={{
					position: "absolute",
					inset: 0,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					bgcolor: "rgba(0,0,0,0.25)",
				}}
			>
				<PlayCircleOutlineIcon
					sx={{
						color: "white",
						fontSize: playIconSize,
						filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.6))",
					}}
				/>
			</Box>
			{durationLabel && (
				<Typography
					variant="caption"
					sx={{
						position: "absolute",
						bottom: 4,
						right: 5,
						color: "#fff",
						fontSize: 10,
						fontWeight: 600,
						lineHeight: 1,
						textShadow: "0 1px 3px rgba(0,0,0,0.7)",
					}}
				>
					{durationLabel}
				</Typography>
			)}
		</Box>
	);
};
