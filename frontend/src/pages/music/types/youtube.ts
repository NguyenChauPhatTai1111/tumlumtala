export type YouTubePlayer = {
	playVideo: () => void;
	pauseVideo: () => void;
	seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
	getCurrentTime: () => number;
	getDuration: () => number;
	getVolume: () => number;
	setVolume: (volume: number) => void;
	getAvailablePlaybackRates: () => number[];
	getPlaybackRate: () => number;
	setPlaybackRate: (rate: number) => void;
	getAvailableQualityLevels: () => string[];
	getPlaybackQuality: () => string;
	setPlaybackQuality: (quality: string) => void;
	mute: () => void;
	unMute: () => void;
	isMuted: () => boolean;
	destroy: () => void;
};

export type YouTubeApi = {
	Player: new (
		element: HTMLElement,
		options: {
			videoId: string;
			playerVars?: Record<string, string | number>;
			events?: {
				onReady?: (event: { target: YouTubePlayer }) => void;
				onError?: (event: {
					data: number;
					target: YouTubePlayer;
				}) => void;
				onStateChange?: (event: {
					data: number;
					target: YouTubePlayer;
				}) => void;
			};
		},
	) => YouTubePlayer;
	PlayerState: {
		ENDED: number;
		PLAYING: number;
		PAUSED: number;
	};
};

declare global {
	interface Window {
		YT?: YouTubeApi;
		onYouTubeIframeAPIReady?: () => void;
	}
}

let youtubeApiPromise: Promise<YouTubeApi> | null = null;

export const loadYouTubeIframeApi = (): Promise<YouTubeApi> => {
	if (window.YT?.Player) {
		return Promise.resolve(window.YT);
	}

	if (!youtubeApiPromise) {
		youtubeApiPromise = new Promise<YouTubeApi>((resolve) => {
			const previousReady = window.onYouTubeIframeAPIReady;
			window.onYouTubeIframeAPIReady = () => {
				previousReady?.();
				if (window.YT) resolve(window.YT);
			};

			if (
				!document.querySelector(
					'script[src="https://www.youtube.com/iframe_api"]',
				)
			) {
				const script = document.createElement("script");
				script.src = "https://www.youtube.com/iframe_api";
				script.async = true;
				document.body.appendChild(script);
			}
		});
	}

	return youtubeApiPromise;
};
