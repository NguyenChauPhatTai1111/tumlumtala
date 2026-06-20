import {
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createUser,
  deleteUser,
  listUsers,
  updateUser,
} from "@api/userApi";
import type { IUser } from "@/types";
import { UserFormDialog, type UserFormData } from "@components/user/dialog/UserFormDialog";
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

export const UsersPage = () => {
  const [users, setUsers] = useState<IUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
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
      const res = await listUsers(pageSize, page * pageSize);
      setUsers(res.users ?? []);
      setTotal(res.total ?? 0);
    } catch {
      setError("Không thể tải danh sách người dùng.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

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
    { field: "fullname", headerName: "Họ tên", flex: 1, minWidth: 150 },
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
        />
      ),
    },
    {
      field: "created_at",
      headerName: "Ngày tạo",
      width: 170,
      renderCell: ({ value }) =>
        value ? new Date(value).toLocaleString("vi-VN") : "-",
    },
    {
      field: "actions",
      headerName: "Thao tác",
      width: 140,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5} alignItems="center" height="100%">
          <Button
            size="small"
            startIcon={<EditIcon />}
            onClick={() => handleOpenEdit(row)}
          >
            Sửa
          </Button>
          <Button
            size="small"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => handleOpenDelete(row)}
          >
            Xóa
          </Button>
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Quản lý Người Dùng
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tổng cộng {total} người dùng
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
          Thêm người dùng
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            size="small"
            placeholder="Tìm theo tên hoặc email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 260 }}
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
        </Stack>
      </Paper>

      {/* Table */}
      <Paper sx={{ height: "calc(100vh - 320px)", minHeight: 400 }}>
        {loading ? (
          <Box display="flex" alignItems="center" justifyContent="center" height="100%">
            <CircularProgress />
          </Box>
        ) : (
          <DataGrid
            rows={filteredUsers}
            columns={columns}
            getRowId={(row) => row.uuid}
            rowCount={total}
            paginationMode="server"
            paginationModel={{ page, pageSize }}
            onPaginationModelChange={({ page: p, pageSize: ps }) => {
              setPage(p);
              setPageSize(ps);
            }}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
            sx={{ border: 0 }}
          />
        )}
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
