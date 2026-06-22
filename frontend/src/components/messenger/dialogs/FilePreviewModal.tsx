import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import Brightness4OutlinedIcon from "@mui/icons-material/Brightness4Outlined";
import Brightness7OutlinedIcon from "@mui/icons-material/Brightness7Outlined";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import FolderZipOutlinedIcon from "@mui/icons-material/FolderZipOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import SlideshowOutlinedIcon from "@mui/icons-material/SlideshowOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import {
	Box,
	Button,
	Dialog,
	DialogContent,
	DialogTitle,
	IconButton,
	Tooltip,
	Typography,
} from "@mui/material";
import type { ReactNode } from "react";
import { useState } from "react";
import { ExcelPreview } from "./ExcelPreview";

export interface FileIconConfig {
	icon: ReactNode;
	color: string;
	label: string;
}

const FILE_CONFIGS: Record<string, FileIconConfig> = {
	".pdf": {
		icon: <ArticleOutlinedIcon sx={{ color: "#fff", fontSize: 20 }} />,
		color: "#e53935",
		label: "PDF",
	},
	".doc": {
		icon: <ArticleOutlinedIcon sx={{ color: "#fff", fontSize: 20 }} />,
		color: "#1565c0",
		label: "Word",
	},
	".docx": {
		icon: <ArticleOutlinedIcon sx={{ color: "#fff", fontSize: 20 }} />,
		color: "#1565c0",
		label: "Word",
	},
	".xls": {
		icon: <TableChartOutlinedIcon sx={{ color: "#fff", fontSize: 20 }} />,
		color: "#2e7d32",
		label: "Excel",
	},
	".xlsx": {
		icon: <TableChartOutlinedIcon sx={{ color: "#fff", fontSize: 20 }} />,
		color: "#2e7d32",
		label: "Excel",
	},
	".csv": {
		icon: <TableChartOutlinedIcon sx={{ color: "#fff", fontSize: 20 }} />,
		color: "#2e7d32",
		label: "CSV",
	},
	".ppt": {
		icon: <SlideshowOutlinedIcon sx={{ color: "#fff", fontSize: 20 }} />,
		color: "#e65100",
		label: "PowerPoint",
	},
	".pptx": {
		icon: <SlideshowOutlinedIcon sx={{ color: "#fff", fontSize: 20 }} />,
		color: "#e65100",
		label: "PowerPoint",
	},
	".zip": {
		icon: <FolderZipOutlinedIcon sx={{ color: "#fff", fontSize: 20 }} />,
		color: "#7b1fa2",
		label: "ZIP",
	},
	".rar": {
		icon: <FolderZipOutlinedIcon sx={{ color: "#fff", fontSize: 20 }} />,
		color: "#7b1fa2",
		label: "RAR",
	},
	".7z": {
		icon: <FolderZipOutlinedIcon sx={{ color: "#fff", fontSize: 20 }} />,
		color: "#7b1fa2",
		label: "7-Zip",
	},
	".txt": {
		icon: <ArticleOutlinedIcon sx={{ color: "#fff", fontSize: 20 }} />,
		color: "#546e7a",
		label: "Text",
	},
};

const DEFAULT_CONFIG: FileIconConfig = {
	icon: <InsertDriveFileOutlinedIcon sx={{ color: "#fff", fontSize: 20 }} />,
	color: "#546e7a",
	label: "Tệp",
};

const OFFICE_EXTS = new Set([".doc", ".docx", ".ppt", ".pptx"]);

const EXCEL_EXTS = new Set([".xls", ".xlsx", ".csv"]);

const PREVIEWABLE_EXTS = new Set([
	".pdf",
	".txt",
	".png",
	".jpg",
	".jpeg",
	".gif",
	".webp",
	".svg",
	".mp4",
	".webm",
	".mp3",
	".wav",
	...Array.from(OFFICE_EXTS),
]);

export function getFileIconConfig(ext: string): FileIconConfig {
	return FILE_CONFIGS[ext.toLowerCase()] ?? DEFAULT_CONFIG;
}

