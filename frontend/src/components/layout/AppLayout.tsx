import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DashboardIcon from "@mui/icons-material/Dashboard";
import HomeIcon from "@mui/icons-material/Home";
import LogoutIcon from "@mui/icons-material/Logout";
import MovieIcon from "@mui/icons-material/Movie";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import ChatIcon from "@mui/icons-material/Chat";
import PeopleIcon from "@mui/icons-material/People";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import { Suspense, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import PersonIcon from "@mui/icons-material/Person";
import { logout } from "@api/authApi";
import { authStore } from "@store/authStore";
import { useThemeMode } from "@store/themeStore";
import { useCurrentUser, currentUserCache } from "@hooks/user/useCurrentUser";
import { ProfileDialog } from "@components/user/dialog/ProfileDialog";
import { HeaderChatsMenu } from "@components/messenger/HeaderChatsMenu";
import { isAdminIdentity, hasAnyPermissionForResource } from "@/utils/permissionAccess";

const DRAWER_WIDTH = 240;
const DRAWER_COLLAPSED = 64;

// Items always visible to any authenticated user
const PUBLIC_NAV_ITEMS = [
  { label: "Trang chủ", icon: <HomeIcon />, path: "/" },
  { label: "Phim", icon: <MovieIcon />, path: "/movie" },
  { label: "Âm nhạc", icon: <MusicNoteIcon />, path: "/music" },
  { label: "Tin nhắn", icon: <ChatIcon />, path: "/messenger" },
];

// Items gated by permission
const ADMIN_NAV_ITEMS = [
  { label: "Dashboard", icon: <DashboardIcon />, path: "/dashboard", resource: "dashboard" },
  { label: "Người dùng", icon: <PeopleIcon />, path: "/users", resource: "user" },
];

const SiderContent = ({
  collapsed,
  onClose,
  onNavigate,
  activePath,
  user,
}: {
  collapsed: boolean;
  onClose?: () => void;
  onNavigate: (path: string) => void;
  activePath: string;
  user: import("@/types").IUser | null;
}) => {
  const theme = useTheme();
  const isAdmin = isAdminIdentity(user);
  const visibleAdminItems = ADMIN_NAV_ITEMS.filter(
    (item) => isAdmin || hasAnyPermissionForResource(user, item.resource),
  );
  const navItems = [...visibleAdminItems, ...PUBLIC_NAV_ITEMS];

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        bgcolor: "background.paper",
      }}
    >
      {/* Logo toolbar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          px: 2,
          py: 1.5,
          minHeight: 64,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, overflow: "hidden" }}>
          <Box
            component="img"
            src="/assets/logo/logo.png"
            alt="TumLumTala"
            sx={{
              width: 32,
              height: 32,
              borderRadius: 2,
              objectFit: "contain",
              flexShrink: 0,
            }}
          />
          {!collapsed && (
            <Typography variant="h6" fontWeight={700} color="primary" noWrap>
              TumLumTala
            </Typography>
          )}
        </Box>

        {onClose && !collapsed && (
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      <Divider />

      {/* Nav items */}
      <List sx={{ flexGrow: 1, pt: 1 }}>
        {navItems.map((item) => {
          const isActive = activePath === item.path || (item.path !== "/" && activePath.startsWith(item.path));
          return (
            <Tooltip
              key={item.path}
              title={collapsed ? item.label : ""}
              placement="right"
              arrow
              disableHoverListener={!collapsed}
            >
              <ListItemButton
                selected={isActive}
                onClick={() => {
                  onNavigate(item.path);
                  onClose?.();
                }}
                sx={{
                  mx: 1,
                  mb: 0.5,
                  borderRadius: 2,
                  justifyContent: collapsed ? "center" : "flex-start",
                  px: collapsed ? 1 : 2,
                  "&.Mui-selected": {
                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                    color: "primary.main",
                    "& .MuiListItemIcon-root": { color: "primary.main" },
                    "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.18) },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: collapsed ? 0 : 2,
                    justifyContent: "center",
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {!collapsed && <ListItemText primary={item.label} />}
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>
    </Box>
  );
};

export const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));
  const { mode, toggleMode } = useThemeMode();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const { user } = useCurrentUser();

  const handleLogout = async () => {
    setAnchorEl(null);
    try {
      await logout();
    } catch {
      /* ignore */
    }
    currentUserCache.clear();
    authStore.clearToken();
    navigate("/login", { replace: true });
  };

  const handleProfile = () => {
    setAnchorEl(null);
    setProfileOpen(true);
  };

  const displayName = user?.fullname || user?.email || "Admin";
  const avatarInitials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        {/* Mobile Drawer */}
        {isMobile && (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{
              "& .MuiDrawer-paper": {
                width: DRAWER_WIDTH,
                boxSizing: "border-box",
              },
            }}
          >
            <SiderContent
              collapsed={false}
              onClose={() => setMobileOpen(false)}
              onNavigate={navigate}
              activePath={location.pathname}
              user={user ?? null}
            />
          </Drawer>
        )}

        {/* Desktop Sidebar */}
        {!isMobile && (
          <Box
            sx={{
              width: collapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH,
              flexShrink: 0,
              transition: "width 0.3s ease",
              overflow: "hidden",
              borderRight: "1px solid",
              borderColor: "divider",
            }}
          >
            <SiderContent
              collapsed={collapsed}
              onNavigate={navigate}
              activePath={location.pathname}
              user={user ?? null}
            />
          </Box>
        )}

        {/* Main content */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          {/* AppBar */}
          <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
            <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                {isMobile ? (
                  <IconButton color="inherit" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }}>
                    <MenuIcon />
                  </IconButton>
                ) : (
                  <IconButton color="inherit" onClick={() => setCollapsed((c) => !c)} sx={{ mr: 2 }}>
                    {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                  </IconButton>
                )}
                <Typography
                  variant="h6"
                  sx={{ display: { xs: "none", sm: "block" }, color: "text.primary" }}
                >
                  Xin chào, {displayName}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {/* Theme toggle */}
                <Tooltip title={mode === "light" ? "Chế độ tối" : "Chế độ sáng"}>
                  <IconButton color="inherit" onClick={toggleMode}>
                    {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
                  </IconButton>
                </Tooltip>

                <HeaderChatsMenu />

                {/* User menu */}
                <Box
                  onClick={(e) => setAnchorEl(e.currentTarget)}
                  sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "pointer", ml: 1 }}
                >
                  <Typography sx={{ display: { xs: "none", sm: "block" }, color: "text.primary" }}>
                    {displayName}
                  </Typography>
                  <Avatar
                    src={user?.avatar || undefined}
                    sx={{ width: 34, height: 34, bgcolor: "primary.main", fontSize: 14 }}
                  >
                    {!user?.avatar && avatarInitials}
                  </Avatar>
                </Box>

                <Menu
                  anchorEl={anchorEl}
                  open={!!anchorEl}
                  onClose={() => setAnchorEl(null)}
                  transformOrigin={{ horizontal: "right", vertical: "top" }}
                  anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                >
                  <MenuItem onClick={handleProfile}>
                    <PersonIcon fontSize="small" sx={{ mr: 1 }} />
                    Hồ sơ của tôi
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={handleLogout}>
                    <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
                    Đăng xuất
                  </MenuItem>
                </Menu>
              </Box>
            </Toolbar>
          </AppBar>

          {/* Page content */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              position: "relative",
              overflow: location.pathname.startsWith("/messenger") ? "hidden" : "auto",
              p: location.pathname.startsWith("/messenger") ? 0 : { xs: 1.5, sm: 2, md: 3 },
            }}
          >
            <Suspense fallback={null}>
              <Outlet />
            </Suspense>
          </Box>
        </Box>

      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
    </Box>
  );
};
