export const formatFileSize = (bytes?: number) => {
	if (!bytes || bytes <= 0) return "";

	const units = ["B", "KB", "MB", "GB", "TB"];
	let size = bytes;
	let unitIndex = 0;

	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex++;
	}

	return `${size.toFixed(size < 10 && unitIndex > 0 ? 2 : 1)} ${units[unitIndex]}`;
};
