import CloseIcon from "@mui/icons-material/Close";
import { Box, IconButton } from "@mui/material";
import Typography from "@mui/material/Typography";

const Toolbar = ({
	collapsed,
	onClose,
}: {
	collapsed: boolean;
	onClose?: () => void;
}) => {
	return (
		<Box
			sx={{
				display: "flex",
				alignItems: "center",
				justifyContent: collapsed ? "center" : "space-between",
				p: 2,
			}}
		>
			<Box sx={{ display: "flex", alignItems: "center" }}>
				<img
					src="/assets/logo/logo.png"
					alt="Logo"
					style={{ width: 32, height: 32 }}
				/>
				{!collapsed && (
					<Typography variant="h6" noWrap sx={{ ml: 1 }}>
						Tùm lum tà la
					</Typography>
				)}
			</Box>

			{onClose && !collapsed && (
				<IconButton size="small" onClick={onClose}>
					<CloseIcon fontSize="small" />
				</IconButton>
			)}
		</Box>
	);
};
export default Toolbar;
