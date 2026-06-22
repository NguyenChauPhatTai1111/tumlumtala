import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import SearchOffRoundedIcon from "@mui/icons-material/SearchOffRounded";
import WifiOffRoundedIcon from "@mui/icons-material/WifiOffRounded";
import { Box, Button, Paper, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

const TIPS = [
  {
    number: 1,
    icon: <SearchOffRoundedIcon sx={{ fontSize: { xs: 20, md: 28 } }} />,
    title: "Đường dẫn sai",
    short: "Kiểm tra lại URL",
    description:
      "URL có thể bị sai chính tả hoặc đã thay đổi, hãy kiểm tra lại",
  },
  {
    number: 2,
    icon: <WifiOffRoundedIcon sx={{ fontSize: { xs: 20, md: 28 } }} />,
    title: "Trang đã bị xóa",
    short: "Trang đã bị di chuyển",
    description:
      "Nội dung bạn tìm có thể đã được di chuyển hoặc không còn tồn tại",
  },
  {
    number: 3,
    icon: <HomeRoundedIcon sx={{ fontSize: { xs: 20, md: 28 } }} />,
    title: "Về trang chủ",
    short: "Quay về trang chủ",
    description: "Quay về trang chủ để tiếp tục khám phá các tính năng khác",
  },
];

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={(theme) => ({
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: { xs: 2.5, md: 5 },
        py: { xs: 3, md: 6 },
        px: { xs: 2, md: 4 },
        height: "100vh",
        overflow: "hidden",
        position: "relative",
        background: `linear-gradient(-45deg, ${alpha(theme.palette.error.main, 0.18)}, ${theme.palette.background.default}, ${alpha(theme.palette.error.dark, 0.1)}, ${alpha(theme.palette.error.main, 0.08)})`,
        backgroundSize: "400% 400%",
        animation: "nfGradient 10s ease infinite",
        "@keyframes nfGradient": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      })}
    >
      {/* Decorative blobs */}
      <Box
        sx={(theme) => ({
          position: "absolute",
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(theme.palette.error.main, 0.18)} 0%, transparent 70%)`,
          top: -100,
          right: -80,
          pointerEvents: "none",
          animation: "nfBlob1 8s ease-in-out infinite",
          "@keyframes nfBlob1": {
            "0%, 100%": { transform: "translate(0, 0) scale(1)" },
            "33%": { transform: "translate(-40px, 30px) scale(1.1)" },
            "66%": { transform: "translate(20px, -20px) scale(0.95)" },
          },
        })}
      />
      <Box
        sx={(theme) => ({
          position: "absolute",
          width: 240,
          height: 240,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(theme.palette.error.dark, 0.14)} 0%, transparent 70%)`,
          bottom: 0,
          left: -60,
          pointerEvents: "none",
          animation: "nfBlob2 10s ease-in-out infinite",
          "@keyframes nfBlob2": {
            "0%, 100%": { transform: "translate(0, 0) scale(1)" },
            "40%": { transform: "translate(50px, -30px) scale(1.15)" },
            "70%": { transform: "translate(-20px, 20px) scale(0.9)" },
          },
        })}
      />
      <Box
        sx={(theme) => ({
          position: "absolute",
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(theme.palette.error.main, 0.12)} 0%, transparent 70%)`,
          bottom: "30%",
          right: "10%",
          pointerEvents: "none",
          animation: "nfBlob3 12s ease-in-out infinite",
          "@keyframes nfBlob3": {
            "0%, 100%": { transform: "translate(0, 0) scale(1)" },
            "50%": { transform: "translate(-30px, -40px) scale(1.2)" },
          },
        })}
      />

      {/* Hero icon */}
      <Box sx={{ position: "relative", display: "inline-flex" }}>
        <Box
          sx={(theme) => ({
            width: { xs: 64, md: 88 },
            height: { xs: 64, md: 88 },
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 12px 40px ${alpha(theme.palette.error.main, 0.45)}`,
          })}
        >
          <ErrorOutlineRoundedIcon
            sx={{ fontSize: { xs: 32, md: 44 }, color: "error.contrastText" }}
          />
        </Box>
        <Box
          sx={(theme) => ({
            position: "absolute",
            inset: -8,
            borderRadius: "50%",
            border: "2px solid",
            borderColor: alpha(theme.palette.error.main, 0.3),
            animation: "nfPing 2.4s ease-in-out infinite",
            "@keyframes nfPing": {
              "0%": { transform: "scale(1)", opacity: 0.7 },
              "100%": { transform: "scale(1.5)", opacity: 0 },
            },
          })}
        />
      </Box>

      {/* Title */}
      <Box sx={{ textAlign: "center", maxWidth: 440 }}>
        <Typography
          fontWeight={800}
          gutterBottom
          sx={(theme) => ({
            fontSize: { xs: "2.5rem", md: "3rem" },
            letterSpacing: -1,
            background: `linear-gradient(135deg, ${theme.palette.error.main}, ${theme.palette.error.dark})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          })}
        >
          404
        </Typography>
        <Typography
          variant={{ xs: "h6", md: "h5" } as never}
          fontWeight={700}
          gutterBottom
          sx={{ letterSpacing: -0.5 }}
        >
          Trang không tìm thấy
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Đường dẫn bạn truy cập không tồn tại hoặc đã bị xóa
        </Typography>
      </Box>

      {/* Tip cards */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          gap: { xs: 1, md: 2 },
          justifyContent: "center",
          alignItems: "stretch",
          width: "100%",
          maxWidth: 640,
        }}
      >
        {TIPS.map((tip) => (
          <Paper
            key={tip.number}
            elevation={0}
            sx={(theme) => ({
              flex: 1,
              p: { xs: 1.5, md: 2.5 },
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: { xs: 0.75, md: 1.5 },
              borderRadius: 3,
              border: "1px solid",
              borderColor: alpha(theme.palette.error.main, 0.2),
              bgcolor: alpha(theme.palette.background.paper, 0.75),
              backdropFilter: "blur(10px)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: `0 10px 28px ${alpha(theme.palette.error.main, 0.18)}`,
              },
            })}
          >
            <Box
              sx={(theme) => ({
                width: { xs: 28, md: 36 },
                height: { xs: 28, md: 36 },
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: theme.palette.error.contrastText,
                fontWeight: 800,
                fontSize: { xs: 13, md: 16 },
                boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.45)}`,
                flexShrink: 0,
              })}
            >
              {tip.number}
            </Box>
            <Box
              sx={{
                color: "error.main",
                display: "flex",
                alignItems: "center",
              }}
            >
              {tip.icon}
            </Box>
            <Box sx={{ textAlign: "center" }}>
              <Typography
                variant="subtitle2"
                fontWeight={700}
                sx={{ mb: 0.5, fontSize: { xs: "0.7rem", md: "0.875rem" } }}
              >
                {tip.title}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ lineHeight: 1.4, display: "block" }}
              >
                <Box
                  component="span"
                  sx={{ display: { xs: "none", sm: "inline" } }}
                >
                  {tip.description}
                </Box>
                <Box
                  component="span"
                  sx={{ display: { xs: "inline", sm: "none" } }}
                >
                  {tip.short}
                </Box>
              </Typography>
            </Box>
          </Paper>
        ))}
      </Box>

      {/* CTA */}
      <Button
        variant="contained"
        size="large"
        startIcon={<HomeRoundedIcon />}
        onClick={() => navigate("/")}
        sx={(theme) => ({
          borderRadius: 6,
          fontWeight: 700,
          px: 4,
          py: 1.2,
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
    </Box>
  );
};

export default NotFound;
