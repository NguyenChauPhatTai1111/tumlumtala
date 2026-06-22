import {
	Box,
	CircularProgress,
	Tab,
	Tabs,
	Tooltip,
	Typography,
} from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx-js-style";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CellStyle {
	bgColor?: string;
	color?: string;
	bold?: boolean;
	italic?: boolean;
	underline?: boolean;
	align?: "left" | "center" | "right";
}

interface CellData {
	text: string;
	style: CellStyle;
}

interface SheetData {
	name: string;
	headers: CellData[];
	rows: CellData[][];
	colWidths: number[];
	rowHeights: number[];
}

interface ExcelPreviewProps {
	fileUrl: string;
	filename: string;
	lightMode?: boolean;
}

// ─── Style helpers ────────────────────────────────────────────────────────────

type XlsxWorkbook = XLSX.WorkBook & {
	Styles?: {
		Fonts?: {
			bold?: number;
			italic?: number;
			underline?: unknown;
			color?: { rgb?: string };
		}[];
		Fills?: { patternType?: string; fgColor?: { rgb?: string } }[];
		CellXf?: {
			fontId?: number;
			fillId?: number;
			numFmtId?: number;
			alignment?: { horizontal?: string };
		}[];
	};
};

function argbToHex(rgb?: string): string | undefined {
	if (!rgb || rgb.length < 6) return undefined;
	// Strip leading alpha byte if present (8 chars = AARRGGBB)
	const hex = rgb.length === 8 ? rgb.slice(2) : rgb;
	if (/^[0-9A-Fa-f]{6}$/.test(hex)) return `#${hex.toUpperCase()}`;
	return undefined;
}

/** Build a per-cell style map by parsing the `s` attribute in sheet XML */
function buildCellStyleMap(
	zip: ReturnType<typeof XLSX.CFB.parse>,
	sheetIndex: number,
): Map<string, number> {
	const map = new Map<string, number>();
	const name = `sheet${sheetIndex + 1}.xml`;
	const entry = zip.FileIndex.find(
		(f: { name: string; content?: unknown }) => f.name === name,
	);
	if (!entry?.content) return map;

	const xml = (
		entry.content instanceof Uint8Array
			? new TextDecoder().decode(entry.content)
			: Buffer.from(entry.content as ArrayBuffer).toString()
	) as string;

	// Match <c r="A1" ... s="3" ...> — s attribute is the xf index
	const re = /<c\b[^>]*\br="([A-Z]+\d+)"[^>]*\bs="(\d+)"[^>]*/g;
	let m = re.exec(xml);
	while (m !== null) {
		map.set(m[1], parseInt(m[2], 10));
		m = re.exec(xml);
	}
	return map;
}

function resolveStyle(xfIdx: number | undefined, wb: XlsxWorkbook): CellStyle {
	if (xfIdx === undefined) return {};
	const styles = wb.Styles;
	if (!styles) return {};

	const xf = styles.CellXf?.[xfIdx];
	if (!xf) return {};

	const font = styles.Fonts?.[xf.fontId ?? 0];
	const fill = styles.Fills?.[xf.fillId ?? 0];
	const style: CellStyle = {};

	if (fill?.patternType === "solid" && fill.fgColor?.rgb) {
		const bg = argbToHex(fill.fgColor.rgb);
		// Skip pure white/black defaults
		if (bg && bg !== "#FFFFFF" && bg !== "#000000") style.bgColor = bg;
	}

	if (font) {
		if (font.color?.rgb) {
			const fg = argbToHex(font.color.rgb);
			if (fg && fg !== "#000000") style.color = fg;
		}
		if (font.bold) style.bold = true;
		if (font.italic) style.italic = true;
		if (font.underline) style.underline = true;
	}

	const horiz = xf.alignment?.horizontal;
	if (horiz === "center") style.align = "center";
	else if (horiz === "right") style.align = "right";

	return style;
}

