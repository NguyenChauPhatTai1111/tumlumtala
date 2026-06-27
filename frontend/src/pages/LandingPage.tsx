import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ChatIcon from "@mui/icons-material/Chat";
import DashboardIcon from "@mui/icons-material/Dashboard";
import MovieIcon from "@mui/icons-material/Movie";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import PeopleIcon from "@mui/icons-material/People";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import { Box, Button, Chip, Grid, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "@hooks/user/useCurrentUser";
import { hasAnyPermissionForResource, isAdminIdentity } from "@/utils/permissionAccess";

const PRIMARY_MODULES = [
    {
        label: "Music",
        eyebrow: "Sound Lab",
        description: "Nghe nhạc theo sở thích, tìm kiếm được hay không là do nhân phẩm của bạn!!!",
        path: "/music",
        icon: <MusicNoteIcon />,
        color: "#3b82f6",
        span: 6,
    },
    {
        label: "Movie",
        eyebrow: "Cinema Deck",
        description: "Xem phim không giới hạn. Thỏa mãn mọi đam mê.",
        path: "/movie",
        icon: <MovieIcon />,
        color: "#f97316",
        span: 3,
    },
    {
        label: "Messenger",
        eyebrow: "Realtime Hub",
        description: "Nhắn tin cùng mọi người, kết nối cộng đồng vide code.",
        path: "/messenger",
        icon: <ChatIcon />,
        color: "#22c55e",
        span: 3,
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

const BG_PARTICLES = [
    { x: 8, y: 12, s: 3, o: 0.08 },
    { x: 18, y: 68, s: 5, o: 0.06 },
    { x: 28, y: 34, s: 4, o: 0.07 },
    { x: 38, y: 82, s: 3, o: 0.05 },
    { x: 52, y: 22, s: 6, o: 0.09 },
    { x: 64, y: 55, s: 4, o: 0.06 },
    { x: 74, y: 18, s: 3, o: 0.07 },
    { x: 84, y: 72, s: 5, o: 0.05 },
    { x: 92, y: 38, s: 4, o: 0.08 },
] as const;

const ORBIT_RINGS = [
    { w: 420, h: 140, dur: 28, rev: false },
    { w: 300, h: 100, dur: 20, rev: true },
    { w: 190, h: 64, dur: 14, rev: false },
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
            sx={(theme) => ({
                minHeight: "calc(100vh - 112px)",
                mx: { xs: -1.5, sm: -2, md: -3 },
                my: { xs: -1.5, sm: -2, md: -3 },
                px: { xs: 1.5, sm: 2, md: 3 },
                py: { xs: 2, md: 3 },
                position: "relative",
                overflow: "hidden",
                background:
                    theme.palette.mode === "dark"
                        ? `linear-gradient(160deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${theme.palette.background.default} 40%, ${alpha(theme.palette.info.main, 0.06)} 100%)`
                        : `linear-gradient(160deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${theme.palette.background.default} 50%, ${alpha(theme.palette.success.main, 0.04)} 100%)`,

                "@keyframes orbitSpin": {
                    "0%": { transform: "rotateX(70deg) rotateZ(0deg)" },
                    "100%": { transform: "rotateX(70deg) rotateZ(360deg)" },
                },
                "@keyframes floatBlob": {
                    "0%,100%": { transform: "translateY(0) scale(1)" },
                    "50%": { transform: "translateY(-18px) scale(1.04)" },
                },
                "@keyframes scanLine": {
                    "0%": { transform: "translateX(-120%) skewX(-16deg)", opacity: 0 },
                    "5%": { opacity: 1 },
                    "90%": { opacity: 1 },
                    "100%": { transform: "translateX(220%) skewX(-16deg)", opacity: 0 },
                },
                "@keyframes pulseDot": {
                    "0%,100%": { transform: "scale(1)", opacity: 0.9 },
                    "50%": { transform: "scale(1.4)", opacity: 0.5 },
                },
                "@keyframes pingRing": {
                    "0%": { transform: "scale(1)", opacity: 0.5 },
                    "100%": { transform: "scale(2)", opacity: 0 },
                },
                "@keyframes borderSpin": {
                    "0%": { transform: "rotate(0deg)" },
                    "100%": { transform: "rotate(360deg)" },
                },
                "@keyframes cardFloat": {
                    "0%,100%": { transform: "translateY(0px) rotateX(0deg)" },
                    "50%": { transform: "translateY(-6px) rotateX(1.5deg)" },
                },
            })}
        >
            {/* Decorative background blobs */}
            <Box
                sx={(theme) => ({
                    position: "absolute",
                    width: 600,
                    height: 600,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.14)} 0%, transparent 68%)`,
                    top: -160,
                    right: -120,
                    pointerEvents: "none",
                    animation: "floatBlob 14s ease-in-out infinite",
                })}
            />
            <Box
                sx={(theme) => ({
                    position: "absolute",
                    width: 400,
                    height: 400,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${alpha(theme.palette.info.main, 0.1)} 0%, transparent 68%)`,
                    bottom: 60,
                    left: -80,
                    pointerEvents: "none",
                    animation: "floatBlob 18s ease-in-out infinite 3s",
                })}
            />
            <Box
                sx={(theme) => ({
                    position: "absolute",
                    width: 280,
                    height: 280,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${alpha(theme.palette.success.main, 0.09)} 0%, transparent 68%)`,
                    top: "40%",
                    left: "40%",
                    pointerEvents: "none",
                    animation: "floatBlob 22s ease-in-out infinite 6s",
                })}
            />

            {/* Micro particles */}
            {BG_PARTICLES.map((p, i) => (
                <Box
                    key={i}
                    sx={(theme) => ({
                        position: "absolute",
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: p.s,
                        height: p.s,
                        borderRadius: "50%",
                        bgcolor: theme.palette.primary.main,
                        opacity: p.o,
                        pointerEvents: "none",
                    })}
                />
            ))}

            {/* Page content */}
            <Box sx={{ position: "relative", zIndex: 1, maxWidth: 1280, mx: "auto" }}>
                {/* HERO PANEL */}
                <Paper
                    elevation={0}
                    sx={(theme) => ({
                        mb: { xs: 2.5, md: 3 },
                        borderRadius: 3,
                        overflow: "hidden",
                        position: "relative",
                        border: "1px solid",
                        borderColor: alpha(theme.palette.primary.main, 0.18),
                        bgcolor: theme.palette.background.paper,
                        boxShadow: `0 24px 80px ${alpha(theme.palette.primary.main, 0.08)}, inset 0 1px 0 ${alpha("#fff", 0.06)}`,
                        // scan shimmer
                        "&::after": {
                            content: '""',
                            position: "absolute",
                            top: 0,
                            bottom: 0,
                            width: "26%",
                            background: `linear-gradient(90deg, transparent, ${alpha(theme.palette.primary.main, 0.05)}, transparent)`,
                            animation: "scanLine 10s ease-in-out infinite 1.5s",
                            pointerEvents: "none",
                        },
                    })}
                >
                    {/* Hero inner gradient overlay */}
                    <Box
                        sx={(theme) => ({
                            position: "absolute",
                            inset: 0,
                            pointerEvents: "none",
                            background:
                                theme.palette.mode === "dark"
                                    ? `radial-gradient(ellipse 55% 70% at 78% 50%, ${alpha(theme.palette.primary.main, 0.12)} 0%, transparent 60%), radial-gradient(ellipse 35% 45% at 88% 18%, ${alpha(theme.palette.info.main, 0.1)} 0%, transparent 55%)`
                                    : `radial-gradient(ellipse 55% 70% at 78% 50%, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 60%), radial-gradient(ellipse 35% 45% at 88% 18%, ${alpha(theme.palette.info.main, 0.06)} 0%, transparent 55%)`,
                        })}
                    />

                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
                            minHeight: { xs: "auto", lg: 460 },
                        }}
                    >
                        {/* Left: text */}
                        <Stack
                            justifyContent="space-between"
                            sx={{ p: { xs: 3, sm: 4, md: 5 }, position: "relative", zIndex: 1 }}
                        >
                            <Stack spacing={3}>
                                {/* Logo + badge */}
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                    <Box
                                        component="img"
                                        src="/assets/logo/logo.png"
                                        alt="TumLumTala"
                                        sx={(theme) => ({
                                            width: 46,
                                            height: 46,
                                            objectFit: "contain",
                                            filter: `drop-shadow(0 0 10px ${alpha(theme.palette.primary.main, 0.5)})`,
                                        })}
                                    />
                                    <Chip
                                        icon={
                                            <RocketLaunchIcon
                                                sx={{ fontSize: "13px !important" }}
                                            />
                                        }
                                        label="TumLumTala · Universal"
                                        size="small"
                                        sx={(theme) => ({
                                            borderRadius: 6,
                                            fontWeight: 700,
                                            fontSize: 11,
                                            letterSpacing: 0.4,
                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                            color: theme.palette.primary.main,
                                            border: "1px solid",
                                            borderColor: alpha(theme.palette.primary.main, 0.28),
                                            "& .MuiChip-icon": { color: "inherit" },
                                        })}
                                    />
                                </Stack>

                                {/* Headline */}
                                <Box>
                                    <Typography
                                        component="p"
                                        sx={(theme) => ({
                                            fontSize: 11,
                                            fontWeight: 700,
                                            letterSpacing: 3.5,
                                            textTransform: "uppercase",
                                            color: alpha(theme.palette.text.secondary, 0.7),
                                            mb: 1.2,
                                        })}
                                    >
                                        Welcome back
                                    </Typography>
                                    <Typography
                                        component="h1"
                                        fontWeight={950}
                                        sx={{
                                            fontSize: { xs: 34, sm: 48, md: 62 },
                                            lineHeight: 0.94,
                                            letterSpacing: -1.5,
                                            color: "text.primary",
                                        }}
                                    >
                                        Chọn khu vui
                                        <br />
                                        chơi hôm nay
                                    </Typography>
                                    <Typography
                                        fontWeight={800}
                                        sx={(theme) => ({
                                            mt: 1.5,
                                            fontSize: { xs: 22, sm: 30, md: 38 },
                                            lineHeight: 1,
                                            color: theme.palette.primary.main,
                                        })}
                                    >
                                        {displayName} ✦
                                    </Typography>
                                </Box>

                                <Typography
                                    variant="body2"
                                    sx={(theme) => ({
                                        color: theme.palette.text.secondary,
                                        lineHeight: 1.72,
                                        maxWidth: 380,
                                    })}
                                >
                                    Khám phá dải ngân hà giải trí — từ Cinema đến Sound Lab và
                                    Realtime Hub, tất cả trong một vũ trụ.
                                </Typography>
                            </Stack>

                            {/* Module shortcut chips */}
                            <Stack
                                direction="row"
                                spacing={1}
                                flexWrap="wrap"
                                useFlexGap
                                sx={{ mt: 4 }}
                            >
                                {PRIMARY_MODULES.map((item) => (
                                    <Chip
                                        key={item.path}
                                        icon={item.icon}
                                        label={item.label}
                                        onClick={() => navigate(item.path)}
                                        sx={{
                                            borderRadius: 6,
                                            fontWeight: 800,
                                            fontSize: 12,
                                            bgcolor: alpha(item.color, 0.1),
                                            color: item.color,
                                            border: "1px solid",
                                            borderColor: alpha(item.color, 0.28),
                                            transition: "all 0.2s",
                                            "& .MuiChip-icon": { color: "inherit" },
                                            "&:hover": {
                                                bgcolor: alpha(item.color, 0.2),
                                                borderColor: item.color,
                                                transform: "translateY(-2px)",
                                                boxShadow: `0 8px 20px ${alpha(item.color, 0.24)}`,
                                            },
                                        }}
                                    />
                                ))}
                            </Stack>
                        </Stack>

                        {/* Right: orbit visualization */}
                        <Box
                            sx={(theme) => ({
                                display: { xs: "none", lg: "flex" },
                                alignItems: "center",
                                justifyContent: "center",
                                position: "relative",
                                minHeight: 460,
                                perspective: "1200px",
                                background:
                                    theme.palette.mode === "dark"
                                        ? `radial-gradient(ellipse 80% 80% at 50% 50%, ${alpha(theme.palette.primary.main, 0.08)}, transparent 70%)`
                                        : `radial-gradient(ellipse 80% 80% at 50% 50%, ${alpha(theme.palette.primary.main, 0.05)}, transparent 70%)`,
                            })}
                        >
                            {/* Glow core */}
                            <Box
                                sx={(theme) => ({
                                    position: "absolute",
                                    width: 280,
                                    height: 280,
                                    borderRadius: "50%",
                                    background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.16)} 0%, ${alpha(theme.palette.info.main, 0.1)} 40%, transparent 70%)`,
                                    filter: "blur(28px)",
                                    animation: "floatBlob 12s ease-in-out infinite",
                                })}
                            />

                            {/* Orbit rings */}
                            {ORBIT_RINGS.map((ring, i) => (
                                <Box
                                    key={i}
                                    sx={(theme) => ({
                                        position: "absolute",
                                        width: ring.w,
                                        height: ring.h,
                                        borderRadius: "50%",
                                        border: "1px solid",
                                        borderColor: alpha(theme.palette.primary.main, 0.2),
                                        boxShadow: `inset 0 0 12px ${alpha(theme.palette.primary.main, 0.06)}`,
                                        transformStyle: "preserve-3d",
                                        animation: `orbitSpin ${ring.dur}s linear infinite ${ring.rev ? "reverse" : ""}`,
                                    })}
                                />
                            ))}

                            {/* Center star */}
                            <Box
                                sx={(theme) => ({
                                    position: "absolute",
                                    width: 14,
                                    height: 14,
                                    borderRadius: "50%",
                                    bgcolor: theme.palette.primary.main,
                                    boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.18)}, 0 0 24px ${alpha(theme.palette.primary.main, 0.5)}`,
                                    animation: "pulseDot 2.4s ease-in-out infinite",
                                    zIndex: 2,
                                })}
                            />
                            {/* Ping ring around center */}
                            <Box
                                sx={(theme) => ({
                                    position: "absolute",
                                    width: 14,
                                    height: 14,
                                    borderRadius: "50%",
                                    border: "2px solid",
                                    borderColor: alpha(theme.palette.primary.main, 0.4),
                                    animation: "pingRing 2.4s ease-out infinite",
                                    zIndex: 1,
                                })}
                            />

                            {/* Module satellites */}
                            {(
                                [
                                    { item: PRIMARY_MODULES[0], tx: 156, ty: -10 },
                                    { item: PRIMARY_MODULES[1], tx: -118, ty: 44 },
                                    { item: PRIMARY_MODULES[2], tx: 54, ty: 54 },
                                ] as const
                            ).map(({ item, tx, ty }) => (
                                <Box
                                    key={item.path}
                                    onClick={() => navigate(item.path)}
                                    sx={{
                                        position: "absolute",
                                        width: 64,
                                        height: 64,
                                        borderRadius: "50%",
                                        bgcolor: alpha(item.color, 0.14),
                                        border: "2px solid",
                                        borderColor: alpha(item.color, 0.5),
                                        color: item.color,
                                        display: "grid",
                                        placeItems: "center",
                                        boxShadow: `0 0 24px ${alpha(item.color, 0.38)}, 0 0 48px ${alpha(item.color, 0.14)}`,
                                        transform: `translate(${tx}px, ${ty}px)`,
                                        "& svg": { fontSize: 30 },
                                        zIndex: 3,
                                        backdropFilter: "blur(6px)",
                                        cursor: "pointer",
                                        transition: "transform 0.18s, box-shadow 0.18s",
                                        "&:hover": {
                                            bgcolor: alpha(item.color, 0.26),
                                            boxShadow: `0 0 36px ${alpha(item.color, 0.6)}, 0 0 64px ${alpha(item.color, 0.22)}`,
                                            transform: `translate(${tx}px, ${ty}px) scale(1.15)`,
                                        },
                                    }}
                                >
                                    {item.icon}
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </Paper>

                {/* MODULE CARDS */}
                <Grid container spacing={2.5}>
                    {PRIMARY_MODULES.map((item) => (
                        <Grid item xs={12} md={item.span} key={item.path}>
                            {/* Wrapper provides perspective for 3D child */}
                            <Box
                                sx={{
                                    perspective: "900px",
                                    perspectiveOrigin: "50% 50%",
                                    height: "100%",
                                }}
                            >
                                {/* 3D + float wrapper */}
                                <Box
                                    sx={{
                                        position: "relative",
                                        borderRadius: "20px",
                                        animation: "cardFloat 6s ease-in-out infinite",
                                        transformStyle: "preserve-3d",
                                        transition: "transform 0.18s ease, box-shadow 0.18s ease",
                                        boxShadow: `0 8px 32px ${alpha(item.color, 0.1)}`,
                                        "&:hover": {
                                            transform:
                                                "rotateX(10deg) rotateY(-6deg) translateZ(24px) translateY(-6px)",
                                            boxShadow: `0 32px 72px ${alpha(item.color, 0.24)}, 0 0 48px ${alpha(item.color, 0.12)}`,
                                            animationPlayState: "paused",
                                        },
                                    }}
                                >
                                    <Paper
                                        elevation={0}
                                        onClick={() => navigate(item.path)}
                                        sx={(theme) => ({
                                            minHeight: { xs: 200, md: 280 },
                                            p: { xs: 2.5, md: 3 },
                                            borderRadius: "20px",
                                            cursor: "pointer",
                                            position: "relative",
                                            overflow: "hidden",
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "space-between",
                                            bgcolor: theme.palette.background.paper,
                                            border: "1.5px solid",
                                            borderColor: alpha(item.color, 0.15),
                                            // spinning border: oversized conic rotates inside overflow:hidden
                                            "&::before": {
                                                content: '""',
                                                position: "absolute",
                                                // square big enough to cover all 4 sides when rotating
                                                width: "250%",
                                                height: "250%",
                                                top: "-75%",
                                                left: "-75%",
                                                background: `conic-gradient(from 0deg, transparent 0deg, transparent 78deg, ${item.color} 90deg, transparent 102deg, transparent 258deg, ${alpha(item.color, 0.5)} 270deg, transparent 282deg, transparent 360deg)`,
                                                animation: "borderSpin 3s linear infinite",
                                                zIndex: 0,
                                                pointerEvents: "none",
                                            },
                                            // white fill over the conic, leaving only 1.5px at the very edge
                                            "&::after": {
                                                content: '""',
                                                position: "absolute",
                                                inset: "1.5px",
                                                borderRadius: "18.5px",
                                                background: theme.palette.background.paper,
                                                zIndex: 1,
                                                pointerEvents: "none",
                                            },
                                        })}
                                    >
                                        <Stack
                                            direction="row"
                                            alignItems="center"
                                            justifyContent="space-between"
                                            sx={{ position: "relative", zIndex: 2 }}
                                        >
                                            <Chip
                                                label={item.eyebrow}
                                                size="small"
                                                sx={(theme) => ({
                                                    borderRadius: 5,
                                                    bgcolor: alpha(item.color, 0.08),
                                                    color: theme.palette.text.secondary,
                                                    border: "1px solid",
                                                    borderColor: alpha(item.color, 0.2),
                                                    fontWeight: 700,
                                                    fontSize: 11,
                                                })}
                                            />
                                            <Box
                                                sx={{
                                                    width: 44,
                                                    height: 44,
                                                    borderRadius: "50%",
                                                    bgcolor: alpha(item.color, 0.1),
                                                    border: "1.5px solid",
                                                    borderColor: alpha(item.color, 0.28),
                                                    color: item.color,
                                                    display: "grid",
                                                    placeItems: "center",
                                                    boxShadow: `0 0 16px ${alpha(item.color, 0.2)}`,
                                                    "& svg": { fontSize: 22 },
                                                }}
                                            >
                                                {item.icon}
                                            </Box>
                                        </Stack>

                                        <Box sx={{ position: "relative", zIndex: 2 }}>
                                            <Typography
                                                fontWeight={950}
                                                sx={{
                                                    fontSize:
                                                        item.span === 6
                                                            ? { xs: 40, md: 62 }
                                                            : { xs: 30, md: 42 },
                                                    lineHeight: 0.92,
                                                    letterSpacing: -1.5,
                                                    color: "text.primary",
                                                }}
                                            >
                                                {item.label}
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={(theme) => ({
                                                    mt: 1.2,
                                                    color: theme.palette.text.secondary,
                                                    lineHeight: 1.6,
                                                })}
                                            >
                                                {item.description}
                                            </Typography>
                                            <Button
                                                endIcon={<ArrowForwardRoundedIcon />}
                                                sx={{
                                                    mt: 2,
                                                    px: 0,
                                                    color: item.color,
                                                    fontWeight: 900,
                                                    fontSize: 13,
                                                    transition: "transform 0.18s",
                                                    "&:hover": {
                                                        bgcolor: "transparent",
                                                        transform: "translateX(6px)",
                                                    },
                                                }}
                                            >
                                                Mở {item.label}
                                            </Button>
                                        </Box>
                                    </Paper>
                                </Box>
                                {/* /3D float wrapper */}
                            </Box>
                            {/* /perspective wrapper */}
                        </Grid>
                    ))}
                </Grid>

                {/* ADMIN STRIP */}
                {visibleAdminModules.length > 0 && (
                    <Paper
                        elevation={0}
                        sx={(theme) => ({
                            mt: 2.5,
                            p: { xs: 2, md: 2.5 },
                            borderRadius: 2.5,
                            border: "1px solid",
                            borderColor: theme.palette.divider,
                            bgcolor: alpha(theme.palette.background.paper, 0.8),
                            backdropFilter: "blur(10px)",
                        })}
                    >
                        <Stack
                            direction={{ xs: "column", md: "row" }}
                            alignItems={{ xs: "stretch", md: "center" }}
                            justifyContent="space-between"
                            spacing={2}
                        >
                            <Box>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <Box
                                        sx={(theme) => ({
                                            width: 7,
                                            height: 7,
                                            borderRadius: "50%",
                                            bgcolor: theme.palette.success.main,
                                            boxShadow: `0 0 8px ${theme.palette.success.main}`,
                                            animation: "pulseDot 2s ease-in-out infinite",
                                        })}
                                    />
                                    <Typography fontWeight={800} fontSize={14}>
                                        Khu quản trị
                                    </Typography>
                                </Stack>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: "block", mt: 0.4 }}
                                >
                                    Các thao tác vận hành — chỉ hiện khi bạn có quyền.
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
                                        sx={(theme) => ({
                                            justifyContent: "space-between",
                                            minWidth: { xs: "100%", sm: 180 },
                                            borderRadius: 6,
                                            fontWeight: 800,
                                            fontSize: 13,
                                            borderColor: alpha(theme.palette.primary.main, 0.3),
                                            bgcolor: alpha(theme.palette.primary.main, 0.05),
                                            transition: "all 0.2s",
                                            "&:hover": {
                                                borderColor: theme.palette.primary.main,
                                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                transform: "translateY(-2px)",
                                                boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.16)}`,
                                            },
                                        })}
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
