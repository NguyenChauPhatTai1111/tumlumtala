import type { VideoPreview } from "@components/messenger/composer/types";
import {
	createVideoPreview,
	MAX_VIDEO_FILES,
	validateVideoFiles,
} from "@components/messenger/composer/utils/videoValidation";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const useVideoAttachments = (
	initialVideos: VideoPreview[] = [],
	onVideosChange?: (videos: VideoPreview[]) => void,
) => {
	const [selectedVideos, setSelectedVideos] =
		useState<VideoPreview[]>(initialVideos);
	const [fileError, setFileError] = useState("");
	const onVideosChangeRef = useRef(onVideosChange);
	useEffect(() => {
		onVideosChangeRef.current = onVideosChange;
	}, [onVideosChange]);

	useEffect(() => {
		setSelectedVideos((prev) => {
			const areEqual =
				prev.length === initialVideos.length &&
				prev.every((v, i) => v.preview === initialVideos[i]?.preview);
			return areEqual ? prev : initialVideos;
		});
	}, [initialVideos]);

	const handleSelectVideo = useCallback(
		async (event: ChangeEvent<HTMLInputElement>, onCompleted?: () => void) => {
			const files = Array.from(event.target.files ?? []);

			if (!files.length) {
				return;
			}

			const { validFiles, errors } = validateVideoFiles(
				files,
				selectedVideos.length,
			);

			if (errors.length > 0) {
				setFileError(errors.join(", "));
			} else {
				setFileError("");
			}

			if (validFiles.length > 0) {
				try {
					const previews = await Promise.all(
						validFiles.map(createVideoPreview),
					);

					setSelectedVideos((prev) => {
						const next = [...prev, ...previews];

						const result =
							next.length > MAX_VIDEO_FILES
								? next.slice(0, MAX_VIDEO_FILES)
								: next;

						onVideosChangeRef.current?.(result);

						return result;
					});

					onCompleted?.();
				} catch (error) {
					console.error("Failed to load video metadata:", error);
					setFileError("Không thể đọc thông tin video");
				}
			}

			event.target.value = "";
		},
		[selectedVideos.length],
	);

	const handleRemoveVideo = useCallback(
		(index: number, onCompleted?: () => void) => {
			setSelectedVideos((prev) => {
				URL.revokeObjectURL(prev[index]?.preview);
				const result = prev.filter((_, i) => i !== index);
				onVideosChangeRef.current?.(result);
				return result;
			});
			setFileError("");
			onCompleted?.();
		},
		[],
	);

	const clearSelectedVideos = useCallback((options?: { revoke?: boolean }) => {
		setSelectedVideos((prev) => {
			if (options?.revoke ?? true) {
				for (const v of prev) URL.revokeObjectURL(v.preview);
			}
			onVideosChangeRef.current?.([]);
			return [];
		});
		setFileError("");
	}, []);

	const isCanSend = useMemo(
		() => selectedVideos.length > 0,
		[selectedVideos.length],
	);

	return {
		selectedVideos,
		fileError,
		isCanSend,
		handleSelectVideo,
		handleRemoveVideo,
		clearSelectedVideos,
	};
};
