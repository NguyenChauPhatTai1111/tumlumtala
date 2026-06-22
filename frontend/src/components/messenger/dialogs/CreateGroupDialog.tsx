import { useSearchUsers } from "@hooks/user";
import CloseIcon from "@mui/icons-material/Close";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import SearchIcon from "@mui/icons-material/Search";
import {
	Avatar,
	Box,
	Button,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	IconButton,
	InputAdornment,
	List,
	ListItemAvatar,
	ListItemButton,
	ListItemText,
	TextField,
	Typography,
} from "@mui/material";
import { useRef, useState } from "react";
import { useSearchDebounce } from "@/hooks/table/useTableState";
import type { Participant, User } from "@/types/messenger";
import { resolveCdnUrl } from "@/utils/urlUtils";

interface CreateGroupDialogProps {
	open: boolean;
	onClose: () => void;
	onCreateGroup: (name: string, participantIds: number[]) => Promise<void>;
	loading?: boolean;
	preselectedParticipants?: Participant[];
	currentUserId?: number;
}

export const CreateGroupDialog = ({
	open,
	onClose,
	onCreateGroup,
	loading = false,
	preselectedParticipants = [],
	currentUserId,
}: CreateGroupDialogProps) => {
	const [groupName, setGroupName] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
	const nameInputRef = useRef<HTMLInputElement | null>(null);
	const debouncedQuery = useSearchDebounce(searchQuery, 500);
	const searchInputRef = useRef<HTMLInputElement | null>(null);

	const searchKeyword =
		debouncedQuery.trim().length >= 2 ? debouncedQuery.trim() : "";
	const { data, isLoading: searchLoading } = useSearchUsers(
		searchKeyword,
		1,
		20,
	);

	const resetForm = () => {
		setGroupName("");
		setSearchQuery("");
		setSelectedUsers([]);
	};

	const handleEntered = () => {
		resetForm();
		nameInputRef.current?.focus();
	};

	const preselectedIds = new Set(preselectedParticipants.map((p) => p.id));
	const selectedUserIds = new Set(selectedUsers.map((u) => Number(u.id)));

	// Exclude current user, preselected, and already selected from search results
	const searchResults = (data?.items ?? []).filter((u) => {
		const uid = Number(u.id);
		return (
			uid !== currentUserId &&
			!preselectedIds.has(uid) &&
			!selectedUserIds.has(uid)
		);
	});

	const handleAddUser = (user: User) => {
		setSelectedUsers((prev) => [...prev, user]);
		setSearchQuery("");

		requestAnimationFrame(() => {
			searchInputRef.current?.focus();
		});
	};

	const handleRemoveUser = (userId: string) => {
		setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));

		requestAnimationFrame(() => {
			searchInputRef.current?.focus();
		});
	};

	const handleCreate = async () => {
		const allIds = [
			...preselectedParticipants.map((p) => p.id),
			...selectedUsers.map((u) => Number(u.id)),
		];
		const name = groupName.trim() || buildDefaultName();
		await onCreateGroup(name, allIds);
	};

	const buildDefaultName = () => {
		const names = preselectedParticipants.map((p) => p.nickname || p.fullname);
		for (const u of selectedUsers) {
			names.push(u.first_name || u.username || "Người dùng");
		}
		return names.slice(0, 3).join(", ");
	};

	const totalMembers =
		1 + preselectedParticipants.length + selectedUsers.length; // +1 for current user
	const canCreate = totalMembers >= 3; // at least 3 participants including creator

	return (
		<Dialog
			open={open}
			onClose={onClose}
			maxWidth="sm"
			fullWidth
			slotProps={{
				transition: {
					onEntered: handleEntered,
				},
			}}
		>
			<DialogTitle>
				<Box
					sx={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
						<GroupAddIcon />
						<Typography variant="h6" fontWeight={700}>
							Tạo nhóm trò chuyện
						</Typography>
					</Box>
					<IconButton size="medium" onClick={onClose}>
						<CloseIcon />
					</IconButton>
				</Box>
			</DialogTitle>
			<Divider />
			<DialogContent
				sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}
			>
				{/* Group name */}
				<TextField
					fullWidth
					inputRef={nameInputRef}
					label="Tên nhóm (tùy chọn)"
					placeholder={buildDefaultName() || "Nhập tên nhóm..."}
					value={groupName}
					onChange={(e) => setGroupName(e.target.value)}
					size="medium"
				/>

				{/* Selected members */}
				{(preselectedParticipants.length > 0 || selectedUsers.length > 0) && (
					<Box>
						<Typography
							variant="caption"
							color="text.secondary"
							sx={{ mb: 0.75, display: "block" }}
						>
							Thành viên ({totalMembers})
						</Typography>
						<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
							{/* Pre-selected (locked) */}
							{preselectedParticipants.map((p) => (
								<Chip
									key={p.id}
									avatar={
										<Avatar src={resolveCdnUrl(p.avatar)}>
											{(p.nickname || p.fullname || "U")
												.slice(0, 1)
												.toUpperCase()}
										</Avatar>
									}
									label={p.nickname || p.fullname}
									size="small"
									variant="outlined"
									sx={{ borderColor: "primary.main" }}
								/>
							))}
							{/* Removable selected users */}
							{selectedUsers.map((u) => (
								<Chip
									key={u.id}
									avatar={
										<Avatar src={resolveCdnUrl(u.avatar)}>
											{(u.first_name || u.username || "U")
												.slice(0, 1)
												.toUpperCase()}
										</Avatar>
									}
									label={u.first_name || u.username}
									size="small"
									onDelete={() => handleRemoveUser(u.id)}
									color="primary"
									variant="outlined"
									sx={{ borderColor: "primary.main" }}
									deleteIcon={<CloseIcon />}
									onMouseDown={(e) => e.stopPropagation()} // prevent focus loss on delete click
								/>
							))}
						</Box>
					</Box>
				)}

				{/* User search */}
				<Box>
					<TextField
						fullWidth
						size="medium"
						inputRef={searchInputRef}
						placeholder="Tìm kiếm và thêm thành viên..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						InputProps={{
							startAdornment: (
								<InputAdornment position="start">
									<SearchIcon
										fontSize="small"
										sx={{ color: "text.secondary" }}
									/>
								</InputAdornment>
							),
							endAdornment: searchQuery ? (
								<InputAdornment position="end">
									<IconButton
										size="small"
										onClick={() => {
											setSearchQuery("");
										}}
									>
										<CloseIcon fontSize="small" />
									</IconButton>
								</InputAdornment>
							) : undefined,
						}}
					/>

					{searchLoading && (
						<Box sx={{ display: "flex", justifyContent: "center", py: 1.5 }}>
							<CircularProgress size={20} />
						</Box>
					)}

					{!searchLoading && searchKeyword && searchResults.length === 0 && (
						<Typography
							variant="caption"
							color="text.secondary"
							sx={{ display: "block", textAlign: "center", py: 1.5 }}
						>
							Không tìm thấy người dùng
						</Typography>
					)}

					{searchResults.length > 0 && (
						<List dense sx={{ maxHeight: 240, overflowY: "auto", mt: 0.5 }}>
							{searchResults.map((user, index) => (
								<Box key={user.id}>
									<ListItemButton
										onClick={() => handleAddUser(user)}
										sx={{ borderRadius: 1 }}
									>
										<ListItemAvatar sx={{ minWidth: 44 }}>
											<Avatar
												src={resolveCdnUrl(user.avatar)}
												sx={{ width: 32, height: 32 }}
											>
												{(user.first_name || user.username || "U")
													.slice(0, 1)
													.toUpperCase()}
											</Avatar>
										</ListItemAvatar>
										<ListItemText
											primary={
												<Typography variant="body2" fontWeight={500}>
													{user.first_name || user.username}
												</Typography>
											}
											secondary={
												<Typography variant="caption" color="text.secondary">
													{user.email}
												</Typography>
											}
										/>
									</ListItemButton>
									{index < searchResults.length - 1 && <Divider />}
								</Box>
							))}
						</List>
					)}
				</Box>
			</DialogContent>
			<DialogActions sx={{ px: 2, pb: 2 }}>
				<Button variant="outlined" onClick={onClose} disabled={loading}>
					Hủy
				</Button>
				<Button
					variant="contained"
					onClick={handleCreate}
					disabled={!canCreate || loading}
					startIcon={
						loading ? <CircularProgress size={16} /> : <GroupAddIcon />
					}
				>
					Tạo nhóm
				</Button>
			</DialogActions>
		</Dialog>
	);
};
