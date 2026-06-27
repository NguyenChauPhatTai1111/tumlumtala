import { useSearchUsers } from "@hooks/user";
import { useSearchDebounce } from "@/hooks/table/useTableState";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import {
	Avatar,
	Box,
	Button,
	CircularProgress,
	Dialog,
	DialogContent,
	DialogTitle,
	Divider,
	IconButton,
	InputAdornment,
	List,
	ListItemAvatar,
	ListItemButton,
	ListItemText,
	Pagination,
	TextField,
	Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import type { User } from "@/types/messenger";
import { resolveCdnUrl } from "@/utils/urlUtils";

interface UserSearchDialogProps {
	open: boolean;
	onClose: () => void;
	onSelect: (user: User) => void;
	loading?: boolean;
	title?: string;
}

export const UserSearchDialog = ({
	open,
	onClose,
	onSelect,
	loading = false,
	title = "Tìm kiếm người dùng",
}: UserSearchDialogProps) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [page, setPage] = useState(1);

	const inputRef = useRef<HTMLInputElement | null>(null);

	const limit = 20;
	const debouncedQuery = useSearchDebounce(searchQuery, 400);
	const searchKeyword = debouncedQuery.trim().length >= 2 ? debouncedQuery.trim() : "";

	const { data, isLoading } = useSearchUsers(searchKeyword, page, limit);

	useEffect(() => {
		if (!open) return;
		const t = window.setTimeout(() => inputRef.current?.focus(), 0);
		return () => window.clearTimeout(t);
	}, [open]);

	// Reset page khi keyword thay đổi
	useEffect(() => {
		setPage(1);
	}, [searchKeyword]);

	const handleSelect = (user: User) => {
		onSelect(user);
		setSearchQuery("");
		setPage(1);
		onClose();
	};

	const handlePageChange = (_: unknown, value: number) => {
		setPage(value);
	};

	const users = data?.items ?? [];
	const totalPages = data?.total_pages ?? 1;
	const hasSearchInput = searchQuery.trim().length > 0;

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>
				<Box
					sx={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					{title}
					<Button size="small" onClick={onClose} sx={{ minWidth: 0 }}>
						<CloseIcon />
					</Button>
				</Box>
			</DialogTitle>
			<Divider />
			<DialogContent sx={{ p: 2, display: "flex", flexDirection: "column" }}>
				<TextField
					fullWidth
					autoFocus
					inputRef={inputRef}
					placeholder="Tìm kiếm theo tên, email..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					InputProps={{
						startAdornment: (
							<InputAdornment position="start">
								<SearchIcon sx={{ color: "text.secondary" }} />
							</InputAdornment>
						),
						endAdornment: hasSearchInput ? (
							<InputAdornment position="end">
								<IconButton
									size="small"
									onClick={() => {
										setSearchQuery("");
										setPage(1);
									}}
								>
									<CloseIcon fontSize="small" />
								</IconButton>
							</InputAdornment>
						) : undefined,
					}}
				/>

				{!hasSearchInput ? (
					<Typography color="text.secondary" align="center" sx={{ py: 4 }}>
						Nhập tên hoặc email để tìm kiếm
					</Typography>
				) : isLoading || loading ? (
					<Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
						<CircularProgress size={24} />
					</Box>
				) : users.length === 0 ? (
					<Typography color="text.secondary" align="center">
						Không tìm thấy người dùng
					</Typography>
				) : (
					<>
						<List sx={{ p: 0 }}>
							{users.map((user, index) => (
								<Box key={user.id}>
									<ListItemButton
										onClick={() => handleSelect(user)}
										sx={{
											py: 1.5,
											"&:hover": { bgcolor: "action.hover" },
										}}
									>
										<ListItemAvatar>
											<Avatar
												src={resolveCdnUrl(user.avatar)}
												alt={user.username}
											/>
										</ListItemAvatar>
										<ListItemText
											primary={
												<Typography variant="subtitle2">
													{user.first_name || user.username}
												</Typography>
											}
											secondary={
												<Typography variant="body2" color="text.secondary">
													{user.email}
												</Typography>
											}
										/>
									</ListItemButton>
									{index < users.length - 1 && <Divider />}
								</Box>
							))}
						</List>

						{totalPages > 1 && (
							<Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
								<Pagination
									count={totalPages}
									page={page}
									onChange={handlePageChange}
									size="small"
								/>
							</Box>
						)}
					</>
				)}
			</DialogContent>
		</Dialog>
	);
};
