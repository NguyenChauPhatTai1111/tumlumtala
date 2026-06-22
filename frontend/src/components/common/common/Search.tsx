import { Paper, TextField } from "@mui/material";

type SearchProps = {
	search: string;
	setSearch: (value: string) => void;
};

export const Search = ({ search, setSearch }: SearchProps) => {
	return (
		<Paper sx={{ p: 2, mb: 2 }}>
			<TextField
				fullWidth
				label="Tìm kiếm"
				value={search}
				onChange={(e) => setSearch(e.target.value)}
			/>
		</Paper>
	);
};
