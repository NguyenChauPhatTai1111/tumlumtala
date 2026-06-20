import { yupResolver } from "@hookform/resolvers/yup";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import { Alert, Box, Button, Paper, TextField, Typography } from "@mui/material";
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
        minHeight: "100vh",
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${theme.palette.background.default} 50%, ${alpha(theme.palette.secondary.main, 0.08)} 100%)`,
        backgroundSize: "300% 300%",
        animation: "gradientShift 12s ease infinite",
        "@keyframes gradientShift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        position: "relative",
        overflow: "hidden",
      })}
    >
      {/* Blob decorations */}
      <Box
        sx={(theme) => ({
          position: "fixed",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.08)} 0%, transparent 70%)`,
          top: -200,
          right: "5%",
          pointerEvents: "none",
        })}
      />
      <Box
        sx={(theme) => ({
          position: "fixed",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.06)} 0%, transparent 70%)`,
          bottom: -100,
          left: "5%",
          pointerEvents: "none",
        })}
      />

      {/* Left: branding panel (desktop only) */}
      <Box
        sx={{
          flex: 1,
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          p: { md: 5, lg: 8 },
          position: "relative",
          zIndex: 1,
        }}
      >
        <Box sx={{ position: "relative", display: "inline-flex" }}>
          <Box
            sx={(theme) => ({
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.primary.main} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 12px 40px ${alpha(theme.palette.secondary.main, 0.35)}`,
            })}
          >
            <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 48, color: "#fff" }} />
          </Box>
          <Box
            sx={(theme) => ({
              position: "absolute",
              inset: -8,
              borderRadius: "50%",
              border: "2px solid",
              borderColor: alpha(theme.palette.secondary.main, 0.28),
              animation: "ping 2.4s ease-in-out infinite",
              "@keyframes ping": {
                "0%": { transform: "scale(1)", opacity: 0.6 },
                "100%": { transform: "scale(1.5)", opacity: 0 },
              },
            })}
          />
        </Box>

        <Box sx={{ textAlign: "center", maxWidth: 380 }}>
          <Typography variant="h5" fontWeight={600} gutterBottom sx={{ letterSpacing: -0.5 }}>
            Tham gia ngay hôm nay
          </Typography>
          <Typography
            variant="h4"
            fontWeight={800}
            gutterBottom
            sx={{ color: "secondary.main", letterSpacing: -0.5 }}
          >
            TumLumTala Admin
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tạo tài khoản để bắt đầu quản trị hệ thống
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Hỗ trợ phân quyền RBAC đầy đủ
          </Typography>
        </Box>

        {/* Step hints */}
        <Box
          sx={(theme) => ({
            p: 3,
            borderRadius: 4,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: alpha(theme.palette.background.paper, 0.6),
            backdropFilter: "blur(10px)",
            maxWidth: 380,
            width: "100%",
          })}
        >
          {[
            { step: "1", text: "Điền đầy đủ thông tin đăng ký" },
            { step: "2", text: "Admin sẽ cấp quyền truy cập" },
            { step: "3", text: "Đăng nhập và bắt đầu làm việc" },
          ].map((item) => (
            <Box key={item.step} sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2, "&:last-child": { mb: 0 } }}>
              <Box
                sx={(theme) => ({
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.primary.main} 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                })}
              >
                <Typography variant="caption" sx={{ color: "#fff", fontWeight: 700 }}>
                  {item.step}
                </Typography>
              </Box>
              <Typography variant="body2">{item.text}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Right: form */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: { xs: 1, md: "none" },
          width: { md: 480 },
          p: { xs: 2, sm: 4 },
          position: "relative",
          zIndex: 1,
        }}
      >
        <Paper
          elevation={0}
          sx={(theme) => ({
            p: { xs: 3, sm: 4 },
            width: "100%",
            maxWidth: 440,
            bgcolor: alpha(theme.palette.background.paper, 0.7),
            backdropFilter: "blur(20px)",
            border: "1px solid",
            borderColor: alpha(theme.palette.divider, 0.5),
            borderRadius: 4,
            animation: "glowPulse 3s ease-in-out infinite",
            "@keyframes glowPulse": {
              "0%, 100%": {
                boxShadow: `0 8px 32px ${alpha(theme.palette.secondary.main, 0.08)}`,
              },
              "50%": {
                boxShadow: `0 8px 48px ${alpha(theme.palette.secondary.main, 0.22)}`,
              },
            },
          })}
        >
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Đăng ký tài khoản
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tạo tài khoản mới trên hệ thống TumLumTala
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
              {error}
            </Alert>
          )}

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
              color="secondary"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ mt: 2, py: 1.5, borderRadius: 2, textTransform: "none", fontSize: "1rem" }}
            >
              {loading ? "Đang đăng ký..." : "Đăng ký"}
            </Button>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Button
              onClick={() => navigate("/login")}
              fullWidth
              variant="outlined"
              sx={{ borderRadius: 2, textTransform: "none" }}
            >
              Đã có tài khoản? Đăng nhập
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};
