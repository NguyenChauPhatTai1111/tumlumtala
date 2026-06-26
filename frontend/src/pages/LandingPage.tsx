import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ChatIcon from "@mui/icons-material/Chat";
import DashboardIcon from "@mui/icons-material/Dashboard";
import MovieIcon from "@mui/icons-material/Movie";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import PeopleIcon from "@mui/icons-material/People";
import { Box, Button, Chip, Grid, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "@hooks/user/useCurrentUser";
import {
  hasAnyPermissionForResource,
  isAdminIdentity,
} from "@/utils/permissionAccess";

const PRIMARY_MODULES = [
  {
    label: "Movie",
    eyebrow: "Cinema Deck",
    description: "Không gian phim, trailer và danh sách xem.",
    path: "/movie",
    icon: <MovieIcon />,
    color: "#ff8a3d",
    deepColor: "#7a2f00",
    textColor: "#241407",
    span: 6,
    rotate: "-5deg",
    depth: 70,
    sceneLeft: { xs: "2%", sm: "3%", md: "2%" },
    sceneTop: { xs: "8%", sm: "7%", md: "5%" },
  },
  {
    label: "Music",
    eyebrow: "Sound Lab",
    description: "Playlist, trending tracks và thư viện cá nhân.",
    path: "/music",
    icon: <MusicNoteIcon />,
    color: "#35b7ff",
    deepColor: "#064b78",
    textColor: "#061825",
    span: 3,
    rotate: "3deg",
    depth: 92,
    sceneLeft: { xs: "38%", sm: "41%", md: "45%" },
    sceneTop: { xs: "20%", sm: "18%", md: "15%" },
  },
  {
    label: "Messenger",
    eyebrow: "Realtime Hub",
    description: "Tin nhắn, nhóm chat và mini conversation.",
    path: "/messenger",
    icon: <ChatIcon />,
    color: "#67d889",
    deepColor: "#0d6732",
    textColor: "#071d11",
    span: 3,
    rotate: "4deg",
    depth: 78,
    sceneLeft: { xs: "18%", sm: "22%", md: "27%" },
    sceneTop: { xs: "58%", sm: "57%", md: "56%" },
  },
] as const;

const ADMIN_MODULES = [
  {
    label: "Dashboard",
    description: "Tổng quan vận hành.",
    path: "/dashboard",
    resource: "dashboard",
    icon: <DashboardIcon />,
  },
  {
    label: "Người dùng",
    description: "Tài khoản và quyền.",
    path: "/users",
    resource: "user",
    icon: <PeopleIcon />,
  },
] as const;

export function LandingPage() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const displayName = user?.fullname || user?.email || "bạn";
  const isAdmin = isAdminIdentity(user);
  const visibleAdminModules = ADMIN_MODULES.filter(
    (item) => isAdmin || hasAnyPermissionForResource(user, item.resource),
  );

  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 112px)",
        mx: { xs: -1.5, sm: -2, md: -3 },
        my: { xs: -1.5, sm: -2, md: -3 },
        px: { xs: 1.5, sm: 2, md: 3 },
        py: { xs: 2, md: 3 },
        position: "relative",
        overflow: "hidden",
        perspective: "1500px",
        color: "#eef2ff",
        background:
          "radial-gradient(circle at 16% 8%, rgba(124,58,237,0.34), transparent 30%), radial-gradient(circle at 86% 20%, rgba(6,182,212,0.22), transparent 32%), radial-gradient(circle at 48% 92%, rgba(249,115,22,0.13), transparent 34%), linear-gradient(135deg, #020617 0%, #070b1d 48%, #02030a 100%)",
        "@keyframes stageFloat": {
          "0%, 100%": { transform: "rotateX(62deg) rotateZ(-19deg) translate3d(0, 0, 0)" },
          "50%": { transform: "rotateX(62deg) rotateZ(-19deg) translate3d(0, -14px, 38px)" },
        },
        "@keyframes deckDrift": {
          "0%, 100%": { transform: "rotateY(-25deg) rotateX(13deg) rotateZ(1deg) translate3d(0, 0, 0)" },
          "50%": { transform: "rotateY(-14deg) rotateX(18deg) rotateZ(-2deg) translate3d(0, -12px, 34px)" },
        },
        "@keyframes orbitSpin": {
          "0%": { transform: "rotateX(70deg) rotateZ(0deg)" },
          "100%": { transform: "rotateX(70deg) rotateZ(360deg)" },
        },
        "@keyframes shardFloat": {
          "0%, 100%": { transform: "translate3d(0, 0, 70px) rotateX(58deg) rotateZ(-18deg)" },
          "50%": { transform: "translate3d(18px, -18px, 118px) rotateX(64deg) rotateZ(-8deg)" },
        },
        "@keyframes galaxyDrift": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(-18px, 12px, 0) scale(1.04)" },
        },
        "@keyframes starTwinkle": {
          "0%, 100%": { opacity: 0.44 },
          "50%": { opacity: 0.9 },
        },
        "@keyframes scanLine": {
          "0%": { transform: "translateX(-120%) skewX(-16deg)" },
          "100%": { transform: "translateX(220%) skewX(-16deg)" },
        },
        "@keyframes cardLift": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) rotateX(0deg)" },
          "50%": { transform: "translate3d(0, -10px, 34px) rotateX(4deg)" },
        },
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.72) 0 1px, transparent 1.5px), radial-gradient(circle, rgba(147,197,253,0.42) 0 1px, transparent 1.6px), radial-gradient(circle, rgba(196,181,253,0.34) 0 1px, transparent 1.4px)",
          backgroundSize: "86px 86px, 132px 132px, 48px 48px",
          backgroundPosition: "0 0, 22px 26px, 9px 18px",
          opacity: 0.28,
          maskImage: "linear-gradient(to bottom, black, black 70%, transparent)",
          animation: "galaxyDrift 14s ease-in-out infinite",
        },
        "&::after": {
          content: '""',
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(rgba(148,163,184,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.035) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(circle at center, black, transparent 78%)",
        },
      }}
    >
      <Box sx={{ position: "relative", zIndex: 1, maxWidth: 1260, mx: "auto" }}>
        <Paper
          elevation={0}
          sx={(theme) => ({
            mb: { xs: 2.5, md: 3 },
            p: { xs: 2.25, sm: 3, md: 4 },
            borderRadius: 2,
            border: "1px solid",
            borderColor: alpha("#8b5cf6", 0.34),
            color: "#eef2ff",
            bgcolor: "#050712",
            background:
              "radial-gradient(circle at 18% 10%, rgba(124,58,237,0.28), transparent 28%), radial-gradient(circle at 86% 20%, rgba(6,182,212,0.2), transparent 30%), radial-gradient(circle at 52% 102%, rgba(249,115,22,0.12), transparent 34%), linear-gradient(135deg, #050712 0%, #0b1020 52%, #030712 100%)",
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "0.94fr 1.06fr" },
            gap: { xs: 3, md: 4 },
            overflow: "hidden",
            position: "relative",
            boxShadow: `0 30px 90px ${alpha(theme.palette.common.black, 0.34)}`,
            "&::before": {
              content: '""',
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.86) 0 1px, transparent 1.5px), radial-gradient(circle, rgba(147,197,253,0.66) 0 1px, transparent 1.6px), radial-gradient(circle, rgba(255,255,255,0.42) 0 1px, transparent 1.4px)",
              backgroundSize: "72px 72px, 118px 118px, 44px 44px",
              backgroundPosition: "0 0, 18px 24px, 7px 16px",
              opacity: 0.34,
              animation: "starTwinkle 5s ease-in-out infinite",
            },
            "&::after": {
              content: '""',
              position: "absolute",
              top: 0,
              bottom: 0,
              width: "34%",
              bgcolor: alpha("#22d3ee", 0.08),
              filter: "blur(24px)",
              animation: "scanLine 7s ease-in-out infinite",
              pointerEvents: "none",
            },
          })}
        >
          <Stack spacing={3} justifyContent="space-between" sx={{ position: "relative", zIndex: 1 }}>
            <Stack spacing={2.2}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.4 }}>
                <Box
                  component="img"
                  src="/assets/logo/logo.png"
                  alt="TumLumTala"
                  sx={{
                    width: 50,
                    height: 50,
                    objectFit: "contain",
                    filter: "drop-shadow(0 12px 18px rgba(255,138,61,0.28))",
                  }}
                />
                <Chip
                  label="TumLumTala Launcher"
                  size="small"
                  sx={{
                    borderRadius: 1,
                    fontWeight: 900,
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                  }}
                />
              </Box>

              <Box>
                <Typography
                  component="h1"
                  fontWeight={950}
                  sx={{
                    fontSize: { xs: 36, sm: 48, md: 64 },
                    lineHeight: 0.94,
                    letterSpacing: 0,
                    maxWidth: 690,
                  }}
                >
                  Chọn khu vui chơi hôm nay, {displayName}
                </Typography>
                <Typography
                  sx={{ mt: 2, maxWidth: 560, fontSize: { xs: 14, md: 16 }, lineHeight: 1.65, color: alpha("#e0e7ff", 0.74) }}
                >
                  Movie, Music, Messenger được đặt trong một launcher 3D gọn
                  gàng. Admin tools chỉ xuất hiện khi tài khoản có quyền.
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {PRIMARY_MODULES.map((item) => (
                <Chip
                  key={item.path}
                  icon={item.icon}
                  label={item.label}
                  onClick={() => navigate(item.path)}
                  sx={{
                    borderRadius: 1.2,
                    fontWeight: 900,
                    bgcolor: alpha(item.color, 0.14),
                    color: item.color,
                    border: "1px solid",
                    borderColor: alpha(item.color, 0.36),
                    "& .MuiChip-icon": { color: "inherit" },
                  }}
                />
              ))}
            </Stack>
          </Stack>

          <Box
            sx={{
              minHeight: { xs: 330, md: 420 },
              position: "relative",
              perspective: "1500px",
              transformStyle: "preserve-3d",
              display: "grid",
              placeItems: "center",
            }}
          >
            {[0, 1, 2].map((ring) => (
              <Box
                key={ring}
                sx={{
                  position: "absolute",
                  width: { xs: 240 + ring * 44, sm: 330 + ring * 56, md: 430 + ring * 72 },
                  height: { xs: 150 + ring * 28, sm: 190 + ring * 34, md: 235 + ring * 42 },
                  borderRadius: "50%",
                  border: "1px solid",
                  borderColor: alpha(PRIMARY_MODULES[ring].color, theme.palette.mode === "dark" ? 0.34 : 0.26),
                  transformStyle: "preserve-3d",
                  animation: `orbitSpin ${18 + ring * 7}s linear infinite`,
                  animationDirection: ring === 1 ? "reverse" : "normal",
                  opacity: 0.48 - ring * 0.08,
                })}
              />
            ))}

            {PRIMARY_MODULES.map((item, index) => (
              <Box
                key={`slab-${item.path}`}
                sx={{
                  position: "absolute",
                  right: { xs: `${6 + index * 18}%`, md: `${8 + index * 13}%` },
                  top: { xs: `${16 + index * 17}%`, md: `${10 + index * 18}%` },
                  width: { xs: 28 + index * 6, md: 42 + index * 8 },
                  height: { xs: 28 + index * 6, md: 42 + index * 8 },
                  borderRadius: 1.4,
                  bgcolor: alpha(item.color, 0.46),
                  boxShadow: `0 14px 34px ${alpha(item.deepColor, 0.28)}`,
                  transformStyle: "preserve-3d",
                  animation: `shardFloat ${5.8 + index * 1.2}s ease-in-out infinite`,
                  animationDelay: `${index * 0.4}s`,
                  opacity: 0.7,
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    inset: "72% -7px -8px 10px",
                    borderRadius: 1,
                    bgcolor: alpha(item.deepColor, 0.48),
                    transform: "skewX(-34deg)",
                  },
                }}
              />
            ))}

            <Box
              sx={(theme) => ({
                position: "absolute",
                width: { xs: 250, sm: 340, md: 440 },
                height: { xs: 170, sm: 210, md: 250 },
                borderRadius: 2,
                border: "1px solid",
                borderColor: alpha(theme.palette.primary.main, 0.28),
                background:
                  "radial-gradient(circle at 30% 30%, rgba(125,92,255,0.18), transparent 42%), radial-gradient(circle at 76% 64%, rgba(34,211,238,0.12), transparent 38%)",
                boxShadow: `0 38px 110px ${alpha(theme.palette.common.black, theme.palette.mode === "dark" ? 0.46 : 0.18)}`,
                transformStyle: "preserve-3d",
                animation: "stageFloat 7s ease-in-out infinite",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  inset: 14,
                  borderRadius: 1.5,
                  border: "1px dashed",
                  borderColor: alpha("#93c5fd", 0.18),
                },
                "&::after": {
                  content: '""',
                  position: "absolute",
                  left: 34,
                  right: 34,
                  bottom: -28,
                  height: 42,
                  borderRadius: "50%",
                  bgcolor: alpha(theme.palette.common.black, theme.palette.mode === "dark" ? 0.38 : 0.18),
                  filter: "blur(18px)",
                },
              })}
            />

            <Box
              sx={{
                width: { xs: 315, sm: 470, md: 660 },
                height: { xs: 360, sm: 430, md: 440 },
                position: "relative",
                transformStyle: "preserve-3d",
                animation: "deckDrift 9s ease-in-out infinite",
              }}
            >
              {PRIMARY_MODULES.map((item, index) => (
                <Box
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  sx={(theme) => ({
                    position: "absolute",
                    left: item.sceneLeft,
                    top: item.sceneTop,
                    width: { xs: index === 1 ? 176 : 188, sm: index === 1 ? 222 : 242, md: index === 1 ? 260 : 288 },
                    height: { xs: 126, sm: 142, md: 158 },
                    p: 2,
                    cursor: "pointer",
                    borderRadius: 2,
                    color: item.textColor,
                    bgcolor: item.color,
                    border: "1px solid",
                    borderColor: alpha("#fff", 0.34),
                    boxShadow: `0 ${26 + index * 7}px 64px ${alpha(item.deepColor, 0.42)}`,
                    transform: `translate3d(0, 0, ${item.depth}px) rotateZ(${item.rotate})`,
                    transformStyle: "preserve-3d",
                    animation: `cardLift ${5.4 + index * 0.8}s ease-in-out infinite`,
                    transition: "transform 0.22s ease, box-shadow 0.22s ease",
                    overflow: "visible",
                    zIndex: index === 1 ? 3 : index === 2 ? 2 : 1,
                    "&:hover": {
                      transform: `translate3d(0, -14px, ${item.depth + 58}px) rotateZ(${item.rotate}) rotateX(8deg) rotateY(-5deg)`,
                      boxShadow: `0 ${34 + index * 8}px 82px ${alpha(item.deepColor, 0.54)}`,
                    },
                    [theme.breakpoints.down("sm")]: {
                      zIndex: index + 1,
                    },
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      inset: 0,
                      borderRadius: 2,
                      background: `radial-gradient(circle at 24% 18%, ${alpha("#c4b5fd", 0.12)}, transparent 28%), radial-gradient(circle at 84% 76%, ${alpha(item.deepColor, 0.24)}, transparent 38%)`,
                      pointerEvents: "none",
                    },
                    "&::after": {
                      content: '""',
                      position: "absolute",
                      left: 14,
                      right: -16,
                      bottom: -22,
                      height: 28,
                      borderRadius: "0 0 16px 16px",
                      bgcolor: alpha(item.deepColor, 0.62),
                      transform: "skewX(-37deg) translateZ(-30px)",
                      transformOrigin: "top",
                      filter: "brightness(0.82)",
                    },
                  })}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      top: 13,
                      right: -18,
                      bottom: -13,
                      width: 26,
                      borderRadius: "0 16px 16px 0",
                      bgcolor: alpha(item.deepColor, 0.52),
                      transform: "skewY(-42deg) translateZ(-24px)",
                      transformOrigin: "left",
                      pointerEvents: "none",
                    }}
                  />
                  <Box
                    sx={(theme) => ({
                      position: "absolute",
                      left: 18,
                      right: 18,
                      bottom: -42,
                      height: 34,
                      borderRadius: "50%",
                      bgcolor: alpha(theme.palette.common.black, theme.palette.mode === "dark" ? 0.34 : 0.2),
                      filter: "blur(16px)",
                      transform: "translateZ(-80px)",
                      pointerEvents: "none",
                    })}
                  />
                  <Stack sx={{ height: "100%", position: "relative", zIndex: 1 }} justifyContent="space-between">
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" fontWeight={900} sx={{ color: alpha(item.textColor, 0.72) }}>
                        {item.eyebrow}
                      </Typography>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 1.3,
                          bgcolor: alpha("#020617", 0.16),
                          border: "1px solid",
                          borderColor: alpha("#fff", 0.18),
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        {item.icon}
                      </Box>
                    </Stack>
                    <Box>
                      <Typography fontWeight={950} sx={{ fontSize: { xs: 28, md: 34 }, lineHeight: 0.95 }}>
                        {item.label}
                      </Typography>
                      <Typography variant="caption" sx={{ display: "block", mt: 0.8, color: alpha(item.textColor, 0.74) }}>
                        {item.description}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              ))}
            </Box>
          </Box>
        </Paper>

        <Grid container spacing={2.5}>
          {PRIMARY_MODULES.map((item) => (
            <Grid item xs={12} md={item.span} key={item.path}>
              <Paper
                elevation={0}
                onClick={() => navigate(item.path)}
                sx={(theme) => ({
                  minHeight: { xs: 210, md: 285 },
                  p: { xs: 2.4, md: 3 },
                  borderRadius: 2,
                  color: "#eef2ff",
                  cursor: "pointer",
                  position: "relative",
                  overflow: "visible",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  bgcolor: "#050712",
                  background: `radial-gradient(circle at 18% 12%, ${alpha(item.color, 0.32)}, transparent 34%), radial-gradient(circle at 86% 88%, ${alpha(item.deepColor, 0.38)}, transparent 42%), linear-gradient(135deg, rgba(8,13,32,0.96), rgba(3,7,18,0.98))`,
                  border: "1px solid",
                  borderColor: alpha(item.color, 0.36),
                  boxShadow: `0 22px 58px ${alpha(item.deepColor, 0.3)}`,
                  transformStyle: "preserve-3d",
                  transition: "transform 0.22s ease, box-shadow 0.22s ease",
                  "&:hover": {
                    transform: "perspective(1000px) rotateX(7deg) rotateY(-4deg) translateY(-10px) translateZ(22px)",
                    boxShadow: `0 34px 86px ${alpha(item.deepColor, 0.38)}`,
                  },
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    inset: 0,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${alpha(item.color, 0.08)}, transparent 44%, ${alpha("#8b5cf6", 0.08)})`,
                  },
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    left: 18,
                    right: -18,
                    bottom: -22,
                    height: 28,
                    borderRadius: "0 0 16px 16px",
                    bgcolor: alpha(item.deepColor, 0.5),
                    transform: "skewX(-38deg) translateZ(-28px)",
                    pointerEvents: "none",
                  },
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    top: 18,
                    right: -18,
                    bottom: -12,
                    width: 26,
                    borderRadius: "0 16px 16px 0",
                    bgcolor: alpha(item.deepColor, 0.5),
                    transform: "skewY(-42deg) translateZ(-20px)",
                    pointerEvents: "none",
                  }}
                />
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ position: "relative", zIndex: 1 }}>
                  <Chip
                    label={item.eyebrow}
                    size="small"
                    sx={{
                      borderRadius: 1,
                      bgcolor: alpha(item.color, 0.12),
                      color: "#eef2ff",
                      border: "1px solid",
                      borderColor: alpha(item.color, 0.28),
                      fontWeight: 900,
                    }}
                  />
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      borderRadius: 1.5,
                      bgcolor: alpha(item.color, 0.14),
                      border: "1px solid",
                      borderColor: alpha(item.color, 0.28),
                      color: item.color,
                      display: "grid",
                      placeItems: "center",
                      "& svg": { fontSize: 30 },
                    }}
                  >
                    {item.icon}
                  </Box>
                </Stack>

                <Box sx={{ position: "relative", zIndex: 1, maxWidth: item.span === 6 ? 440 : 280 }}>
                  <Typography
                    fontWeight={950}
                    sx={{
                      fontSize: item.span === 6 ? { xs: 42, md: 62 } : { xs: 34, md: 42 },
                      lineHeight: 0.92,
                    }}
                  >
                    {item.label}
                  </Typography>
                  <Typography sx={{ mt: 1.4, color: alpha("#e0e7ff", 0.72), lineHeight: 1.55 }}>
                    {item.description}
                  </Typography>
                  <Button
                    endIcon={<ArrowForwardRoundedIcon />}
                    sx={{
                      mt: 2,
                      px: 0,
                      color: item.color,
                      fontWeight: 900,
                      "&:hover": { bgcolor: "transparent", transform: "translateX(4px)" },
                    }}
                  >
                    Mở {item.label}
                  </Button>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {visibleAdminModules.length > 0 && (
          <Paper
            elevation={0}
            sx={{
              mt: 2.5,
              p: { xs: 2, md: 2.5 },
              borderRadius: 2,
              border: "1px solid",
              borderColor: alpha("#8b5cf6", 0.26),
              color: "#eef2ff",
              bgcolor: alpha("#050712", 0.94),
              background:
                "radial-gradient(circle at 92% 0%, rgba(34,211,238,0.1), transparent 32%), linear-gradient(135deg, rgba(8,13,32,0.95), rgba(3,7,18,0.95))",
            }}
          >
            <Stack
              direction={{ xs: "column", md: "row" }}
              alignItems={{ xs: "stretch", md: "center" }}
              justifyContent="space-between"
              spacing={2}
            >
              <Box>
                <Typography fontWeight={950}>Khu quản trị</Typography>
                <Typography variant="body2" sx={{ color: alpha("#e0e7ff", 0.72) }}>
                  Các thao tác vận hành chỉ hiện khi bạn có quyền.
                </Typography>
              </Box>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                {visibleAdminModules.map((item) => (
                  <Button
                    key={item.path}
                    variant="outlined"
                    startIcon={item.icon}
                    endIcon={<ArrowForwardRoundedIcon />}
                    onClick={() => navigate(item.path)}
                    sx={{
                      justifyContent: "space-between",
                      minWidth: { xs: "100%", sm: 190 },
                      borderRadius: 1.5,
                      fontWeight: 900,
                      color: "#eef2ff",
                      borderColor: alpha("#8b5cf6", 0.42),
                      bgcolor: alpha("#8b5cf6", 0.08),
                      "&:hover": {
                        borderColor: alpha("#22d3ee", 0.58),
                        bgcolor: alpha("#22d3ee", 0.1),
                      },
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </Stack>
            </Stack>
          </Paper>
        )}
      </Box>
    </Box>
  );
}
