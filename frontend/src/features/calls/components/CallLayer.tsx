import CallEndIcon from "@mui/icons-material/CallEnd";
import CameraswitchIcon from "@mui/icons-material/Cameraswitch";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import PhoneIcon from "@mui/icons-material/Phone";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import {
	Avatar,
	Backdrop,
	Box,
	Button,
	Dialog,
	DialogContent,
	IconButton,
	Paper,
	Stack,
	Typography,
} from "@mui/material";
import type { ReactNode } from "react";
import type { Participant } from "@/types/messenger";
import { resolveCdnUrl } from "@/utils";
import { useCallTimer } from "../hooks/useCallTimer";
import type { CallContext, CallState } from "../types/call.types";
import { StreamVideo } from "./StreamVideo";

type CallLayerProps = {
	state: CallState;
	context: CallContext;
	localStream: MediaStream | null;
	remoteStream: MediaStream | null;
	error: string;
	micOn: boolean;
	cameraOn: boolean;
	onAccept: () => void;
	onReject: () => void;
	onEnd: () => void;
	onToggleMic: () => void;
	onToggleCamera: () => void;
	onSwitchCamera: () => void;
};

export function CallLayer({
	state,
	context,
	localStream,
	remoteStream,
	error,
	micOn,
	cameraOn,
	onAccept,
	onReject,
	onEnd,
	onToggleMic,
	onToggleCamera,
	onSwitchCamera,
}: CallLayerProps) {
	const peer = context.peer;
	const name = displayName(peer, context.isCaller ? "Đang gọi" : "Cuộc gọi đến");
	const active = ["connecting", "connected", "reconnecting"].includes(state);
	const timer = useCallTimer(state === "connected");

	if (state === "idle") return null;

	// Incoming call popup for receiver
	if (state === "ringing" && !context.isCaller) {
		return (
			<Dialog open maxWidth="xs" fullWidth disableEscapeKeyDown>
				<DialogContent>
					<Stack alignItems="center" spacing={2} sx={{ py: 2 }}>
						<Box sx={{ position: "relative" }}>
							<PeerAvatar peer={peer} size={76} />
							<Box
								sx={{
									position: "absolute",
									inset: -6,
									borderRadius: "50%",
									border: "2px solid",
									borderColor: "success.main",
									animation: "callPulse 1.4s ease-in-out infinite",
									"@keyframes callPulse": {
										"0%, 100%": { opacity: 1, transform: "scale(1)" },
										"50%": { opacity: 0.5, transform: "scale(1.08)" },
									},
								}}
							/>
						</Box>
						<Box textAlign="center">
							<Typography variant="h6" fontWeight={800}>
								{name}
							</Typography>
							<Typography color="text.secondary">
								{context.session?.call_type === "audio"
									? "Cuộc gọi thoại đến"
									: "Cuộc gọi video đến"}
							</Typography>
						</Box>
						<Stack direction="row" spacing={3}>
							<Stack alignItems="center" spacing={0.5}>
								<IconButton
									aria-label="Từ chối cuộc gọi"
									onClick={onReject}
									sx={{ bgcolor: "error.main", color: "#fff", width: 56, height: 56, "&:hover": { bgcolor: "error.dark" } }}
								>
									<CallEndIcon />
								</IconButton>
								<Typography variant="caption" color="text.secondary">Từ chối</Typography>
							</Stack>
							<Stack alignItems="center" spacing={0.5}>
								<IconButton
									aria-label="Chấp nhận cuộc gọi"
									onClick={onAccept}
									sx={{ bgcolor: "success.main", color: "#fff", width: 56, height: 56, "&:hover": { bgcolor: "success.dark" } }}
								>
									<PhoneIcon />
								</IconButton>
								<Typography variant="caption" color="text.secondary">Nghe máy</Typography>
							</Stack>
						</Stack>
					</Stack>
				</DialogContent>
			</Dialog>
		);
	}

	// Outgoing call state for caller
	if ((state === "calling" || state === "permission_checking") && context.isCaller) {
		return (
			<Dialog open maxWidth="xs" fullWidth disableEscapeKeyDown>
				<DialogContent>
					<Stack alignItems="center" spacing={2} sx={{ py: 2 }}>
						<Box sx={{ position: "relative" }}>
							<PeerAvatar peer={peer} size={76} />
							<Box
								sx={{
									position: "absolute",
									inset: -6,
									borderRadius: "50%",
									border: "2px solid",
									borderColor: "primary.main",
									animation: "callPulse 1.8s ease-in-out infinite",
									"@keyframes callPulse": {
										"0%, 100%": { opacity: 1, transform: "scale(1)" },
										"50%": { opacity: 0.4, transform: "scale(1.1)" },
									},
								}}
							/>
						</Box>
						<Box textAlign="center">
							<Typography variant="h6" fontWeight={800}>{name}</Typography>
							<Typography color="text.secondary">
								{state === "permission_checking" ? "Đang kiểm tra quyền..." : "Đang gọi..."}
							</Typography>
						</Box>
						{error ? <Typography color="error" variant="body2">{error}</Typography> : null}
						<Stack alignItems="center" spacing={0.5}>
							<IconButton
								aria-label="Hủy cuộc gọi"
								onClick={onEnd}
								sx={{ bgcolor: "error.main", color: "#fff", width: 56, height: 56, "&:hover": { bgcolor: "error.dark" } }}
							>
								<CallEndIcon />
							</IconButton>
							<Typography variant="caption" color="text.secondary">Hủy</Typography>
						</Stack>
					</Stack>
				</DialogContent>
			</Dialog>
		);
	}

	if (!active) {
		return (
			<Dialog open maxWidth="xs" fullWidth>
				<DialogContent>
					<Stack alignItems="center" spacing={2} sx={{ py: 2 }}>
						<PeerAvatar peer={peer} size={72} />
						<Typography variant="h6" fontWeight={800}>
							{statusText(state)}
						</Typography>
						{error ? <Typography color="error">{error}</Typography> : null}
						<Button variant="contained" color="error" onClick={onEnd}>
							Đóng
						</Button>
					</Stack>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Backdrop open sx={{ zIndex: 2000, color: "#fff", bgcolor: "rgba(2,6,23,0.94)" }}>
			<Box sx={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column" }}>
				<Box sx={{ flex: 1, position: "relative", minHeight: 0 }}>
					{context.session?.call_type === "video" ? (
						<StreamVideo stream={remoteStream} label="Remote video" />
					) : (
						<Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }} spacing={2}>
							<PeerAvatar peer={peer} size={112} />
							<Typography variant="h5" fontWeight={800}>{name}</Typography>
							<GraphicEqIcon sx={{ fontSize: 72, opacity: 0.75 }} />
						</Stack>
					)}
					{context.session?.call_type === "video" ? (
						<Paper
							elevation={8}
							sx={{
								position: "absolute",
								right: 20,
								bottom: 104,
								width: { xs: 116, sm: 180 },
								aspectRatio: "9 / 16",
								overflow: "hidden",
								borderRadius: 2,
								bgcolor: "#111827",
							}}
						>
							<StreamVideo stream={localStream} muted label="Local video" />
						</Paper>
					) : null}
					<Box sx={{ position: "absolute", top: 20, left: 24 }}>
						<Typography variant="subtitle1" fontWeight={800}>{name}</Typography>
						<Typography variant="body2" sx={{ opacity: 0.8 }}>
							{state === "reconnecting" ? "Đang kết nối lại..." : timer}
						</Typography>
					</Box>
				</Box>
				<Stack
					direction="row"
					justifyContent="center"
					spacing={1.5}
					sx={{ px: 2, py: 3, bgcolor: "rgba(15,23,42,0.84)" }}
				>
					<ControlButton label={micOn ? "Tắt mic" : "Mở mic"} onClick={onToggleMic}>
						{micOn ? <MicIcon /> : <MicOffIcon />}
					</ControlButton>
					{context.session?.call_type === "video" ? (
						<>
							<ControlButton label={cameraOn ? "Tắt camera" : "Mở camera"} onClick={onToggleCamera}>
								{cameraOn ? <VideocamIcon /> : <VideocamOffIcon />}
							</ControlButton>
							<ControlButton label="Chuyển camera" onClick={onSwitchCamera}>
								<CameraswitchIcon />
							</ControlButton>
						</>
					) : null}
					<IconButton
						aria-label="Kết thúc cuộc gọi"
						onClick={onEnd}
						sx={{ bgcolor: "error.main", color: "#fff", width: 56, height: 56, "&:hover": { bgcolor: "error.dark" } }}
					>
						<CallEndIcon />
					</IconButton>
				</Stack>
			</Box>
		</Backdrop>
	);
}

