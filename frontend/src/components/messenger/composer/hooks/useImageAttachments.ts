import type { ImagePreview } from "@components/messenger/composer/types";
import {
	createImagePreview,
	MAX_IMAGE_FILES,
	validateImageFiles,
} from "@components/messenger/composer/utils/imageValidation";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const useImageAttachments = (
	initialImages: ImagePreview[] = [],
	onImagesChange?: (images: ImagePreview[]) => void,
) => {
	const [selectedImages, setSelectedImages] =
		useState<ImagePreview[]>(initialImages);
	const [fileError, setFileError] = useState("");
	const onImagesChangeRef = useRef(onImagesChange);
	const selectedImagesRef = useRef(selectedImages);

	useEffect(() => {
		onImagesChangeRef.current = onImagesChange;
	}, [onImagesChange]);

	useEffect(() => {
		selectedImagesRef.current = selectedImages;
	}, [selectedImages]);

	useEffect(() => {
		setSelectedImages((prev) => {
			const areImagesEqual =
				prev.length === initialImages.length &&
				prev.every(
					(image, index) =>
						image.preview === initialImages[index]?.preview &&
						image.file === initialImages[index]?.file,
				);

			return areImagesEqual ? prev : initialImages;
		});
	}, [initialImages]);

	const handleSelectImages = useCallback(
		(event: ChangeEvent<HTMLInputElement>, onCompleted?: () => void) => {
			const files = Array.from(event.target.files ?? []);

			if (!files.length) {
				return;
			}

			const { validFiles, errors } = validateImageFiles(
				files,
				selectedImagesRef.current.length,
			);

			if (errors.length > 0) {
				setFileError(errors.join(", "));
			} else {
				setFileError("");
			}

			if (validFiles.length > 0) {
				const newPreviews = validFiles.map(createImagePreview);
				const next = [...selectedImagesRef.current, ...newPreviews];
				const normalized =
					next.length > MAX_IMAGE_FILES ? next.slice(0, MAX_IMAGE_FILES) : next;

				setSelectedImages(normalized);
				onImagesChangeRef.current?.(normalized);

				onCompleted?.();
			}

			event.target.value = "";
		},
		[],
	);

	const handleRemoveImage = useCallback(
		(index: number, onCompleted?: () => void) => {
			URL.revokeObjectURL(selectedImagesRef.current[index]?.preview);
			const next = selectedImagesRef.current.filter(
				(_, itemIndex) => itemIndex !== index,
			);
			setSelectedImages(next);
			onImagesChangeRef.current?.(next);

			setFileError("");
			onCompleted?.();
		},
		[],
	);

	const clearSelectedImages = useCallback((options?: { revoke?: boolean }) => {
		if (options?.revoke ?? true) {
			selectedImagesRef.current.forEach((image) => {
				URL.revokeObjectURL(image.preview);
			});
		}
		setSelectedImages([]);
		onImagesChangeRef.current?.([]);
		setFileError("");
	}, []);

	const isCanSend = useMemo(
		() => selectedImages.length > 0,
		[selectedImages.length],
	);

	return {
		selectedImages,
		fileError,
		isCanSend,
		handleSelectImages,
		handleRemoveImage,
		clearSelectedImages,
	};
};
