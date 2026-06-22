import type { GridPaginationModel, GridSortModel } from "@mui/x-data-grid";
import type { IRecentItem } from "@/types/recent_items";

// Stub: recent item management via refine DataProvider is not used in this project.
// Returns an empty list so the UI renders without errors.
export const useRecentItemList = (
  _dataProvider: unknown,
  _paginationModel: GridPaginationModel,
  _sortModel: GridSortModel,
  _search: string,
): { data: IRecentItem[]; total: number; isLoading: boolean } => {
  return { data: [], total: 0, isLoading: false };
};
