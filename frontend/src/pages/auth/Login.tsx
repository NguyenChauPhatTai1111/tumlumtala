import { yupResolver } from "@hookform/resolvers/yup";
import { Box, Button, Paper, TextField, Typography, Alert } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import * as yup from "yup";
import { login } from "@api/authApi";
import { authStore } from "@store/authStore";

const schema = yup.object({
  email: yup.string().email("Email không hợp lệ").required("Vui lòng nhập email"),
  password: yup.string().min(6, "Mật khẩu tối thiểu 6 ký tự").required("Vui lòng nhập mật khẩu"),
});

type FormData = { email: string; password: string };

export const LoginPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { handleSubmit, control, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError("");
    try {
      const res = await login(data.email, data.password);
      authStore.setToken(res.access_token);
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message ?? "Đăng nhập thất bại. Kiểm tra lại thông tin.");
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
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.18)} 0%, ${theme.palette.background.default} 40%, ${alpha(theme.palette.secondary.main, 0.14)} 100%)`,
        backgroundSize: "300% 300%",
        animation: "gradientShift 10s ease infinite",
        "@keyframes gradientShift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      })}
    >
      {/* Decorative blob top */}
      <Box
        sx={(theme) => ({
          position: "fixed",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 70%)`,
          top: -160,
          left: "10%",
          pointerEvents: "none",
        })}
      />
      {/* Decorative blob bottom */}
      <Box
        sx={(theme) => ({
          position: "fixed",
          width: 380,
          height: 380,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.08)} 0%, transparent 70%)`,
          bottom: -100,
          right: "10%",
          pointerEvents: "none",
        })}
      />

      <Paper
        sx={(theme) => ({
          p: 4,
          width: "100%",
          maxWidth: 420,
          mx: 2,
          bgcolor: alpha(theme.palette.background.paper, 0.6),
          backdropFilter: "blur(20px)",
          border: "1px solid",
          borderColor: alpha(theme.palette.divider, 0.5),
          borderRadius: 4,
          animation: "glowPulse 2.5s ease-in-out infinite",
          "@keyframes glowPulse": {
            "0%, 100%": { boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.1)}` },
            "50%": { boxShadow: `0 8px 48px ${alpha(theme.palette.primary.main, 0.5)}` },
          },
          position: "relative",
          zIndex: 1,
        })}
      >
        <Typography variant="h5" sx={{ mb: 1, textAlign: "center", fontWeight: 700 }}>
          TumLumTala
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, textAlign: "center", color: "text.secondary" }}>
          Đăng nhập vào hệ thống quản trị
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Controller
            name="email"
            control={control}
            defaultValue=""
            render={({ field }) => (
              <TextField
                {...field}
                label="Email"
                fullWidth
                margin="normal"
                autoFocus
                autoComplete="email"
                error={!!errors.email}
                helperText={errors.email?.message}
              />
            )}
          />
          <Controller
            name="password"
            control={control}
            defaultValue=""
            render={({ field }) => (
              <TextField
                {...field}
                label="Mật khẩu"
                type="password"
                fullWidth
                margin="normal"
                autoComplete="current-password"
                error={!!errors.password}
                helperText={errors.password?.message}
              />
            )}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            sx={{ mt: 2, py: 1.5, borderRadius: 2 }}
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </Button>
        </Box>

        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Button
            onClick={() => navigate("/register")}
            fullWidth
            variant="outlined"
            color="secondary"
            sx={{ borderRadius: 2 }}
          >
            Chưa có tài khoản? Đăng ký
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
