import CloseIcon from "@mui/icons-material/Close";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { Alert, Button, Collapse, IconButton } from "@mui/material";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function getPermission(): NotificationPermission | "unsupported" {
	if (typeof window === "undefined" || !("Notification" in window))
		return "unsupported";
	return Notification.permission;
}

export function NotificationPermissionBanner() {
	const [permission, setPermission] = useState(getPermission);
	const [dismissed, setDismissed] = useState(() => {
		try {
			return localStorage.getItem("notif-banner-dismissed") === "1";
		} catch {
			return false;
		}
	});
	const [requesting, setRequesting] = useState(false);

	useEffect(() => {
		if (permission !== "default") return;
		const id = setInterval(() => {
			const current = getPermission();
			if (current !== permission) {
				setPermission(current);
				clearInterval(id);
			}
		}, 1000);
		return () => clearInterval(id);
	}, [permission]);

	const handleRequest = async () => {
		setRequesting(true);
		try {
			const result = await Notification.requestPermission();
			setPermission(result);
			if (result === "granted") setDismissed(true);
		} finally {
			setRequesting(false);
		}
	};

	const handleDismiss = () => {
		setDismissed(true);
		try {
			localStorage.setItem("notif-banner-dismissed", "1");
		} catch {
			/* ignore */
		}
	};

	const visible = permission === "default" && !dismissed;

	return createPortal(
		<Collapse in={visible} unmountOnExit>
			<Alert
				icon={<NotificationsIcon fontSize="small" />}
				severity="info"
				sx={{
					borderRadius: 0,
					py: 0.5,
					position: "fixed",
					top: 0,
					left: 0,
					right: 0,
					zIndex: 10000,
					boxShadow: 2,
				}}
				action={
					<>
						<Button
							size="small"
							color="inherit"
							variant="outlined"
							startIcon={<NotificationsIcon fontSize="small" />}
							onClick={handleRequest}
							disabled={requesting}
							sx={{ mr: 1, whiteSpace: "nowrap" }}
						>
							Bật thông báo
						</Button>
						<IconButton size="small" color="inherit" onClick={handleDismiss}>
							<CloseIcon fontSize="small" />
						</IconButton>
					</>
				}
			>
				Bật thông báo desktop để nhận tin nhắn mới ngay cả khi bạn đang dùng ứng
				dụng khác.
			</Alert>
		</Collapse>,
		document.body,
	);
}
