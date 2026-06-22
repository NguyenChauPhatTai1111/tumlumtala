import ArrowRightAltIcon from "@mui/icons-material/ArrowRightAlt";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import {
	alpha,
	Box,
	Button,
	Collapse,
	Divider,
	Paper,
	Stack,
	Typography,
	useTheme,
} from "@mui/material";
import { CountryFlag } from "@pages/movie/components/detail/CountryFlag";
import {
	DEFAULT_FILTER_STATE,
	MOVIE_LISTS,
	MOVIE_SORT_OPTIONS,
	type MovieListFilterState,
} from "@pages/movie/constants";
import type { OphimV1CatalogItem } from "@pages/movie/types";
import type { MovieSortField, MovieSortType } from "@/services/movieService";

interface Props {
	open: boolean;
	filter: MovieListFilterState;
	genres: OphimV1CatalogItem[];
	countries: OphimV1CatalogItem[];
	onChange: (filter: MovieListFilterState) => void;
	onApply: () => void;
	onClose: () => void;
	onReset: () => void;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS: OphimV1CatalogItem[] = Array.from(
	{ length: CURRENT_YEAR - 2010 + 1 },
	(_, i) => {
		const y = String(CURRENT_YEAR - i);
		return { _id: y, name: y, slug: y };
	},
);

// ── Shared option button ──────────────────────────────────────────────────────

const OptionBtn = ({
	selected,
	fullWidth = false,
	onClick,
	children,
}: {
	selected: boolean;
	onClick: () => void;
	children: React.ReactNode;
	fullWidth?: boolean;
}) => {
	const theme = useTheme();
	return (
		<Box
			component="button"
			onClick={onClick}
			sx={{
				all: "unset",
				boxSizing: "border-box",
				width: fullWidth ? "100%" : "auto",
				display: "flex",
				alignItems: "center",
				gap: 0.75,
				px: 1.25,
				py: 1,
				borderRadius: 1,
				border: "1.5px solid",
				fontSize: 13,
				fontWeight: selected ? 700 : 400,
				lineHeight: 1.4,
				cursor: "pointer",
				transition: "all 0.12s ease",
				userSelect: "none",
				minWidth: 0,
				...(selected
					? {
							borderColor: "primary.main",
							bgcolor: alpha(theme.palette.primary.main, 0.15),
							color: "primary.main",
						}
					: {
							borderColor: "divider",
							bgcolor: "transparent",
							color: "text.secondary",
							"&:hover": {
								borderColor: alpha(theme.palette.primary.main, 0.5),
								color: "text.primary",
								bgcolor: alpha(theme.palette.primary.main, 0.05),
							},
						}),
			}}
		>
			{children}
		</Box>
	);
};

// ── Section header ────────────────────────────────────────────────────────────

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
	<Typography
		variant="caption"
		sx={{
			fontWeight: 700,
			textTransform: "uppercase",
			letterSpacing: 1,
			color: "text.primary",
			display: "block",
			mb: 1,
		}}
	>
		{children}
	</Typography>
);

// ── Grid wrapper — fixed columns per breakpoint ───────────────────────────────

const OptionGrid = ({
	cols,
	children,
}: {
	cols: { xs: number; sm?: number; md?: number };
	children: React.ReactNode;
}) => (
	<Box
		sx={{
			display: "grid",
			gap: 0.75,
			gridTemplateColumns: {
				xs: `repeat(${cols.xs}, 1fr)`,
				...(cols.sm ? { sm: `repeat(${cols.sm}, 1fr)` } : {}),
				...(cols.md ? { md: `repeat(${cols.md}, 1fr)` } : {}),
			},
		}}
	>
		{children}
	</Box>
);

// ── Main component ────────────────────────────────────────────────────────────

