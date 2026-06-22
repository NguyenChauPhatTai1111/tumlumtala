import FilterListIcon from "@mui/icons-material/FilterList";
import {
	Box,
	Button,
	Chip,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	FormControlLabel,
	FormLabel,
	Radio,
	RadioGroup,
	Stack,
	Typography,
} from "@mui/material";
import { CountryFlag } from "@pages/movie/components/detail/CountryFlag";
import {
	DEFAULT_FILTER_STATE,
	MOVIE_LISTS,
	MOVIE_SORT_OPTIONS,
	type MovieListFilterState,
} from "@pages/movie/constants";
import type { OphimV1CatalogItem } from "@pages/movie/types";
import { useState } from "react";
import type { MovieSortField, MovieSortType } from "@/services/movieService";

interface Props {
	open: boolean;
	filter: MovieListFilterState;
	genres: OphimV1CatalogItem[];
	countries: OphimV1CatalogItem[];
	years: OphimV1CatalogItem[];
	onApply: (filter: MovieListFilterState) => void;
	onClose: () => void;
}

export const MovieListFilter = ({
	open,
	filter,
	genres,
	countries,
	years,
	onApply,
	onClose,
}: Props) => {
	const [draft, setDraft] = useState<MovieListFilterState>(filter);

	const handleOpen = () => setDraft(filter);

	const apply = () => {
		onApply(draft);
		onClose();
	};

	const reset = () => {
		setDraft(DEFAULT_FILTER_STATE);
	};

	return (
		<Dialog
			open={open}
			onClose={onClose}
			fullWidth
			maxWidth="md"
			TransitionProps={{ onEnter: handleOpen }}
		>
			<DialogTitle sx={{ fontWeight: 900 }}>Bộ lọc nâng cao</DialogTitle>

			<DialogContent dividers>
				<Stack spacing={3}>
					{/* List type */}
					<Box>
						<Typography sx={{ fontWeight: 700, mb: 1 }}>Danh sách</Typography>
						<Box
							sx={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fill, minmax(8, 0.75fr))",
								gap: 0.75,
							}}
						>
							{MOVIE_LISTS.map((l) => (
								<Chip
									key={l.slug}
									label={l.label}
									variant={draft.listSlug === l.slug ? "filled" : "outlined"}
									color={draft.listSlug === l.slug ? "primary" : "default"}
									onClick={() => setDraft((d) => ({ ...d, listSlug: l.slug }))}
								/>
							))}
						</Box>
					</Box>

					<Divider />

					{/* Sort */}
					<Box>
						<FormLabel
							component="legend"
							sx={{ fontWeight: 700, mb: 1.5, display: "block" }}
						>
							Sắp xếp
						</FormLabel>
						<Stack spacing={1}>
							<Box>
								<Typography
									variant="body2"
									color="text.secondary"
									sx={{ mb: 0.5 }}
								>
									Sắp xếp theo
								</Typography>
								<RadioGroup
									row
									value={draft.sortField}
									onChange={(e) =>
										setDraft((d) => ({
											...d,
											sortField: e.target.value as MovieSortField,
										}))
									}
								>
									{MOVIE_SORT_OPTIONS.map((opt) => (
										<FormControlLabel
											key={opt.value}
											value={opt.value}
											control={<Radio size="small" />}
											label={opt.label}
										/>
									))}
								</RadioGroup>
							</Box>
							<Box>
								<Typography
									variant="body2"
									color="text.secondary"
									sx={{ mb: 0.5 }}
								>
									Thứ tự
								</Typography>
								<RadioGroup
									row
									value={draft.sortType}
									onChange={(e) =>
										setDraft((d) => ({
											...d,
											sortType: e.target.value as MovieSortType,
										}))
									}
								>
									<FormControlLabel
										value="desc"
										control={<Radio size="medium" />}
										label="Mới nhất"
									/>
									<FormControlLabel
										value="asc"
										control={<Radio size="medium" />}
										label="Cũ nhất"
									/>
								</RadioGroup>
							</Box>
						</Stack>
					</Box>

					<Divider />

					{/* Genre */}
					{genres.length > 0 && (
						<Box>
							<Typography sx={{ fontWeight: 700, mb: 1 }}>Thể loại</Typography>
							<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
								{genres.map((g) => (
									<Chip
										key={g._id}
										label={g.name}
										size="medium"
										variant={draft.genreSlug === g.slug ? "filled" : "outlined"}
										color={draft.genreSlug === g.slug ? "primary" : "default"}
										onClick={() =>
											setDraft((d) => ({
												...d,
												genreSlug: d.genreSlug === g.slug ? null : g.slug,
											}))
										}
									/>
								))}
							</Box>
						</Box>
					)}

					<Divider />

					{/* Country */}
					{countries.length > 0 && (
						<Box>
							<Typography sx={{ fontWeight: 700, mb: 1 }}>Quốc gia</Typography>
							<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
								{countries.map((c) => (
									<Chip
										key={c._id}
										label={
											<Box
												sx={{ display: "flex", alignItems: "center", gap: 1 }}
											>
												<CountryFlag slug={c.slug} size={14} />
												<span>{c.name}</span>
											</Box>
										}
										size="small"
										variant={
											draft.countrySlug === c.slug ? "filled" : "outlined"
										}
										color={draft.countrySlug === c.slug ? "primary" : "default"}
										onClick={() =>
											setDraft((d) => ({
												...d,
												countrySlug: d.countrySlug === c.slug ? null : c.slug,
											}))
										}
									/>
								))}
							</Box>
						</Box>
					)}

					<Divider />

					{/* Year */}
					{years.length > 0 && (
						<Box>
							<Typography sx={{ fontWeight: 700, mb: 1 }}>
								Năm sản xuất
							</Typography>
							<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
								{years.map((y) => (
									<Chip
										key={y._id}
										label={y.name}
										size="small"
										variant={draft.yearSlug === y.slug ? "filled" : "outlined"}
										color={draft.yearSlug === y.slug ? "primary" : "default"}
										onClick={() =>
											setDraft((d) => ({
												...d,
												yearSlug: d.yearSlug === y.slug ? null : y.slug,
											}))
										}
									/>
								))}
							</Box>
						</Box>
					)}
				</Stack>
			</DialogContent>

			<DialogActions sx={{ px: 3, pb: 2 }}>
				<Button color="error" onClick={reset} sx={{ mr: "auto" }}>
					Đặt lại
				</Button>
				<Button onClick={onClose} color="inherit">
					Đóng
				</Button>
				<Button
					variant="contained"
					startIcon={<FilterListIcon />}
					onClick={apply}
				>
					Lọc
				</Button>
			</DialogActions>
		</Dialog>
	);
};
