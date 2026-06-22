import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import {
	Box,
	IconButton,
	MenuItem,
	Paper,
	Select,
	type SelectChangeEvent,
	TextField,
	Typography,
} from "@mui/material";
import {
	DataGrid,
	type GridColDef,
	type GridPaginationModel,
	type GridSlots,
	type GridSortModel,
	gridPageCountSelector,
	useGridApiContext,
	useGridSelector,
} from "@mui/x-data-grid";
import { useCallback, useEffect, useRef, useState } from "react";

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];
const DEBOUNCE_MS = 1000;

function CustomPagination() {
	const apiRef = useGridApiContext();
	const pageCount = useGridSelector(apiRef, gridPageCountSelector);
	const paginationModel = apiRef.current.state.pagination.paginationModel;
	const rowCount = apiRef.current.state.pagination.rowCount;

	const [pageInput, setPageInput] = useState(String(paginationModel.page + 1));
	const [customPageSize, setCustomPageSize] = useState("");
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		setPageInput(String(paginationModel.page + 1));
	}, [paginationModel.page]);

	const applyPage = useCallback(
		(value: string) => {
			const page = parseInt(value, 10);
			if (!Number.isNaN(page) && page >= 1) {
				const clampedPage = Math.min(page, pageCount);
				apiRef.current.setPage(clampedPage - 1);
				setPageInput(String(clampedPage));
			} else {
				setPageInput(String(paginationModel.page + 1));
			}
		},
		[pageCount, apiRef, paginationModel.page],
	);

	const handlePageChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const value = e.target.value;
			if (value !== "" && !/^\d+$/.test(value)) return;

			setPageInput(value);

			if (debounceRef.current) clearTimeout(debounceRef.current);
			if (value !== "") {
				debounceRef.current = setTimeout(() => {
					applyPage(value);
				}, DEBOUNCE_MS);
			}
		},
		[applyPage],
	);

	const handlePageKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") {
				if (debounceRef.current) clearTimeout(debounceRef.current);
				applyPage(pageInput);
			}
		},
		[pageInput, applyPage],
	);

	const handlePageBlur = useCallback(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		applyPage(pageInput);
	}, [pageInput, applyPage]);

	const handlePageSizeSelect = useCallback(
		(e: SelectChangeEvent<number>) => {
			const value = e.target.value;
			if (value === -1) return;
			apiRef.current.setPageSize(Number(value));
			setCustomPageSize("");
		},
		[apiRef],
	);

	const handleCustomPageSizeKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") {
				const size = parseInt(customPageSize, 10);
				if (!Number.isNaN(size) && size >= 1) {
					apiRef.current.setPageSize(size);
					setCustomPageSize("");
				}
			}
		},
		[customPageSize, apiRef],
	);

	const isPresetSize = PAGE_SIZE_OPTIONS.includes(paginationModel.pageSize);

	const rangeStart =
		rowCount > 0 ? paginationModel.page * paginationModel.pageSize + 1 : 0;
	const rangeEnd = Math.min(
		(paginationModel.page + 1) * paginationModel.pageSize,
		rowCount,
	);

	return (
		<Box
			sx={{
				display: "flex",
				alignItems: "center",
				gap: 2,
				px: 2,
				py: 1,
				width: "100%",
				justifyContent: "flex-end",
				flexWrap: "wrap",
			}}
		>
			<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
				<Typography variant="body2">Rows per page:</Typography>
				<Select
					size="small"
					value={isPresetSize ? paginationModel.pageSize : -1}
					onChange={handlePageSizeSelect}
					sx={{ minWidth: 70 }}
				>
					{PAGE_SIZE_OPTIONS.map((opt) => (
						<MenuItem key={opt} value={opt}>
							{opt}
						</MenuItem>
					))}
					{!isPresetSize && (
						<MenuItem value={-1}>{paginationModel.pageSize}</MenuItem>
					)}
				</Select>
				<TextField
					size="small"
					value={customPageSize}
					onChange={(e) => {
						if (e.target.value === "" || /^\d+$/.test(e.target.value)) {
							setCustomPageSize(e.target.value);
						}
					}}
					onKeyDown={handleCustomPageSizeKeyDown}
					placeholder="Custom"
					sx={{ width: 100 }}
					inputProps={{ style: { textAlign: "center" } }}
				/>
			</Box>

			<Typography variant="body2">
				{rangeStart}–{rangeEnd} of {rowCount}
			</Typography>

			<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
				<IconButton
					size="small"
					disabled={paginationModel.page === 0}
					onClick={() => apiRef.current.setPage(paginationModel.page - 1)}
				>
					<NavigateBeforeIcon fontSize="small" />
				</IconButton>

				<TextField
					size="small"
					value={pageInput}
					onChange={handlePageChange}
					onKeyDown={handlePageKeyDown}
					onBlur={handlePageBlur}
					sx={{ width: 55 }}
					inputProps={{
						style: { textAlign: "center" },
					}}
				/>
				<Typography variant="body2">/ {pageCount}</Typography>

				<IconButton
					size="small"
					disabled={paginationModel.page >= pageCount - 1}
					onClick={() => apiRef.current.setPage(paginationModel.page + 1)}
				>
					<NavigateNextIcon fontSize="small" />
				</IconButton>
			</Box>
		</Box>
	);
}

export interface DataTableProps<T> {
	rows: T[];
	columns: GridColDef[];
	loading: boolean;
	total: number;
	paginationModel: GridPaginationModel;
	onPaginationModelChange: (model: GridPaginationModel) => void;
	sortModel: GridSortModel;
	onSortModelChange: (model: GridSortModel) => void;
	columnVisibilityModel?: Record<string, boolean>;
	onColumnVisibilityModelChange?: (model: Record<string, boolean>) => void;
	getRowId: (row: T) => string | number;
}

export const DataTable = <T,>({
	rows,
	columns,
	loading,
	total,
	paginationModel,
	onPaginationModelChange,
	sortModel,
	onSortModelChange,
	columnVisibilityModel,
	onColumnVisibilityModelChange,
	getRowId,
}: DataTableProps<T>) => {
	return (
		<Box sx={{ width: "100%", overflowX: "auto" }}>
			<Paper sx={{ width: "100%", minWidth: 400, overflow: "hidden" }}>
				<DataGrid
					rows={rows}
					columns={columns}
					getRowId={getRowId}
					loading={loading}
					paginationMode="server"
					sortingMode="server"
					rowCount={total}
					pageSizeOptions={[5, 10, 25]}
					paginationModel={paginationModel}
					onPaginationModelChange={onPaginationModelChange}
					sortModel={sortModel}
					onSortModelChange={onSortModelChange}
					columnVisibilityModel={columnVisibilityModel}
					onColumnVisibilityModelChange={onColumnVisibilityModelChange}
					autoHeight
					slots={{
						pagination: CustomPagination as GridSlots["pagination"],
					}}
				/>
			</Paper>
		</Box>
	);
};
