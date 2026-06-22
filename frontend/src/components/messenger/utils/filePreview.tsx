import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import FolderZipOutlinedIcon from "@mui/icons-material/FolderZipOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import type { ReactElement } from "react";

const IMAGE_EXTS = ["png", "jpg", "jpeg", "gif", "webp"];
const ARCHIVE_EXTS = ["zip", "rar", "7z", "tar", "gz"];
const SPREADSHEET_EXTS = ["xls", "xlsx", "csv"];

export const getFileExtension = (name: string): string =>
	(name.split(".").pop()?.toUpperCase() ?? "FILE").slice(0, 6);

export const getFileColor = (mimeType: string, name: string): string => {
	const ext = name.split(".").pop()?.toLowerCase() ?? "";
	if (mimeType.includes("image") || IMAGE_EXTS.includes(ext)) return "#2196f3";
	if (ARCHIVE_EXTS.includes(ext)) return "#ff9800";
	if (SPREADSHEET_EXTS.includes(ext)) return "#4caf50";
	if (ext === "pdf") return "#f44336";
	if (["doc", "docx"].includes(ext)) return "#1565c0";
	if (["ppt", "pptx"].includes(ext)) return "#e64a19";
	return "#0288d1";
};

export const getFileIcon = (mimeType: string, name: string): ReactElement => {
	const ext = name.split(".").pop()?.toLowerCase() ?? "";
	if (mimeType.includes("image") || IMAGE_EXTS.includes(ext)) {
		return <ImageOutlinedIcon sx={{ fontSize: 28, color: "primary.main" }} />;
	}
	if (ARCHIVE_EXTS.includes(ext)) {
		return (
			<FolderZipOutlinedIcon sx={{ fontSize: 28, color: "warning.main" }} />
		);
	}
	if (SPREADSHEET_EXTS.includes(ext)) {
		return (
			<TableChartOutlinedIcon sx={{ fontSize: 28, color: "success.main" }} />
		);
	}
	return <ArticleOutlinedIcon sx={{ fontSize: 28, color: "info.main" }} />;
};
