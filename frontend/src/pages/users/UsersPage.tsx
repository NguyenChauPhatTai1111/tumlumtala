import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
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
  gridPaginationModelSelector,
  gridPaginationRowCountSelector,
  useGridApiContext,
  useGridSelector,
} from "@mui/x-data-grid";
import { useCallback, useEffect, useMemo, useState } from "react";
import { changeUserStatus, createUser, deleteUser, listUsers, updateUser } from "@api/userApi";
import type { IUser } from "@/types";
import {
  UserFormDialog,
  type UserFormData,
} from "@components/user/dialog/UserFormDialog";
import { ConfirmDeleteDialog } from "@components/user/dialog/ConfirmDeleteDialog";
import { useCurrentUser } from "@/hooks/common/useCurrentUser";
import { isAdminIdentity } from "@/utils/permissionAccess";
import { resolveCdnUrl } from "@/utils/urlUtils";

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

const STATUS_COLOR: Record<string, "success" | "default"> = {
  active: "success",
  inactive: "default",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
};

const getUserInitials = (name?: string) =>
  (name || "U")
    .split(" ")
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

function CustomPagination() {
  const apiRef = useGridApiContext();
  const pageCount = useGridSelector(apiRef, gridPageCountSelector);
  const { page, pageSize } = useGridSelector(apiRef, gridPaginationModelSelector);
  const rowCount = useGridSelector(apiRef, gridPaginationRowCountSelector);

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

interface MobileCardProps {
  user: IUser;
  canManage: boolean;
  onEdit: (u: IUser) => void;
  onDelete: (u: IUser) => void;
  onToggleStatus: (u: IUser) => void;
  toggling: boolean;
}

function MobileUserCard({ user, canManage, onEdit, onDelete, onToggleStatus, toggling }: MobileCardProps) {
  const initials = user.fullname
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Paper
      elevation={0}
      sx={(theme) => ({
        p: 2,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        bgcolor: alpha(theme.palette.background.paper, 0.8),
        transition: "box-shadow 0.2s",
        "&:active": { boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.12)}` },
      })}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Avatar
          sx={(theme) => ({
            width: 40,
            height: 40,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            fontSize: 14,
            fontWeight: 700,
            flexShrink: 0,
          })}
        >
          {initials}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" fontWeight={600} noWrap>
            {user.fullname}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
            {user.email}
          </Typography>
        </Box>
        {canManage && (
          <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
            <Tooltip title="Chỉnh sửa">
              <IconButton size="small" color="primary" onClick={() => onEdit(user)}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Xóa">
              <IconButton size="small" color="error" onClick={() => onDelete(user)}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>
      <Divider sx={{ my: 1.5 }} />
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label={ROLE_LABEL[user.role] ?? user.role}
            color={ROLE_COLOR[user.role] ?? "default"}
            size="small"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
          <Chip
            label={STATUS_LABEL[user.status ?? "active"] ?? user.status}
            color={STATUS_COLOR[user.status ?? "active"] ?? "default"}
            size="small"
            sx={{ fontWeight: 600 }}
          />
        </Stack>
        {canManage && (
          <Switch
            size="small"
            checked={(user.status ?? "active") === "active"}
            disabled={toggling}
            onChange={() => onToggleStatus(user)}
          />
        )}
      </Box>
      {canManage && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {user.created_at ? new Date(user.created_at).toLocaleDateString("vi-VN") : "-"}
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

function MobilePagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total > 0 ? page * pageSize + 1 : 0;
  const rangeEnd = Math.min((page + 1) * pageSize, total);

  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pt: 1 }}>
      <Typography variant="body2" color="text.secondary">
        {rangeStart}–{rangeEnd} / {total}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <IconButton size="small" disabled={page === 0} onClick={() => onPageChange(page - 1)}>
          <NavigateBeforeIcon fontSize="small" />
        </IconButton>
        <Typography variant="body2" sx={{ minWidth: 52, textAlign: "center" }}>
          {page + 1} / {pageCount}
        </Typography>
        <IconButton
          size="small"
          disabled={page >= pageCount - 1}
          onClick={() => onPageChange(page + 1)}
        >
          <NavigateNextIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}

export const UsersPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { data: currentUser } = useCurrentUser();
  const canManageUsers = isAdminIdentity(currentUser);

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
  const [filterStatus, setFilterStatus] = useState("");
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        !search ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.fullname.toLowerCase().includes(search.toLowerCase());
      const matchRole = !filterRole || u.role === filterRole;
      const matchStatus = !filterStatus || (u.status ?? "active") === filterStatus;
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, filterRole, filterStatus]);

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

  const handleToggleStatus = async (user: IUser) => {
    const nextStatus = (user.status ?? "active") === "active" ? "inactive" : "active";
    setTogglingUserId(user.uuid);
    try {
      const updated = await changeUserStatus(user.uuid, { status: nextStatus });
      setUsers((prev) => prev.map((u) => (u.uuid === updated.uuid ? updated : u)));
    } catch {
      setError("Không thể cập nhật trạng thái người dùng.");
    } finally {
      setTogglingUserId(null);
    }
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

  const managementColumns: GridColDef<IUser>[] = canManageUsers
    ? [
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
          width: 170,
          sortable: false,
          filterable: false,
          renderCell: ({ row }) => (
            <Stack direction="row" spacing={0.5} alignItems="center" height="100%">
              <Tooltip title={(row.status ?? "active") === "active" ? "Chuyển inactive" : "Chuyển active"}>
                <Switch
                  size="small"
                  checked={(row.status ?? "active") === "active"}
                  disabled={togglingUserId === row.uuid}
                  onChange={() => handleToggleStatus(row)}
                />
              </Tooltip>
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
      ]
    : [];

  const columns: GridColDef<IUser>[] = [
    {
      field: "avatar",
      headerName: "Avatar",
      width: 96,
      sortable: false,
      filterable: false,
      align: "center",
      headerAlign: "center",
      renderCell: ({ row }) => (
        <Box sx={{ display: "grid", placeItems: "center", height: "100%" }}>
          <Avatar
            src={resolveCdnUrl(row.avatar)}
            alt={row.fullname}
            sx={(t) => ({
              width: 40,
              height: 40,
              fontSize: 13,
              fontWeight: 800,
              background: `linear-gradient(135deg, ${t.palette.primary.main} 0%, ${t.palette.secondary.main} 100%)`,
            })}
          >
            {getUserInitials(row.fullname)}
          </Avatar>
        </Box>
      ),
    },
    {
      field: "fullname",
      headerName: "Họ tên",
      flex: 1,
      minWidth: 150,
      renderCell: ({ row }) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography variant="body2" fontWeight={500}>
            {row.fullname}
          </Typography>
        </Box>
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
      field: "status",
      headerName: "Trạng thái",
      width: 140,
      renderCell: ({ value }) => {
        const status = value ?? "active";
        return (
          <Chip
            label={STATUS_LABEL[status] ?? status}
            color={STATUS_COLOR[status] ?? "default"}
            size="small"
            sx={{ fontWeight: 600 }}
          />
        );
      },
    },
    ...managementColumns,
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
              sx={(t) => ({
                width: 36,
                height: 36,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${t.palette.primary.main} 0%, ${t.palette.secondary.main} 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              })}
            >
              <PeopleOutlinedIcon sx={{ fontSize: 20, color: "#fff" }} />
            </Box>
            <Typography variant="h5" fontWeight={700}>
              Quản lý Người Dùng
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ ml: { xs: 0, sm: 6.5 } }}>
            Tổng cộng {total} người dùng trong hệ thống
          </Typography>
        </Box>

        {canManageUsers && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
            fullWidth={isMobile}
            sx={{ textTransform: "none", borderRadius: 2, px: 2.5, py: 1 }}
          >
            Thêm người dùng
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper
        elevation={0}
        sx={(t) => ({
          p: 2,
          mb: 2,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
          bgcolor: alpha(t.palette.background.paper, 0.8),
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
            sx={{ flex: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 160 } }}>
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
          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 150 } }}>
            <InputLabel>Trạng thái</InputLabel>
            <Select
              label="Trạng thái"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
          {(search || filterRole || filterStatus) && (
            <Button
              size="small"
              variant="outlined"
              fullWidth={isMobile}
              onClick={() => { setSearch(""); setFilterRole(""); setFilterStatus(""); }}
              sx={{ textTransform: "none", borderRadius: 2 }}
            >
              Xóa bộ lọc
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Mobile card list */}
      {isMobile ? (
        <Box>
          {loading ? (
            <Stack spacing={2}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3 }} />
              ))}
            </Stack>
          ) : filteredUsers.length === 0 ? (
            <Paper
              elevation={0}
              sx={{ p: 4, border: "1px solid", borderColor: "divider", borderRadius: 3, textAlign: "center" }}
            >
              <Typography color="text.secondary">Không có người dùng nào</Typography>
            </Paper>
          ) : (
            <Stack spacing={1.5}>
              {filteredUsers.map((user) => (
                <MobileUserCard
                  key={user.uuid}
                  user={user}
                  canManage={canManageUsers}
                  onEdit={handleOpenEdit}
                  onDelete={handleOpenDelete}
                  onToggleStatus={handleToggleStatus}
                  toggling={togglingUserId === user.uuid}
                />
              ))}
            </Stack>
          )}
          <Box sx={{ mt: 2 }}>
            <MobilePagination
              page={paginationModel.page}
              pageSize={paginationModel.pageSize}
              total={total}
              onPageChange={(p) => setPaginationModel((m) => ({ ...m, page: p }))}
            />
          </Box>
        </Box>
      ) : (
        /* Desktop DataGrid */
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
                "& .MuiDataGrid-row:hover": { bgcolor: "action.hover" },
                "& .MuiDataGrid-cell:focus": { outline: "none" },
                "& .MuiDataGrid-cell:focus-within": { outline: "none" },
                minWidth: 600,
              }}
            />
          </Box>
        </Paper>
      )}

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
