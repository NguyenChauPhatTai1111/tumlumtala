import BugReportRoundedIcon from "@mui/icons-material/BugReportRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useEffect } from "react";
import { useRouteError, isRouteErrorResponse } from "react-router-dom";
import { useAppErrorStore } from "@store/appErrorStore";

const TIPS = [
  {
    number: 1,
    icon: <RefreshRoundedIcon sx={{ fontSize: { xs: 22, md: 28 } }} />,
    title: "Thử tải lại",
    short: "Làm mới trang",
    description: "Nhấn nút làm mới hoặc F5 để tải lại trang, lỗi có thể tự hết",
  },
  {
    number: 2,
    icon: <BugReportRoundedIcon sx={{ fontSize: { xs: 22, md: 28 } }} />,
    title: "Lỗi không mong muốn",
    short: "Lỗi bất thường",
    description: "Có thể do dữ liệu bất thường hoặc kết nối mạng bị gián đoạn",
  },
  {
    number: 3,
    icon: <HomeRoundedIcon sx={{ fontSize: { xs: 22, md: 28 } }} />,
    title: "Về trang chủ",
    short: "Về trang chủ",
    description: "Quay về trang chủ để tiếp tục sử dụng các tính năng khác",
  },
] as const;

export function RouteErrorPage() {
  const error = useRouteError();
  const setBlockingError = useAppErrorStore((s) => s.setBlockingError);

  // Hide persistent overlays (bottom player, mini chat) while the error page shows.
  useEffect(() => {
    setBlockingError(true);
    return () => setBlockingError(false);
  }, [setBlockingError]);

  let message = "Ứng dụng gặp sự cố không mong muốn.";
  if (isRouteErrorResponse(error)) {
    message = `${error.status} ${error.statusText}`;
  } else if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  }

  return (
    <Box
      sx={(theme) => ({
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: { xs: 2.5, md: 5 },
        px: { xs: 2, md: 4 },
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        zIndex: 9999,
        background: `linear-gradient(-45deg, ${alpha(theme.palette.error.main, 0.18)}, ${theme.palette.background.default}, ${alpha(theme.palette.error.dark, 0.1)}, ${alpha(theme.palette.error.main, 0.08)})`,
        backgroundSize: "400% 400%",
        animation: "reGradient 10s ease infinite",
        "@keyframes reGradient": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      })}
    >
      {/* Decorative blobs */}
      <Box sx={(theme) => ({
        position: "absolute", width: { xs: 200, md: 320 }, height: { xs: 200, md: 320 },
        borderRadius: "50%", background: `radial-gradient(circle, ${alpha(theme.palette.error.main, 0.18)} 0%, transparent 70%)`,
        top: -100, right: -80, pointerEvents: "none",
        animation: "reBlob1 8s ease-in-out infinite",
        "@keyframes reBlob1": { "0%, 100%": { transform: "translate(0,0) scale(1)" }, "33%": { transform: "translate(-40px,30px) scale(1.1)" }, "66%": { transform: "translate(20px,-20px) scale(0.95)" } },
      })} />
      <Box sx={(theme) => ({
        position: "absolute", width: { xs: 160, md: 240 }, height: { xs: 160, md: 240 },
        borderRadius: "50%", background: `radial-gradient(circle, ${alpha(theme.palette.error.dark, 0.14)} 0%, transparent 70%)`,
        bottom: 0, left: -60, pointerEvents: "none",
        animation: "reBlob2 10s ease-in-out infinite",
        "@keyframes reBlob2": { "0%, 100%": { transform: "translate(0,0) scale(1)" }, "40%": { transform: "translate(50px,-30px) scale(1.15)" }, "70%": { transform: "translate(-20px,20px) scale(0.9)" } },
      })} />

      {/* Hero icon */}
      <Box sx={{ position: "relative", display: "inline-flex" }}>
        <Box sx={(theme) => ({
          width: { xs: 70, md: 88 }, height: { xs: 70, md: 88 }, borderRadius: "50%",
          background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 12px 40px ${alpha(theme.palette.error.main, 0.45)}`,
        })}>
          <WarningAmberRoundedIcon sx={{ fontSize: { xs: 36, md: 44 }, color: "error.contrastText" }} />
        </Box>
        <Box sx={(theme) => ({
          position: "absolute", inset: -8, borderRadius: "50%",
          border: "2px solid", borderColor: alpha(theme.palette.error.main, 0.3),
          animation: "rePing 2.4s ease-in-out infinite",
          "@keyframes rePing": { "0%": { transform: "scale(1)", opacity: 0.7 }, "100%": { transform: "scale(1.5)", opacity: 0 } },
        })} />
      </Box>

      {/* Title */}
      <Box sx={{ textAlign: "center", maxWidth: 480 }}>
        <Typography variant="h5" fontWeight={800} gutterBottom sx={{ letterSpacing: -0.5 }} color="error.main">
          Có lỗi xảy ra!
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Ứng dụng gặp sự cố không mong muốn. Bạn có thể thử tải lại hoặc quay về trang chủ.
        </Typography>
        {message && (
          <Typography variant="caption" sx={(theme) => ({
            display: "block", mt: 1.5, px: 2, py: 1, borderRadius: 2,
            bgcolor: alpha(theme.palette.error.main, 0.08),
            border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
            color: "error.main", fontFamily: "monospace", wordBreak: "break-all",
            maxWidth: 420, mx: "auto",
          })}>
            {message}
          </Typography>
        )}
      </Box>

      {/* Tip cards */}
      <Box sx={{ display: "flex", flexDirection: "row", gap: { xs: 1, md: 2 }, justifyContent: "center", alignItems: "stretch", width: "100%", maxWidth: 640 }}>
        {TIPS.map((tip) => (
          <Paper key={tip.number} elevation={0} sx={(theme) => ({
            flex: 1, p: { xs: 1.5, md: 2.5 }, display: "flex", flexDirection: "column",
            alignItems: "center", gap: { xs: 0.75, md: 1.5 }, borderRadius: 3,
            border: "1px solid", borderColor: alpha(theme.palette.error.main, 0.2),
            bgcolor: alpha(theme.palette.background.paper, 0.75), backdropFilter: "blur(10px)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            "&:hover": { transform: "translateY(-4px)", boxShadow: `0 10px 28px ${alpha(theme.palette.error.main, 0.18)}` },
          })}>
            <Box sx={(theme) => ({
              width: { xs: 28, md: 36 }, height: { xs: 28, md: 36 }, borderRadius: "50%",
              background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: theme.palette.error.contrastText, fontWeight: 800, fontSize: { xs: 13, md: 16 },
              boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.45)}`, flexShrink: 0,
            })}>
              {tip.number}
            </Box>
            <Box sx={{ color: "error.main", display: "flex", alignItems: "center" }}>{tip.icon}</Box>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5, fontSize: { xs: "0.7rem", md: "0.875rem" } }}>
                <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>{tip.title}</Box>
                <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>{tip.short}</Box>
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5, display: { xs: "none", sm: "block" } }}>
                {tip.description}
              </Typography>
            </Box>
          </Paper>
        ))}
      </Box>

      {/* CTAs */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <Button
          variant="outlined" size="large" startIcon={<RefreshRoundedIcon />}
          onClick={() => window.location.reload()}
          sx={(theme) => ({
            borderRadius: 6, fontWeight: 700, px: 3, py: 1.2,
            borderColor: alpha(theme.palette.error.main, 0.5), color: "error.main",
            "&:hover": { borderColor: "error.main", bgcolor: alpha(theme.palette.error.main, 0.06) },
          })}
        >
          Tải lại trang
        </Button>
        <Button
          variant="contained" size="large" startIcon={<HomeRoundedIcon />} color="error"
          onClick={() => { window.location.href = "/"; }}
          sx={(theme) => ({
            borderRadius: 6, fontWeight: 700, px: 4, py: 1.2,
            background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
            boxShadow: `0 6px 24px ${alpha(theme.palette.error.main, 0.4)}`,
            "&:hover": {
              background: `linear-gradient(135deg, ${theme.palette.error.dark} 0%, ${theme.palette.error.main} 100%)`,
              boxShadow: `0 8px 32px ${alpha(theme.palette.error.main, 0.55)}`,
            },
          })}
        >
          Về trang chủ
        </Button>
      </Stack>
    </Box>
  );
}
