import { yupResolver } from "@hookform/resolvers/yup";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import type { IUser } from "@/types";

const createSchema = yup.object({
  email: yup.string().email("Email không hợp lệ").required("Bắt buộc"),
  fullname: yup.string().min(2, "Tối thiểu 2 ký tự").required("Bắt buộc"),
  password: yup.string().min(8, "Tối thiểu 8 ký tự").required("Bắt buộc"),
  role: yup.string().required("Bắt buộc"),
});

const editSchema = yup.object({
  email: yup.string().email("Email không hợp lệ").required("Bắt buộc"),
  fullname: yup.string().min(2, "Tối thiểu 2 ký tự").required("Bắt buộc"),
  password: yup.string().optional(),
  role: yup.string().required("Bắt buộc"),
});

export type UserFormData = {
  email: string;
  fullname: string;
  password?: string;
  role: string;
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: UserFormData) => Promise<void>;
  user?: IUser | null;
  loading?: boolean;
}

export const UserFormDialog = ({ open, onClose, onSubmit, user, loading }: Props) => {
  const isEdit = !!user;

  const { control, handleSubmit, reset, formState: { errors } } = useForm<UserFormData>({
    resolver: yupResolver(isEdit ? editSchema : createSchema),
    defaultValues: { email: "", fullname: "", password: "", role: "member" },
  });

  useEffect(() => {
    if (open) {
      reset({
        email: user?.email ?? "",
        fullname: user?.fullname ?? "",
        password: "",
        role: user?.role ?? "member",
      });
    }
  }, [open, user, reset]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? "Chỉnh sửa người dùng" : "Thêm người dùng mới"}</DialogTitle>
      <DialogContent dividers>
        <Controller
          name="fullname"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Họ và tên"
              fullWidth
              margin="normal"
              autoFocus={!isEdit}
              error={!!errors.fullname}
              helperText={errors.fullname?.message}
            />
          )}
        />
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Email"
              fullWidth
              margin="normal"
              error={!!errors.email}
              helperText={errors.email?.message}
            />
          )}
        />
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label={isEdit ? "Mật khẩu mới (để trống nếu không đổi)" : "Mật khẩu"}
              type="password"
              fullWidth
              margin="normal"
              error={!!errors.password}
              helperText={errors.password?.message}
            />
          )}
        />
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth margin="normal" error={!!errors.role}>
              <InputLabel>Vai trò</InputLabel>
              <Select {...field} label="Vai trò">
                <MenuItem value="member">Member</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
                <MenuItem value="administrator">Administrator</MenuItem>
              </Select>
            </FormControl>
          )}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading}>Hủy</Button>
        <Button
          variant="contained"
          onClick={handleSubmit(onSubmit)}
          disabled={loading}
        >
          {loading ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
