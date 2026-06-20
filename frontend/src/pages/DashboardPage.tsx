import { Box, Grid, Paper, Typography } from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import { useEffect, useState } from "react";
import { listUsers } from "@api/userApi";

export const DashboardPage = () => {
  const [totalUsers, setTotalUsers] = useState<number | null>(null);

  useEffect(() => {
    listUsers(1, 0)
      .then((res) => setTotalUsers(res.total))
      .catch(() => setTotalUsers(0));
  }, []);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>
        Dashboard
      </Typography>
      <Grid container spacing={3} sx={{ mt: 0 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, display: "flex", alignItems: "center", gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: "primary.light",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PeopleIcon sx={{ color: "primary.contrastText" }} />
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Tổng người dùng
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {totalUsers === null ? "—" : totalUsers}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
