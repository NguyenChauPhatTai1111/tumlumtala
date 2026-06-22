import type { FilePreview } from "@components/messenger/composer/types";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_FILES = 5;

export const useFileAttachments = (
	initialFiles: FilePreview[] = [],
	onFilesChange?: (files: FilePreview[]) => void,
) => {
	const [selectedFiles, setSelectedFiles] =
		useState<FilePreview[]>(initialFiles);
	const [fileError, setFileError] = useState("");
	const onFilesChangeRef = useRef(onFilesChange);
	useEffect(() => {
		onFilesChangeRef.current = onFilesChange;
	}, [onFilesChange]);

	useEffect(() => {
		setSelectedFiles((prev) => {
			const areEqual =
				prev.length === initialFiles.length &&
				prev.every((f, i) => f.name === initialFiles[i]?.name);
			return areEqual ? prev : initialFiles;
		});
	}, [initialFiles]);

	const handleSelectFile = useCallback(
		(event: ChangeEvent<HTMLInputElement>, onCompleted?: () => void) => {
			const files = Array.from(event.target.files ?? []);
			event.target.value = "";

			if (!files.length) return;

			const errors: string[] = [];
			const validFiles: FilePreview[] = [];

			for (const file of files) {
				if (file.size > MAX_FILE_SIZE_BYTES) {
					errors.push(`${file.name} vượt quá ${MAX_FILE_SIZE_MB}MB`);
					continue;
				}
				validFiles.push({
					file,
					name: file.name,
					size: file.size,
					mimeType: file.type,
					addedAt: Date.now(),
				});
			}

			if (validFiles.length > 0) {
				setSelectedFiles((prev) => {
					const remaining = MAX_FILES - prev.length;
					if (remaining <= 0) return prev;
					const result = [...prev, ...validFiles.slice(0, remaining)];
					onFilesChangeRef.current?.(result);
					return result;
				});

				if (selectedFiles.length + validFiles.length > MAX_FILES) {
					errors.push(`Chỉ được chọn tối đa ${MAX_FILES} tệp`);
				}

				onCompleted?.();
			}

			if (errors.length > 0) setFileError(errors.join(", "));
			else setFileError("");
		},
		[selectedFiles.length],
	);

	const handleRemoveFile = useCallback(
		(index: number, onCompleted?: () => void) => {
			setSelectedFiles((prev) => {
				const result = prev.filter((_, i) => i !== index);
				onFilesChangeRef.current?.(result);
				return result;
			});
			setFileError("");
			onCompleted?.();
		},
		[],
	);

	const clearSelectedFiles = useCallback(() => {
		setSelectedFiles([]);
		onFilesChangeRef.current?.([]);
		setFileError("");
	}, []);

	const isCanSend = useMemo(
		() => selectedFiles.length > 0,
		[selectedFiles.length],
	);

	return {
		selectedFiles,
		fileError,
		isCanSend,
		handleSelectFile,
		handleRemoveFile,
		clearSelectedFiles,
	};
};
