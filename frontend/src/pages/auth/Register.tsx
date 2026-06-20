import { yupResolver } from "@hookform/resolvers/yup";
import { Box, Button, Paper, TextField, Typography, Alert } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import * as yup from "yup";
import { createUser } from "@api/userApi";

const schema = yup.object({
  email: yup.string().email("Email không hợp lệ").required("Vui lòng nhập email"),
  fullname: yup.string().min(2, "Họ tên tối thiểu 2 ký tự").required("Vui lòng nhập họ tên"),
  password: yup.string().min(8, "Mật khẩu tối thiểu 8 ký tự").required("Vui lòng nhập mật khẩu"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password")], "Mật khẩu xác nhận không khớp")
    .required("Vui lòng xác nhận mật khẩu"),
});

type FormData = {
  email: string;
  fullname: string;
  password: string;
  confirmPassword: string;
};

export const RegisterPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: yupResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError("");
    try {
      await createUser({ email: data.email, password: data.password, fullname: data.fullname });
      navigate("/login", { replace: true });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message ?? "Đăng ký thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={(theme) => ({
        display: "flex",
        height: "100vh",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.16)} 0%, ${theme.palette.background.default} 40%, ${alpha(theme.palette.info.main, 0.12)} 100%)`,
        backgroundSize: "300% 300%",
        animation: "gradientShift 10s ease infinite",
        "@keyframes gradientShift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      })}
    >
      <Box
        sx={(theme) => ({
          position: "fixed",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(theme.palette.success.main, 0.09)} 0%, transparent 70%)`,
          top: -160,
          right: "10%",
          pointerEvents: "none",
        })}
      />
      <Box
        sx={(theme) => ({
          position: "fixed",
          width: 380,
          height: 380,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(theme.palette.info.main, 0.08)} 0%, transparent 70%)`,
          bottom: -100,
          left: "10%",
          pointerEvents: "none",
        })}
      />

      <Paper
        sx={(theme) => ({
          p: 4,
          width: "100%",
          maxWidth: 440,
          mx: 2,
          bgcolor: alpha(theme.palette.background.paper, 0.6),
          backdropFilter: "blur(20px)",
          border: "1px solid",
          borderColor: alpha(theme.palette.success.main, 0.2),
          borderRadius: 4,
          animation: "glowPulse 3s ease-in-out infinite",
          "@keyframes glowPulse": {
            "0%, 100%": { boxShadow: `0 8px 32px ${alpha(theme.palette.success.main, 0.1)}` },
            "50%": { boxShadow: `0 8px 48px ${alpha(theme.palette.success.main, 0.4)}` },
          },
          position: "relative",
          zIndex: 1,
        })}
      >
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>
          Đăng ký tài khoản
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
          Tạo tài khoản mới trên hệ thống TumLumTala
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <TextField
            label="Họ và tên"
            fullWidth
            margin="normal"
            autoFocus
            {...register("fullname")}
            error={!!errors.fullname}
            helperText={errors.fullname?.message}
          />
          <TextField
            label="Email"
            fullWidth
            margin="normal"
            autoComplete="email"
            {...register("email")}
            error={!!errors.email}
            helperText={errors.email?.message}
          />
          <TextField
            label="Mật khẩu"
            type="password"
            fullWidth
            margin="normal"
            autoComplete="new-password"
            {...register("password")}
            error={!!errors.password}
            helperText={errors.password?.message}
          />
          <TextField
            label="Xác nhận mật khẩu"
            type="password"
            fullWidth
            margin="normal"
            autoComplete="new-password"
            {...register("confirmPassword")}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
          />
          <Button
            type="submit"
            variant="contained"
            color="success"
            fullWidth
            disabled={loading}
            sx={{ mt: 2, py: 1.5, borderRadius: 2 }}
          >
            {loading ? "Đang đăng ký..." : "Đăng ký"}
          </Button>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Button
            onClick={() => navigate("/login")}
            fullWidth
            variant="outlined"
            color="info"
            sx={{ borderRadius: 2 }}
          >
            Đã có tài khoản? Đăng nhập
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