function cellText(
	cell: XLSX.CellObject | undefined,
	xfIdx: number | undefined,
	wb: XlsxWorkbook,
): string {
	if (!cell || cell.t === "e") return "";

	// cell.w is always the Excel-formatted display string — trust it unconditionally
	if (cell.w !== undefined && cell.w !== "") return cell.w;

	// Fallback: format manually using the number format string from CellXf
	if (cell.t === "n" && cell.v !== null && cell.v !== undefined) {
		const xf = wb.Styles?.CellXf?.[xfIdx ?? 0];
		const numFmtId = xf?.numFmtId ?? 0;
		const fmt = (wb as unknown as { SSF?: Record<number, string> }).SSF?.[
			numFmtId
		];
		if (fmt && fmt !== "General") {
			try {
				return XLSX.SSF.format(fmt, cell.v as number);
			} catch {
				// ignore
			}
		}
		return String(cell.v);
	}

	if (cell.v === null || cell.v === undefined) return "";
	return String(cell.v);
}

// ─── Workbook parser ──────────────────────────────────────────────────────────

function parseWorkbook(
	wb: XlsxWorkbook,
	zip: ReturnType<typeof XLSX.CFB.parse>,
): SheetData[] {
	return wb.SheetNames.map((name, sheetIdx) => {
		const sheet = wb.Sheets[name];
		const ref = sheet["!ref"];
		if (!ref)
			return { name, headers: [], rows: [], colWidths: [], rowHeights: [] };

		const range = XLSX.utils.decode_range(ref);
		const numRows = range.e.r - range.s.r + 1;
		const numCols = range.e.c - range.s.c + 1;

		// Build style-index lookup from raw XML
		const styleMap = buildCellStyleMap(zip, sheetIdx);

		const grid: CellData[][] = [];
		for (let r = 0; r < numRows; r++) {
			const row: CellData[] = [];
			for (let c = 0; c < numCols; c++) {
				const addr = XLSX.utils.encode_cell({
					r: range.s.r + r,
					c: range.s.c + c,
				});
				const cell = sheet[addr] as XLSX.CellObject | undefined;
				const xfIdx = styleMap.get(addr);
				const style = resolveStyle(xfIdx, wb);
				const text = cellText(cell, xfIdx, wb);
				row.push({ text, style });
			}
			grid.push(row);
		}

		if (grid.length === 0)
			return { name, headers: [], rows: [], colWidths: [], rowHeights: [] };

		const colsMeta = (sheet["!cols"] ?? []) as { wch?: number; wpx?: number }[];
		const colWidths = Array.from({ length: numCols }, (_, i) => {
			const m = colsMeta[i];
			if (m?.wpx) return m.wpx;
			if (m?.wch) return Math.max(60, Math.round(m.wch * 7));
			return 100;
		});

		// row 0 is the header row — include it so indices align with grid
		const rowsMeta = (sheet["!rows"] ?? []) as (
			| { hpx?: number; hpt?: number }
			| null
			| undefined
		)[];
		const rowHeights = Array.from({ length: numRows }, (_, i) => {
			const m = rowsMeta[i];
			if (m?.hpx) return m.hpx;
			if (m?.hpt) return Math.round(m.hpt * 1.33);
			return 24;
		});

		return {
			name,
			headers: grid[0],
			rows: grid.slice(1),
			colWidths,
			rowHeights,
		};
	});
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ExcelPreview({
	fileUrl,
	filename,
	lightMode = false,
}: ExcelPreviewProps) {
	const [sheets, setSheets] = useState<SheetData[]>([]);
	const [activeSheet, setActiveSheet] = useState(0);
	const [colWidths, setColWidths] = useState<number[]>([]);
	const [rowHeights, setRowHeights] = useState<number[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const abortRef = useRef<AbortController | null>(null);
	const colResizeRef = useRef<{
		colIdx: number;
		startX: number;
		startWidth: number;
	} | null>(null);
	const rowResizeRef = useRef<{
		rowIdx: number;
		startY: number;
		startHeight: number;
	} | null>(null);

	const onResizeStart = useCallback(
		(e: React.MouseEvent, colIdx: number) => {
			e.preventDefault();
			e.stopPropagation();
			colResizeRef.current = {
				colIdx,
				startX: e.clientX,
				startWidth: colWidths[colIdx] ?? 100,
			};

			const onMove = (ev: MouseEvent) => {
				const ref = colResizeRef.current;
				if (!ref) return;
				const newWidth = Math.max(40, ref.startWidth + ev.clientX - ref.startX);
				const idx = ref.colIdx;
				setColWidths((prev) => {
					const next = [...prev];
					next[idx] = newWidth;
					return next;
				});
			};

			const onUp = () => {
				colResizeRef.current = null;
				window.removeEventListener("mousemove", onMove);
				window.removeEventListener("mouseup", onUp);
			};

			window.addEventListener("mousemove", onMove);
			window.addEventListener("mouseup", onUp);
		},
		[colWidths],
	);

	const onRowResizeStart = useCallback(
		(e: React.MouseEvent, rowIdx: number) => {
			e.preventDefault();
			e.stopPropagation();
			rowResizeRef.current = {
				rowIdx,
				startY: e.clientY,
				startHeight: rowHeights[rowIdx + 1] ?? 24,
			};

			const onMove = (ev: MouseEvent) => {
				const ref = rowResizeRef.current;
				if (!ref) return;
				const newHeight = Math.max(
					16,
					ref.startHeight + ev.clientY - ref.startY,
				);
				const idx = ref.rowIdx + 1;
				setRowHeights((prev) => {
					const next = [...prev];
					next[idx] = newHeight;
					return next;
				});
			};

			const onUp = () => {
				rowResizeRef.current = null;
				window.removeEventListener("mousemove", onMove);
				window.removeEventListener("mouseup", onUp);
			};

			window.addEventListener("mousemove", onMove);
			window.addEventListener("mouseup", onUp);
		},
		[rowHeights],
	);

	useEffect(() => {
		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;

		setLoading(true);
		setError(null);
		setSheets([]);
		setActiveSheet(0);

		const token = localStorage.getItem("access_token");
		const reqHeaders: HeadersInit = {};
		if (token) reqHeaders.Authorization = `Bearer ${token}`;

		const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "";
		const proxyUrl = `${backendUrl}/api/v1/messenger/files/proxy?url=${encodeURIComponent(fileUrl)}`;

		fetch(proxyUrl, { signal: controller.signal, headers: reqHeaders })
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.arrayBuffer();
			})
			.then((buf) => {
				const uint8 = new Uint8Array(buf);
				const wb = XLSX.read(uint8, {
					type: "array",
					cellStyles: true,
					cellNF: true,
				}) as XlsxWorkbook;

				const zip = XLSX.CFB.parse(uint8, { type: "array" });
				const parsed = parseWorkbook(wb, zip);
				setSheets(parsed);
				setColWidths(parsed[0]?.colWidths ?? []);
				setRowHeights(parsed[0]?.rowHeights ?? []);
			})
			.catch((err) => {
				if (err.name === "AbortError") return;
				console.error("[ExcelPreview] error:", err);
				setError("Không thể đọc file. Vui lòng thử tải xuống để xem.");
			})
			.finally(() => {
				if (!controller.signal.aborted) setLoading(false);
			});

		return () => controller.abort();
	}, [fileUrl]);

	if (loading) {
		return (
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					height: 400,
					flexDirection: "column",
					gap: 2,
				}}
			>
				<CircularProgress size={36} />
				<Typography variant="body2" color="text.secondary">
					Đang tải {filename}…
				</Typography>
			</Box>
		);
	}

	if (error) {
		return (
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					height: 300,
					flexDirection: "column",
					gap: 1,
					px: 3,
					textAlign: "center",
				}}
			>
				<Typography variant="body1" color="error">
					{error}
				</Typography>
			</Box>
		);
	}

	const current = sheets[activeSheet];

	if (!current || current.headers.length === 0) {
		return (
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					height: 300,
				}}
			>
				<Typography variant="body2" color="text.secondary">
					Sheet trống hoặc không có dữ liệu.
				</Typography>
			</Box>
		);
	}

	return (
		<Box sx={{ display: "flex", flexDirection: "column", height: 560 }}>
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					borderBottom: "1px solid",
					borderColor: "divider",
					flexWrap: "wrap",
				}}
			>
				{sheets.length > 1 ? (
					<Tabs
						value={activeSheet}
						onChange={(_, v) => {
							setActiveSheet(v);
							setColWidths(sheets[v]?.colWidths ?? []);
							setRowHeights(sheets[v]?.rowHeights ?? []);
						}}
						variant="scrollable"
						scrollButtons="auto"
						sx={{
							minHeight: 38,
							flex: 1,
							"& .MuiTab-root": { minHeight: 38, py: 0.5, fontSize: 13 },
						}}
					>
						{sheets.map((s, i) => (
							<Tab key={s.name} label={s.name} value={i} />
						))}
					</Tabs>
				) : (
					<Box sx={{ flex: 1 }} />
				)}
			</Box>

			<Box
				sx={{
					flex: 1,
					overflow: "auto",
					backgroundColor: lightMode ? "#ffffff" : undefined,
					color: lightMode ? "#212121" : undefined,
				}}
			>
				<table
					style={{
						borderCollapse: "collapse",
						fontSize: 13,
						tableLayout: "fixed",
					}}
				>
					<colgroup>
						<col style={{ width: 40 }} />
						{colWidths.map((w, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: column order is stable and no unique id exists
							<col key={i} style={{ width: w }} />
						))}
					</colgroup>

					<thead>
						<tr>
							<th style={thBaseStyle(lightMode)}>#</th>
							{current.headers.map((cell, i) => (
								<Tooltip
									// biome-ignore lint/suspicious/noArrayIndexKey: column order is stable and no unique id exists
									key={i}
									title={cell.text}
									placement="top"
									arrow
									disableHoverListener={!cell.text}
								>
									<th style={thCell(cell, lightMode)}>
										<span
											style={{
												overflow: "hidden",
												textOverflow: "ellipsis",
												display: "block",
											}}
										>
											{cell.text}
										</span>
										{/* biome-ignore lint/a11y/noStaticElementInteractions: resize handle */}
										<span
											role="presentation"
											onMouseDown={(e) => onResizeStart(e, i)}
											style={resizeHandleStyle}
											title=""
										/>
									</th>
								</Tooltip>
							))}
						</tr>
					</thead>

					<tbody>
						{current.rows.map((row, ri) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: row order is stable and no unique id exists
							<tr key={ri} style={{ height: rowHeights[ri + 1] ?? 24 }}>
								<td style={rowNumStyleFn(lightMode)}>
									{ri + 1}
									{/* biome-ignore lint/a11y/noStaticElementInteractions: resize handle */}
									<span
										role="presentation"
										onMouseDown={(e) => onRowResizeStart(e, ri)}
										style={rowResizeHandleStyle}
									/>
								</td>
								{row.map((cell, ci) => (
									<Tooltip
										// biome-ignore lint/suspicious/noArrayIndexKey: column order is stable and no unique id exists
										key={ci}
										title={cell.text}
										placement="top"
										arrow
										disableHoverListener={!cell.text}
									>
										<td style={tdCell(cell, colWidths[ci], lightMode)}>
											<span
												style={{
													overflow: "hidden",
													textOverflow: "ellipsis",
													display: "block",
												}}
											>
												{cell.text}
											</span>
											{/* biome-ignore lint/a11y/noStaticElementInteractions: resize handle */}
											<span
												role="presentation"
												onMouseDown={(e) => onResizeStart(e, ci)}
												style={resizeHandleStyle}
												title=""
											/>
											{/* biome-ignore lint/a11y/noStaticElementInteractions: resize handle */}
											<span
												role="presentation"
												onMouseDown={(e) => onRowResizeStart(e, ri)}
												style={rowResizeHandleStyle}
											/>
										</td>
									</Tooltip>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</Box>

			<Box
				sx={{
					borderTop: "1px solid",
					borderColor: "divider",
					px: 2,
					py: 0.75,
					display: "flex",
					gap: 2,
				}}
			>
				<Typography variant="caption" color="text.secondary">
					{current.rows.length} hàng × {current.headers.length} cột
				</Typography>
				{sheets.length > 1 && (
					<Typography variant="caption" color="text.secondary">
						Sheet {activeSheet + 1}/{sheets.length}
					</Typography>
				)}
			</Box>
		</Box>
	);
}

// ─── Inline style factories ───────────────────────────────────────────────────

const BORDER = "1px solid var(--mui-palette-divider, #e0e0e0)";
const STICKY_SHADOW = "0 1px 0 var(--mui-palette-divider, #e0e0e0)";
const HEADER_BG = "var(--mui-palette-background-paper, #fff)";
const ROW_NUM_BG = "var(--mui-palette-action-hover, #f5f5f5)";
const CELL_PAD = "4px 10px";

function thBaseStyle(lightMode = false): React.CSSProperties {
	return {
		border: BORDER,
		padding: CELL_PAD,
		color: "#9e9e9e",
		textAlign: "center",
		position: "sticky",
		top: 0,
		zIndex: 2,
		background: lightMode ? "#f5f5f5" : HEADER_BG,
		boxShadow: STICKY_SHADOW,
		fontWeight: 600,
		userSelect: "none",
		whiteSpace: "nowrap",
	};
}

const resizeHandleStyle: React.CSSProperties = {
	position: "absolute",
	right: 0,
	top: 0,
	bottom: 0,
	width: 5,
	cursor: "col-resize",
	userSelect: "none",
	zIndex: 3,
};

const rowResizeHandleStyle: React.CSSProperties = {
	position: "absolute",
	left: 0,
	right: 0,
	bottom: 0,
	height: 5,
	cursor: "row-resize",
	userSelect: "none",
	zIndex: 3,
};

function thCell(cell: CellData, lightMode = false): React.CSSProperties {
	return {
		border: BORDER,
		padding: CELL_PAD,
		position: "sticky",
		top: 0,
		zIndex: 2,
		boxShadow: STICKY_SHADOW,
		overflow: "hidden",
		textAlign: cell.style.align ?? "left",
		background: cell.style.bgColor ?? (lightMode ? "#f5f5f5" : HEADER_BG),
		color: cell.style.color ?? (lightMode ? "#212121" : "inherit"),
		fontWeight: cell.style.bold ? 700 : 600,
		fontStyle: cell.style.italic ? "italic" : "normal",
		textDecoration: cell.style.underline ? "underline" : "none",
	};
}

function rowNumStyleFn(lightMode = false): React.CSSProperties {
	return {
		border: BORDER,
		padding: CELL_PAD,
		color: "#9e9e9e",
		textAlign: "center",
		userSelect: "none",
		background: lightMode ? "#f0f0f0" : ROW_NUM_BG,
		whiteSpace: "nowrap",
		position: "relative",
	};
}

function tdCell(
	cell: CellData,
	maxWidth = 100,
	lightMode = false,
): React.CSSProperties {
	return {
		border: BORDER,
		padding: CELL_PAD,
		whiteSpace: "nowrap",
		overflow: "hidden",
		textOverflow: "ellipsis",
		maxWidth,
		position: "relative",
		backgroundColor: cell.style.bgColor ?? (lightMode ? "#ffffff" : ""),
		color: cell.style.color ?? (lightMode ? "#212121" : "inherit"),
		fontWeight: cell.style.bold ? 700 : "normal",
		fontStyle: cell.style.italic ? "italic" : "normal",
		textDecoration: cell.style.underline ? "underline" : "none",
		textAlign: cell.style.align ?? "left",
	};
}