export function getFileExtFromContent(
	content: string,
	originalName?: string,
): string {
	const source = originalName || content;
	const path = source.split(/[?#]/)[0];
	const basename = path.split("/").pop() ?? "";
	const dotIndex = basename.lastIndexOf(".");
	return dotIndex >= 0 ? basename.slice(dotIndex).toLowerCase() : "";
}

export function getDisplayFilename(
	content: string,
	file?: File | null,
	originalName?: string,
): string {
	if (originalName) return originalName;
	if (file?.name) return file.name;
	// Pending state: content is the original filename before upload
	if (!content.includes("/") && !content.startsWith("http")) return content;
	const path = content.split(/[?#]/)[0];
	return path.split("/").pop() ?? "Tệp đính kèm";
}

interface FilePreviewModalProps {
	open: boolean;
	onClose: () => void;
	fileUrl: string;
	filename: string;
	fileExt: string;
}

export const FilePreviewModal = ({
	open,
	onClose,
	fileUrl,
	filename,
	fileExt,
}: FilePreviewModalProps) => {
	const ext = fileExt.toLowerCase();
	const canPreview = PREVIEWABLE_EXTS.has(ext);
	const isOfficeFile = OFFICE_EXTS.has(ext);
	const isExcelFile = EXCEL_EXTS.has(ext);
	const config = getFileIconConfig(fileExt);

	const previewUrl = isOfficeFile
		? `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`
		: fileUrl;

	const [excelLightMode, setExcelLightMode] = useState(false);

	const handleDownload = () => {
		const a = document.createElement("a");
		a.href = fileUrl;
		a.download = filename;
		a.target = "_blank";
		a.rel = "noopener noreferrer";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	};

	return (
		<Dialog
			open={open}
			onClose={onClose}
			maxWidth="md"
			fullWidth
			PaperProps={{ sx: { borderRadius: 2 } }}
		>
			<DialogTitle
				sx={{
					display: "flex",
					alignItems: "center",
					gap: 1.5,
					pr: 1,
					py: 1.5,
					borderBottom: "1px solid",
					borderColor: "divider",
				}}
			>
				<Box
					sx={{
						width: 32,
						height: 32,
						borderRadius: 1,
						bgcolor: config.color,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						flexShrink: 0,
					}}
				>
					{config.icon}
				</Box>
				<Typography
					variant="subtitle1"
					component="span"
					fontWeight={600}
					noWrap
					sx={{ flex: 1 }}
				>
					{filename}
				</Typography>
				{isExcelFile && (
					<Tooltip title={excelLightMode ? "Chế độ tối" : "Chế độ sáng"}>
						<IconButton
							size="small"
							onClick={() => setExcelLightMode((v) => !v)}
							sx={{ flexShrink: 0 }}
						>
							{excelLightMode ? (
								<Brightness4OutlinedIcon fontSize="small" />
							) : (
								<Brightness7OutlinedIcon fontSize="small" />
							)}
						</IconButton>
					</Tooltip>
				)}
				<Tooltip title="Tải xuống">
					<IconButton
						onClick={handleDownload}
						size="small"
						sx={{ flexShrink: 0 }}
					>
						<DownloadIcon fontSize="small" />
					</IconButton>
				</Tooltip>
				<IconButton onClick={onClose} size="small" sx={{ flexShrink: 0 }}>
					<CloseIcon fontSize="small" />
				</IconButton>
			</DialogTitle>
			<DialogContent sx={{ p: canPreview || isExcelFile ? 0 : undefined }}>
				{isExcelFile ? (
					<ExcelPreview
						fileUrl={fileUrl}
						filename={filename}
						lightMode={excelLightMode}
					/>
				) : canPreview ? (
					<Box
						component="iframe"
						src={previewUrl}
						title={filename}
						sx={{
							display: "block",
							width: "100%",
							height: 580,
							border: "none",
						}}
					/>
				) : (
					<Box
						sx={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							py: 6,
							gap: 2,
						}}
					>
						<Box
							sx={{
								width: 64,
								height: 64,
								borderRadius: 2,
								bgcolor: config.color,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								"& svg": { fontSize: 36 },
							}}
						>
							{config.icon}
						</Box>
						<Typography
							variant="h6"
							sx={{
								textAlign: "center",
								maxWidth: 320,
								wordBreak: "break-word",
							}}
						>
							{filename}
						</Typography>
						<Typography variant="body2" color="text.secondary">
							Loại tệp này không hỗ trợ xem trước
						</Typography>
						<Button
							variant="contained"
							startIcon={<DownloadIcon />}
							onClick={handleDownload}
						>
							Tải xuống
						</Button>
					</Box>
				)}
			</DialogContent>
		</Dialog>
	);
};

export default FilePreviewModal;