function ControlButton({
	label,
	onClick,
	children,
}: {
	label: string;
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<IconButton
			aria-label={label}
			onClick={onClick}
			sx={{ bgcolor: "rgba(255,255,255,0.14)", color: "#fff", width: 56, height: 56, "&:hover": { bgcolor: "rgba(255,255,255,0.24)" } }}
		>
			{children}
		</IconButton>
	);
}

function PeerAvatar({ peer, size }: { peer?: Participant; size: number }) {
	return <Avatar src={resolveCdnUrl(peer?.avatar)} sx={{ width: size, height: size }} />;
}

function displayName(peer: Participant | undefined, fallback: string) {
	return peer?.nickname || peer?.fullname || peer?.email || fallback;
}

function statusText(state: CallState) {
	if (state === "permission_checking") return "Đang kiểm tra quyền truy cập...";
	if (state === "calling") return "Đang gọi...";
	if (state === "busy") return "Người nhận đang bận";
	if (state === "rejected") return "Cuộc gọi bị từ chối";
	if (state === "missed") return "Không có phản hồi";
	if (state === "cancelled") return "Cuộc gọi đã hủy";
	if (state === "failed") return "Cuộc gọi thất bại";
	if (state === "ended") return "Cuộc gọi đã kết thúc";
	return "Đang kết nối...";
}
