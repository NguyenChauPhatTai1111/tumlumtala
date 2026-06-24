import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { Box, Grid, Paper, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useEffect, useState } from "react";
import { listUsers } from "@api/userApi";

interface StatCard {
    label: string;
    value: number | null;
    icon: React.ReactNode;
    color: string;
    gradient: string;
}

export const DashboardPage = () => {
    const [totalUsers, setTotalUsers] = useState<number | null>(null);

    useEffect(() => {
        listUsers(1, 0)
            .then((res) => setTotalUsers(res.total))
            .catch(() => setTotalUsers(0));
    }, []);

    const stats: StatCard[] = [
        {
            label: "Tổng người dùng",
            value: totalUsers,
            icon: <PeopleOutlinedIcon sx={{ fontSize: 28 }} />,
            color: "#1976d2",
            gradient: "linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)",
        },
        {
            label: "Hoạt động hôm nay",
            value: null,
            icon: <TrendingUpIcon sx={{ fontSize: 28 }} />,
            color: "#9c27b0",
            gradient: "linear-gradient(135deg, #9c27b0 0%, #ce93d8 100%)",
        },
        {
            label: "Vai trò phân quyền",
            value: 3,
            icon: <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 28 }} />,
            color: "#2e7d32",
            gradient: "linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%)",
        },
        {
            label: "Services hoạt động",
            value: 4,
            icon: <BarChartOutlinedIcon sx={{ fontSize: 28 }} />,
            color: "#ed6c02",
            gradient: "linear-gradient(135deg, #ed6c02 0%, #ffb74d 100%)",
        },
    ];

    return (
        <Box>
            {/* Page heading */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight={700} gutterBottom>
                    Dashboard
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Tổng quan hệ thống TumLumTala
                </Typography>
            </Box>

            {/* Stats cards */}
            <Grid container spacing={3}>
                {stats.map((stat) => (
                    <Grid item xs={12} sm={6} md={3} key={stat.label}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 3,
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                border: "1px solid",
                                borderColor: "divider",
                                borderRadius: 3,
                                position: "relative",
                                overflow: "hidden",
                                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                                "&:hover": {
                                    transform: "translateY(-2px)",
                                    boxShadow: `0 8px 24px ${alpha(stat.color, 0.15)}`,
                                },
                                "&::after": {
                                    content: '""',
                                    position: "absolute",
                                    top: 0,
                                    right: 0,
                                    width: 80,
                                    height: 80,
                                    borderRadius: "50%",
                                    background: alpha(stat.color, 0.06),
                                    transform: "translate(20px, -20px)",
                                },
                            }}
                        >
                            <Box
                                sx={{
                                    width: 52,
                                    height: 52,
                                    borderRadius: 3,
                                    background: stat.gradient,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#fff",
                                    flexShrink: 0,
                                    boxShadow: `0 4px 14px ${alpha(stat.color, 0.35)}`,
                                }}
                            >
                                {stat.icon}
                            </Box>
                            <Box>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    {stat.label}
                                </Typography>
                                <Typography variant="h5" fontWeight={700}>
                                    {stat.value === null ? "—" : stat.value}
                                </Typography>
                            </Box>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* Welcome banner */}
            <Paper
                elevation={0}
                sx={(theme) => ({
                    mt: 3,
                    p: { xs: 3, md: 4 },
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 3,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.secondary.main, 0.04)} 100%)`,
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    flexDirection: { xs: "column", sm: "row" },
                })}
            >
                <Box
                    sx={(theme) => ({
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                    })}
                >
                    <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 32, color: "#fff" }} />
                </Box>
                <Box>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                        Chào mừng đến với TumLumTala Admin
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Hệ thống quản trị microservices với kiến trúc gRPC, JWT authentication và
                        Redis cache. Sử dụng menu bên trái để điều hướng đến các chức năng quản lý.
                    </Typography>
                </Box>
            </Paper>
        </Box>
    );
};
