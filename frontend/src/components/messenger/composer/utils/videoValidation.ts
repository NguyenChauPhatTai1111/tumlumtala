import type { VideoPreview } from "@components/messenger/composer/types";

export const ALLOWED_VIDEO_MIME_TYPES = [
	"video/mp4",
	"video/webm",
	"video/ogg",
	"video/quicktime",
] as const;

export const MAX_VIDEO_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_VIDEO_FILES = 5;

export const createVideoPreview = async (file: File): Promise<VideoPreview> => {
	const duration = await getVideoDuration(file);

	return {
		file,
		preview: URL.createObjectURL(file),
		addedAt: Date.now(),
		duration,
	};
};

export const getVideoDuration = (file: File): Promise<number> => {
	return new Promise((resolve, reject) => {
		const video = document.createElement("video");

		video.preload = "metadata";

		video.onloadedmetadata = () => {
			URL.revokeObjectURL(video.src);
			resolve(video.duration);
		};

		video.onerror = () => {
			URL.revokeObjectURL(video.src);
			reject(new Error("Cannot read video duration"));
		};

		video.src = URL.createObjectURL(file);
	});
};

export const validateVideoFiles = (files: File[], currentCount: number) => {
	const validFiles: File[] = [];
	const errors: string[] = [];

	for (const file of files) {
		if (
			!ALLOWED_VIDEO_MIME_TYPES.includes(
				file.type as (typeof ALLOWED_VIDEO_MIME_TYPES)[number],
			)
		) {
			errors.push(
				`${file.name} không phải định dạng video hợp lệ (mp4, webm, mov)`,
			);
			continue;
		}

		if (file.size > MAX_VIDEO_FILE_SIZE) {
			errors.push(`${file.name} vượt quá 50MB`);
			continue;
		}

		validFiles.push(file);
	}

	if (currentCount + validFiles.length > MAX_VIDEO_FILES) {
		errors.push(`Chỉ được chọn tối đa ${MAX_VIDEO_FILES} video`);
		return {
			validFiles: validFiles.slice(
				0,
				Math.max(0, MAX_VIDEO_FILES - currentCount),
			),
			errors,
		};
	}

	return { validFiles, errors };
};
