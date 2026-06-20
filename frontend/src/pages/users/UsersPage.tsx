import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import SearchIcon from "@mui/icons-material/Search";
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
  gridPageCountSelector,
  useGridApiContext,
  useGridSelector,
} from "@mui/x-data-grid";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createUser, deleteUser, listUsers, updateUser } from "@api/userApi";
import type { IUser } from "@/types";
import {
  UserFormDialog,
  type UserFormData,
} from "@components/user/dialog/UserFormDialog";
import { ConfirmDeleteDialog } from "@components/user/dialog/ConfirmDeleteDialog";

const ROLE_COLOR: Record<string, "error" | "warning" | "default"> = {
  administrator: "error",
  manager: "warning",
  member: "default",
};

const ROLE_LABEL: Record<string, string> = {
  administrator: "Administrator",
  manager: "Manager",
  member: "Member",
};

function CustomPagination() {
  const apiRef = useGridApiContext();
  const pageCount = useGridSelector(apiRef, gridPageCountSelector);
  const { page, pageSize } = apiRef.current.state.pagination.paginationModel;
  const rowCount = apiRef.current.state.pagination.rowCount;

  const rangeStart = rowCount > 0 ? page * pageSize + 1 : 0;
  const rangeEnd = Math.min((page + 1) * pageSize, rowCount);

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
      <Typography variant="body2" color="text.secondary">
        {rangeStart}–{rangeEnd} / {rowCount}
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <IconButton
          size="small"
          disabled={page === 0}
          onClick={() => apiRef.current.setPage(page - 1)}
        >
          <NavigateBeforeIcon fontSize="small" />
        </IconButton>
        <Typography variant="body2" sx={{ minWidth: 60, textAlign: "center" }}>
          {page + 1} / {pageCount || 1}
        </Typography>
        <IconButton
          size="small"
          disabled={page >= (pageCount || 1) - 1}
          onClick={() => apiRef.current.setPage(page + 1)}
        >
          <NavigateNextIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}

export const UsersPage = () => {
  const [users, setUsers] = useState<IUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<IUser | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listUsers(
        paginationModel.pageSize,
        paginationModel.page * paginationModel.pageSize,
      );
      setUsers(res.users ?? []);
      setTotal(res.total ?? 0);
    } catch {
      setError("Không thể tải danh sách người dùng.");
    } finally {
      setLoading(false);
    }
  }, [paginationModel.page, paginationModel.pageSize]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        !search ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.fullname.toLowerCase().includes(search.toLowerCase());
      const matchRole = !filterRole || u.role === filterRole;
      return matchSearch && matchRole;
    });
  }, [users, search, filterRole]);

  const handleOpenCreate = () => {
    setSelectedUser(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (user: IUser) => {
    setSelectedUser(user);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: UserFormData) => {
    setFormLoading(true);
    try {
      if (selectedUser) {
        const updated = await updateUser(selectedUser.uuid, {
          email: data.email,
          fullname: data.fullname,
          role: data.role,
        });
        setUsers((prev) => prev.map((u) => (u.uuid === updated.uuid ? updated : u)));
      } else {
        const created = await createUser({
          email: data.email,
          fullname: data.fullname,
          password: data.password!,
          role: data.role,
        });
        setUsers((prev) => [created, ...prev]);
        setTotal((t) => t + 1);
      }
      setFormOpen(false);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message ?? "Thao tác thất bại.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleOpenDelete = (user: IUser) => {
    setDeleteTarget(user);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteUser(deleteTarget.uuid);
      setUsers((prev) => prev.filter((u) => u.uuid !== deleteTarget.uuid));
      setTotal((t) => t - 1);
      setDeleteOpen(false);
    } catch {
      setError("Không thể xóa người dùng.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: GridColDef<IUser>[] = [
    {
      field: "fullname",
      headerName: "Họ tên",
      flex: 1,
      minWidth: 150,
      renderCell: ({ value }) => (
        <Typography variant="body2" fontWeight={500}>
          {value}
        </Typography>
      ),
    },
    { field: "email", headerName: "Email", flex: 1.5, minWidth: 200 },
    {
      field: "role",
      headerName: "Vai trò",
      width: 150,
      renderCell: ({ value }) => (
        <Chip
          label={ROLE_LABEL[value] ?? value}
          color={ROLE_COLOR[value] ?? "default"}
          size="small"
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />
      ),
    },
    {
      field: "created_at",
      headerName: "Ngày tạo",
      width: 160,
      renderCell: ({ value }) =>
        value ? new Date(value).toLocaleDateString("vi-VN") : "-",
    },
    {
      field: "actions",
      headerName: "Thao tác",
      width: 110,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5} alignItems="center" height="100%">
          <Tooltip title="Chỉnh sửa">
            <IconButton size="small" color="primary" onClick={() => handleOpenEdit(row)}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Xóa">
            <IconButton size="small" color="error" onClick={() => handleOpenDelete(row)}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      {/* Page heading */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
        }}
      >
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
            <Box
              sx={(theme) => ({
                width: 36,
                height: 36,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              })}
            >
              <PeopleOutlinedIcon sx={{ fontSize: 20, color: "#fff" }} />
            </Box>
            <Typography variant="h5" fontWeight={700}>
              Quản lý Người Dùng
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 6.5 }}>
            Tổng cộng {total} người dùng trong hệ thống
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
          sx={{ textTransform: "none", borderRadius: 2, px: 2.5, py: 1 }}
        >
          Thêm người dùng
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper
        elevation={0}
        sx={(theme) => ({
          p: 2,
          mb: 2,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
          bgcolor: alpha(theme.palette.background.paper, 0.8),
        })}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
          <TextField
            size="small"
            placeholder="Tìm theo tên hoặc email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, minWidth: 220 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Vai trò</InputLabel>
            <Select
              label="Vai trò"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="member">Member</MenuItem>
              <MenuItem value="manager">Manager</MenuItem>
              <MenuItem value="administrator">Administrator</MenuItem>
            </Select>
          </FormControl>
          {(search || filterRole) && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => { setSearch(""); setFilterRole(""); }}
              sx={{ textTransform: "none", borderRadius: 2 }}
            >
              Xóa bộ lọc
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Table */}
      <Paper
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
          overflow: "hidden",
          width: "100%",
        }}
      >
        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <DataGrid
            rows={filteredUsers}
            columns={columns}
            getRowId={(row) => row.uuid}
            loading={loading}
            paginationMode="server"
            rowCount={total}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 25, 50]}
            autoHeight
            disableRowSelectionOnClick
            slots={{ pagination: CustomPagination }}
            sx={{
              border: 0,
              "& .MuiDataGrid-columnHeaders": {
                bgcolor: "action.hover",
                borderBottom: "1px solid",
                borderColor: "divider",
              },
              "& .MuiDataGrid-row:hover": {
                bgcolor: "action.hover",
              },
              "& .MuiDataGrid-cell:focus": {
                outline: "none",
              },
              "& .MuiDataGrid-cell:focus-within": {
                outline: "none",
              },
              minWidth: 600,
            }}
          />
        </Box>
      </Paper>

      {/* Dialogs */}
      <UserFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        user={selectedUser}
        loading={formLoading}
      />
      <ConfirmDeleteDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        name={deleteTarget?.fullname}
        loading={deleteLoading}
      />
    </Box>
  );
};
