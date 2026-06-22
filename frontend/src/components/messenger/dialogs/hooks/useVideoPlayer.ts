import { useCallback, useEffect, useRef, useState } from "react";

export const SPEED_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3] as const;

export type UseVideoPlayerReturn = {
	videoRef: React.RefObject<HTMLVideoElement | null>;
	imageViewerRef: React.RefObject<HTMLDivElement | null>;
	autoPlayRef: React.RefObject<boolean>;
	videoPlaying: boolean;
	videoSpeed: number;
	videoCurrentTime: number;
	videoDuration: number;
	videoMuted: boolean;
	videoVolume: number;
	videoRenderedWidth: number | null;
	isFullscreen: boolean;
	controlsVisible: boolean;
	canSeek: boolean;
	showVideoControls: boolean;
	setVideoPlaying: (v: boolean) => void;
	setVideoCurrentTime: (v: number) => void;
	setVideoDuration: (v: number) => void;
	setVideoMuted: (v: boolean) => void;
	setVideoVolume: (v: number) => void;
	handleVideoPlayPause: () => void;
	handleVideoRestart: () => void;
	handleToggleMute: () => void;
	handleVolumeChange: (value: number) => void;
	handleSpeedChange: (speed: number) => void;
	handleSeekBackward: () => void;
	handleSeekForward: () => void;
	handleToggleFullscreen: () => void;
	handleVideoAreaMouseEnter: () => void;
	handleVideoAreaMouseLeave: () => void;
	handleVideoWrapperClick: () => void;
	resetVideoState: () => void;
};

export function useVideoPlayer(isVideo: boolean): UseVideoPlayerReturn {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const imageViewerRef = useRef<HTMLDivElement | null>(null);
	const autoPlayRef = useRef(false);
	const controlsHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);

	const [videoPlaying, setVideoPlaying] = useState(false);
	const [videoSpeed, setVideoSpeed] = useState(1);
	const [videoCurrentTime, setVideoCurrentTime] = useState(0);
	const [videoDuration, setVideoDuration] = useState(0);
	const [videoMuted, setVideoMuted] = useState(false);
	const [videoVolume, setVideoVolume] = useState(1);
	const [videoRenderedWidth, setVideoRenderedWidth] = useState<number | null>(
		null,
	);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [controlsVisible, setControlsVisible] = useState(true);

	const canSeek = videoDuration >= 300;
	const showVideoControls = !isVideo || !videoPlaying || controlsVisible;

	const updateVideoRenderedSize = useCallback(() => {
		const v = videoRef.current;
		if (!v) return;
		const container = v.parentElement;
		if (!container) return;
		const containerWidth = container.clientWidth;
		const containerHeight = container.clientHeight;
		const videoRatio = v.videoWidth / v.videoHeight;
		const containerRatio = containerWidth / containerHeight;
		const renderedWidth =
			videoRatio > containerRatio
				? containerWidth
				: containerHeight * videoRatio;
		setVideoRenderedWidth(renderedWidth);
	}, []);

	const resetVideoState = useCallback(() => {
		setVideoPlaying(false);
		setVideoSpeed(1);
		setVideoCurrentTime(0);
		setVideoDuration(0);
		setVideoRenderedWidth(null);
		setControlsVisible(true);
	}, []);

	const handleVideoPlayPause = useCallback(() => {
		const v = videoRef.current;
		if (!v) return;
		if (v.paused) {
			v.play();
		} else {
			v.pause();
		}
	}, []);

	const handleVideoRestart = () => {
		const v = videoRef.current;
		if (!v) return;
		v.currentTime = 0;
		setVideoCurrentTime(0);
		v.play().catch(() => {});
	};

	const handleToggleMute = () => {
		const v = videoRef.current;
		if (!v) return;
		const next = !videoMuted;
		v.muted = next;
		setVideoMuted(next);
	};

	const handleVolumeChange = (value: number) => {
		const v = videoRef.current;
		if (!v) return;
		v.volume = value;
		setVideoVolume(value);
		if (value > 0 && videoMuted) {
			v.muted = false;
			setVideoMuted(false);
		}
	};

	const handleSpeedChange = (speed: number) => {
		setVideoSpeed(speed);
		if (videoRef.current) {
			videoRef.current.playbackRate = speed;
		}
	};

	const handleSeekBackward = useCallback(() => {
		const v = videoRef.current;
		if (!v) return;
		v.currentTime = Math.max(0, v.currentTime - 10);
	}, []);

	const handleSeekForward = useCallback(() => {
		const v = videoRef.current;
		if (!v) return;
		v.currentTime = Math.min(
			v.duration || Number.MAX_SAFE_INTEGER,
			v.currentTime + 10,
		);
	}, []);

	const handleToggleFullscreen = useCallback(() => {
		if (!isFullscreen) {
			imageViewerRef.current?.requestFullscreen().catch(() => {});
		} else {
			document.exitFullscreen().catch(() => {});
		}
	}, [isFullscreen]);

	const handleVideoAreaMouseEnter = useCallback(() => {
		if (!isVideo) return;
		if (controlsHideTimerRef.current)
			clearTimeout(controlsHideTimerRef.current);
		setControlsVisible(true);
	}, [isVideo]);

	const handleVideoAreaMouseLeave = useCallback(() => {
		if (!isVideo || !videoPlaying) return;
		controlsHideTimerRef.current = setTimeout(
			() => setControlsVisible(false),
			800,
		);
	}, [isVideo, videoPlaying]);

	const handleVideoWrapperClick = useCallback(() => {
		if (!isVideo) return;
		if (controlsHideTimerRef.current)
			clearTimeout(controlsHideTimerRef.current);
		setControlsVisible((v) => !v);
	}, [isVideo]);

	useEffect(() => {
		const v = videoRef.current;
		if (!v || !isVideo) {
			setVideoRenderedWidth(null);
			return;
		}
		const observer = new ResizeObserver(() => {
			setVideoRenderedWidth(v.getBoundingClientRect().width || null);
		});
		observer.observe(v);
		return () => observer.disconnect();
	}, [isVideo]);

	useEffect(() => {
		const v = videoRef.current;
		if (!v || !isVideo) {
			setVideoRenderedWidth(null);
			return;
		}
		const resize = () => updateVideoRenderedSize();
		v.addEventListener("loadedmetadata", resize);
		const observer = new ResizeObserver(resize);
		if (v.parentElement) observer.observe(v.parentElement);
		resize();
		return () => {
			v.removeEventListener("loadedmetadata", resize);
			observer.disconnect();
		};
	}, [isVideo, updateVideoRenderedSize]);

	useEffect(() => {
		const handler = () => setIsFullscreen(!!document.fullscreenElement);
		document.addEventListener("fullscreenchange", handler);
		return () => document.removeEventListener("fullscreenchange", handler);
	}, []);

	return {
		videoRef,
		imageViewerRef,
		autoPlayRef,
		videoPlaying,
		videoSpeed,
		videoCurrentTime,
		videoDuration,
		videoMuted,
		videoVolume,
		videoRenderedWidth,
		isFullscreen,
		controlsVisible,
		canSeek,
		showVideoControls,
		setVideoPlaying,
		setVideoCurrentTime,
		setVideoDuration,
		setVideoMuted,
		setVideoVolume,
		handleVideoPlayPause,
		handleVideoRestart,
		handleToggleMute,
		handleVolumeChange,
		handleSpeedChange,
		handleSeekBackward,
		handleSeekForward,
		handleToggleFullscreen,
		handleVideoAreaMouseEnter,
		handleVideoAreaMouseLeave,
		handleVideoWrapperClick,
		resetVideoState,
	};
}
