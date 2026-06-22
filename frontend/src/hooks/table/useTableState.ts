import type { GridPaginationModel, GridSortModel } from "@mui/x-data-grid";
import { useEffect, useState } from "react";

export interface UseTableStateResult {
	paginationModel: GridPaginationModel;
	setPaginationModel: (model: GridPaginationModel) => void;
	sortModel: GridSortModel;
	setSortModel: (model: GridSortModel) => void;
	search: string;
	setSearch: (search: string) => void;
	columnVisibilityModel: Record<string, boolean>;
	setColumnVisibilityModel: (model: Record<string, boolean>) => void;
}

export const useTableState = (defaultPageSize = 10): UseTableStateResult => {
	const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
		page: 0,
		pageSize: defaultPageSize,
	});

	const [sortModel, setSortModel] = useState<GridSortModel>([]);
	const [search, setSearch] = useState("");
	const [columnVisibilityModel, setColumnVisibilityModel] = useState<
		Record<string, boolean>
	>({});

	return {
		paginationModel,
		setPaginationModel,
		sortModel,
		setSortModel,
		search,
		setSearch,
		columnVisibilityModel,
		setColumnVisibilityModel,
	};
};

export interface UseResourceListOptions {
	defaultPageSize?: number;
}

export const useSearchDebounce = (value: string, delay = 500) => {
	const [debouncedValue, setDebouncedValue] = useState(value);

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return () => clearTimeout(handler);
	}, [value, delay]);

	return debouncedValue;
};