export const MovieFilterPanel = ({
	open,
	filter,
	genres,
	countries,
	onChange,
	onApply,
	onClose,
	onReset,
}: Props) => {
	const set = (patch: Partial<MovieListFilterState>) =>
		onChange({ ...filter, ...patch });

	const isDirty =
		filter.listSlug !== DEFAULT_FILTER_STATE.listSlug ||
		filter.sortField !== DEFAULT_FILTER_STATE.sortField ||
		filter.sortType !== DEFAULT_FILTER_STATE.sortType ||
		Boolean(filter.genreSlug) ||
		Boolean(filter.countrySlug) ||
		Boolean(filter.yearSlug);

	return (
		<Collapse in={open} unmountOnExit>
			<Paper
				variant="outlined"
				sx={{
					mb: 1.5,
					borderRadius: 2,
					overflow: "hidden",
				}}
			>
				{/* ── Danh sách ── */}
				<Box sx={{ px: { xs: 1.5, sm: 2 }, pt: 2, pb: 1.5 }}>
					<Stack
						direction="row"
						alignItems="center"
						justifyContent="space-between"
						sx={{ mb: 1 }}
					>
						<SectionLabel>Danh sách</SectionLabel>
						{isDirty && (
							<Button
								size="small"
								color="error"
								variant="contained"
								onClick={onReset}
								sx={{ mb: 1, minWidth: 0, px: 1 }}
							>
								Xóa bộ lọc
							</Button>
						)}
					</Stack>
					<OptionGrid cols={{ xs: 3, sm: 4, md: 6 }}>
						{MOVIE_LISTS.map((l) => (
							<OptionBtn
								key={l.slug}
								selected={filter.listSlug === l.slug}
								onClick={() => set({ listSlug: l.slug })}
							>
								{l.label}
							</OptionBtn>
						))}
					</OptionGrid>
				</Box>

				{/* ── Sắp xếp ── */}
				<Box sx={{ px: 2, py: 1.5 }}>
					<Stack
						direction={{ xs: "column", sm: "row" }}
						spacing={{ xs: 3, sm: 3 }}
					>
						<Box>
							<SectionLabel>Sắp xếp theo</SectionLabel>
							<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
								{MOVIE_SORT_OPTIONS.map((opt) => (
									<OptionBtn
										key={opt.value}
										selected={filter.sortField === opt.value}
										onClick={() =>
											set({ sortField: opt.value as MovieSortField })
										}
									>
										{opt.label}
									</OptionBtn>
								))}
							</Stack>
						</Box>
						<Box>
							<SectionLabel>Thứ tự</SectionLabel>
							<Stack direction="row" spacing={0.75}>
								{(
									[
										{ value: "desc", label: "Mới nhất" },
										{ value: "asc", label: "Cũ nhất" },
									] as { value: MovieSortType; label: string }[]
								).map((opt) => (
									<OptionBtn
										key={opt.value}
										fullWidth={false}
										selected={filter.sortType === opt.value}
										onClick={() => set({ sortType: opt.value })}
									>
										{opt.label}
									</OptionBtn>
								))}
							</Stack>
						</Box>
					</Stack>
				</Box>

				{/* ── Thể loại ── */}
				{genres.length > 0 && (
					<Box sx={{ px: 2, py: 1.5 }}>
						<SectionLabel>Thể loại</SectionLabel>
						<OptionGrid cols={{ xs: 2, sm: 4, md: 10 }}>
							<OptionBtn
								key="__all__"
								selected={!filter.genreSlug}
								onClick={() => set({ genreSlug: null })}
							>
								Tất cả
							</OptionBtn>
							{genres.map((g) => (
								<OptionBtn
									key={g._id}
									selected={filter.genreSlug === g.slug}
									onClick={() => set({ genreSlug: g.slug })}
								>
									{g.name}
								</OptionBtn>
							))}
						</OptionGrid>
					</Box>
				)}

				{/* ── Quốc gia ── */}
				{countries.length > 0 && (
					<Box sx={{ px: 2, py: 1.5 }}>
						<SectionLabel>Quốc gia</SectionLabel>
						<OptionGrid cols={{ xs: 2, sm: 4, md: 8 }}>
							<OptionBtn
								key="__all__"
								selected={!filter.countrySlug}
								onClick={() => set({ countrySlug: null })}
							>
								Tất cả
							</OptionBtn>
							{[...countries]
								.sort((a, b) => a.name.localeCompare(b.name, "vi"))
								.map((c) => (
									<OptionBtn
										key={c._id}
										selected={filter.countrySlug === c.slug}
										onClick={() => set({ countrySlug: c.slug })}
									>
										<CountryFlag slug={c.slug} size={15} />
										<Box
											component="span"
											sx={{
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
											}}
										>
											{c.name}
										</Box>
									</OptionBtn>
								))}
						</OptionGrid>
					</Box>
				)}

				{/* ── Năm sản xuất ── */}
				<Box sx={{ px: 2, pt: 1.5, pb: 2 }}>
					<SectionLabel>Năm sản xuất</SectionLabel>
					<OptionGrid cols={{ xs: 4, sm: 6, md: 10 }}>
						<OptionBtn
							selected={!filter.yearSlug}
							onClick={() => set({ yearSlug: null })}
						>
							Tất cả
						</OptionBtn>
						{YEARS.map((y) => (
							<OptionBtn
								key={y._id}
								selected={filter.yearSlug === y.slug}
								onClick={() => set({ yearSlug: y.slug })}
							>
								{y.name}
							</OptionBtn>
						))}
					</OptionGrid>
				</Box>

				{/* ── Apply ── */}
				<Divider />
				<Box sx={{ px: 2, py: 1.5, display: "flex", gap: 1 }}>
					<Button
						size="medium"
						variant="contained"
						endIcon={<ArrowRightAltIcon />}
						onClick={onApply}
						sx={{ flexShrink: 0 }}
					>
						Lọc kết quả
					</Button>
					<Button
						size="medium"
						variant="outlined"
						startIcon={<KeyboardArrowUpIcon />}
						onClick={onClose}
						sx={{ flexShrink: 0 }}
					>
						Đóng
					</Button>
				</Box>
			</Paper>
		</Collapse>
	);
};

export const FilterToggleIcon = ({ open }: { open: boolean }) =>
	open ? (
		<KeyboardArrowUpIcon fontSize="small" />
	) : (
		<KeyboardArrowDownIcon fontSize="small" />
	);
