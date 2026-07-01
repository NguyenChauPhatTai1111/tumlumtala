import { yupResolver } from "@hookform/resolvers/yup";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import { Alert, Box, Button, Divider, Paper, TextField, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import * as yup from "yup";
import { login } from "@api/authApi";
import { authStore } from "@store/authStore";
import { loginWithPasskey } from "@/services/webAuthnService";

const schema = yup.object({
  email: yup.string().email("Email không hợp lệ").required("Vui lòng nhập email"),
  password: yup
    .string()
    .min(6, "Mật khẩu tối thiểu 6 ký tự")
    .required("Vui lòng nhập mật khẩu"),
});

type FormData = { email: string; password: string };

const FEATURES = [
  {
    icon: <PeopleOutlinedIcon sx={{ fontSize: 26 }} />,
    title: "Quản lý người dùng",
    description: "Tạo, chỉnh sửa và phân quyền người dùng trong hệ thống",
  },
  {
    icon: <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 26 }} />,
    title: "Phân quyền linh hoạt",
    description: "Hệ thống RBAC với các cấp administrator, manager, member",
  },
  {
    icon: <BarChartOutlinedIcon sx={{ fontSize: 26 }} />,
    title: "Thống kê & Báo cáo",
    description: "Theo dõi hoạt động và thống kê người dùng theo thời gian thực",
  },
  {
    icon: <SettingsOutlinedIcon sx={{ fontSize: 26 }} />,
    title: "Microservices",
    description: "Kiến trúc microservices với gRPC, JWT, Redis cache",
  },
] as const;

const LoginLanding = () => (
  <Box
    sx={{
      flex: 1,
      display: { xs: "none", md: "flex" },
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
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
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.35)}`,
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
          borderColor: alpha(theme.palette.primary.main, 0.28),
          animation: "ping 2.4s ease-in-out infinite",
          "@keyframes ping": {
            "0%": { transform: "scale(1)", opacity: 0.6 },
            "100%": { transform: "scale(1.5)", opacity: 0 },
          },
        })}
      />
    </Box>

    <Box sx={{ textAlign: "center", maxWidth: 400 }}>
      <Typography variant="h5" fontWeight={600} gutterBottom sx={{ letterSpacing: -0.5 }}>
        Chào mừng đến với
      </Typography>
      <Typography
        variant="h4"
        fontWeight={800}
        gutterBottom
        sx={{ color: "primary.main", letterSpacing: -0.5 }}
      >
        TumLumTala Admin
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Nền tảng quản trị microservices
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Đăng nhập để truy cập bảng điều khiển
      </Typography>
    </Box>

    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, width: "100%", maxWidth: 420 }}>
      {FEATURES.map((feature) => (
        <Paper
          key={feature.title}
          elevation={0}
          sx={(theme) => ({
            p: 2,
            display: "flex",
            alignItems: "center",
            gap: 2,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: alpha(theme.palette.background.paper, 0.75),
            backdropFilter: "blur(10px)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            "&:hover": {
              transform: "translateX(6px)",
              boxShadow: `0 8px 28px ${alpha(theme.palette.primary.main, 0.13)}`,
            },
          })}
        >
          <Box
            sx={(theme) => ({
              width: 44,
              height: 44,
              borderRadius: 2,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              flexShrink: 0,
              boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.3)}`,
            })}
          >
            {feature.icon}
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight={700}>
              {feature.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5, display: "block" }}>
              {feature.description}
            </Typography>
          </Box>
        </Paper>
      ))}
    </Box>
  </Box>
);

export const LoginPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [faceIdEmail, setFaceIdEmail] = useState("");
  const [faceIdLoading, setFaceIdLoading] = useState(false);
  const [faceIdError, setFaceIdError] = useState("");

  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({ resolver: yupResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError("");
    try {
      const res = await login(data.email, data.password);
      authStore.setToken(res.access_token);
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(
        axiosErr.response?.data?.message ?? "Đăng nhập thất bại. Kiểm tra lại thông tin.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFaceIdLogin = async () => {
    if (!faceIdEmail.trim()) {
      setFaceIdError("Vui lòng nhập email trước khi dùng Face ID");
      return;
    }
    setFaceIdLoading(true);
    setFaceIdError("");
    try {
      const accessToken = await loginWithPasskey(faceIdEmail.trim());
      authStore.setToken(accessToken);
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (e.name === "NotAllowedError") {
        setFaceIdError("Xác thực bị từ chối hoặc hết thời gian. Vui lòng thử lại.");
      } else {
        setFaceIdError(e.message ?? "Đăng nhập bằng Face ID thất bại. Thiết bị có thể chưa đăng ký.");
      }
    } finally {
      setFaceIdLoading(false);
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
          background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 70%)`,
          top: -200,
          left: "5%",
          pointerEvents: "none",
        })}
      />
      <Box
        sx={(theme) => ({
          position: "fixed",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.06)} 0%, transparent 70%)`,
          bottom: -100,
          right: "5%",
          pointerEvents: "none",
        })}
      />

      <LoginLanding />

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: { xs: 1, md: "none" },
          width: { md: 460 },
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
            maxWidth: 420,
            bgcolor: alpha(theme.palette.background.paper, 0.7),
            backdropFilter: "blur(20px)",
            border: "1px solid",
            borderColor: alpha(theme.palette.divider, 0.5),
            borderRadius: 4,
            animation: "glowPulse 3s ease-in-out infinite",
            "@keyframes glowPulse": {
              "0%, 100%": {
                boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.08)}`,
              },
              "50%": {
                boxShadow: `0 8px 48px ${alpha(theme.palette.primary.main, 0.22)}`,
              },
            },
          })}
        >
          <Box sx={{ mb: 3, textAlign: "center" }}>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Đăng nhập
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Nhập thông tin để tiếp tục
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
              {error}
            </Alert>
          )}

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
                  onChange={(e) => {
                    field.onChange(e);
                    setFaceIdEmail(e.target.value);
                  }}
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
              size="large"
              disabled={loading}
              sx={{ mt: 2, py: 1.5, borderRadius: 2, textTransform: "none", fontSize: "1rem" }}
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
          </Box>

          {/* Face ID / Passkey login */}
          <Divider sx={{ my: 2 }}>
            <Typography variant="caption" color="text.secondary">
              hoặc
            </Typography>
          </Divider>

          {faceIdError && (
            <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setFaceIdError("")}>
              {faceIdError}
            </Alert>
          )}

          <Button
            fullWidth
            size="large"
            variant="outlined"
            disabled={faceIdLoading}
            onClick={handleFaceIdLogin}
            startIcon={<FingerprintIcon />}
            sx={(theme) => ({
              py: 1.5,
              borderRadius: 2,
              textTransform: "none",
              fontSize: "1rem",
              borderColor: alpha(theme.palette.primary.main, 0.5),
              color: "primary.main",
              "&:hover": {
                borderColor: "primary.main",
                bgcolor: alpha(theme.palette.primary.main, 0.06),
              },
            })}
          >
            {faceIdLoading ? "Đang xác thực..." : "Đăng nhập bằng Face ID / Passkey"}
          </Button>

          <Box sx={{ mt: 2 }}>
            <Button
              onClick={() => navigate("/register")}
              fullWidth
              variant="outlined"
              color="secondary"
              sx={{ borderRadius: 2, textTransform: "none" }}
            >
              Chưa có tài khoản? Đăng ký ngay
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};
