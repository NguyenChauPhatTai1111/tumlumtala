import type { ImagePreview } from "@components/messenger/composer/types";

export const ALLOWED_IMAGE_MIME_TYPES = [
	"image/jpeg",
	"image/jpg",
	"image/png",
	"image/gif",
	"image/webp",
] as const;

export const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_IMAGE_FILES = 10;

export const createImagePreview = (file: File): ImagePreview => ({
	file,
	preview: URL.createObjectURL(file),
	addedAt: Date.now(),
});

export const validateImageFiles = (files: File[], currentCount: number) => {
	const validFiles: File[] = [];
	const errors: string[] = [];

	for (const file of files) {
		if (
			!ALLOWED_IMAGE_MIME_TYPES.includes(
				file.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number],
			)
		) {
			errors.push(`${file.name} không phải định dạng ảnh hợp lệ`);
			continue;
		}

		if (file.size > MAX_IMAGE_FILE_SIZE) {
			errors.push(`${file.name} vượt quá 10MB`);
			continue;
		}

		validFiles.push(file);
	}

	if (currentCount + validFiles.length > MAX_IMAGE_FILES) {
		errors.push(`Chỉ được chọn tối đa ${MAX_IMAGE_FILES} ảnh`);

		return {
			validFiles: validFiles.slice(
				0,
				Math.max(0, MAX_IMAGE_FILES - currentCount),
			),
			errors,
		};
	}

	return {
		validFiles,
		errors,
	};
};
