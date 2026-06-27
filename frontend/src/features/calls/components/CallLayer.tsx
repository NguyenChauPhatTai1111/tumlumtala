import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CallEndIcon from "@mui/icons-material/CallEnd";
import CameraswitchIcon from "@mui/icons-material/Cameraswitch";
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
    Tooltip,
    Typography,
    alpha,
    useTheme,
} from "@mui/material";
import { type PointerEvent as ReactPointerEvent, type ReactNode, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Participant } from "@/types/messenger";
import { resolveCdnUrl } from "@/utils";
import {
    averageGradientColors,
    getReadableTextColor,
} from "@/components/messenger/utils/color";
import { parseConversationThemeConfig } from "@/components/messenger/utils/theme";
import { useCallTimer } from "../hooks/useCallTimer";
import type { CallContext, CallState } from "../types/call.types";
import { AudioLevelBars } from "./AudioLevelBars";
import { StreamAudio } from "./StreamAudio";
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
    onToggleCamera: () => Promise<void>;
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
    const navigate = useNavigate();
    const muiTheme = useTheme();
    const [collapsed, setCollapsed] = useState(false);
    const [floatingPosition, setFloatingPosition] = useState<{
        left: number;
        top: number;
    } | null>(null);
    const floatingRef = useRef<HTMLDivElement | null>(null);
    const dragRef = useRef({
        pointerId: -1,
        offsetX: 0,
        offsetY: 0,
        startX: 0,
        startY: 0,
        moved: false,
    });

    // Swap main/pip stream
    const [swapped, setSwapped] = useState(false);

    // Self-view (local video pip) drag state — dùng left/top + offset để tránh giật
    const [selfViewPos, setSelfViewPos] = useState<{ left: number; top: number } | null>(null);
    const selfViewRef = useRef<HTMLDivElement | null>(null);
    const selfDragRef = useRef({ pointerId: -1, offsetX: 0, offsetY: 0, moved: false });

    const handleSelfPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
        const el = selfViewRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        selfDragRef.current = {
            pointerId: e.pointerId,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
            moved: false,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        e.stopPropagation();
    };

    const handleSelfPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
        const drag = selfDragRef.current;
        const el = selfViewRef.current;
        if (drag.pointerId !== e.pointerId || !el) return;
        const margin = 8;
        const left = Math.min(
            Math.max(e.clientX - drag.offsetX, margin),
            window.innerWidth - el.offsetWidth - margin,
        );
        const top = Math.min(
            Math.max(e.clientY - drag.offsetY, margin),
            window.innerHeight - el.offsetHeight - margin,
        );
        // chỉ tính là drag nếu di chuyển đủ xa
        if (
            Math.abs(e.clientX - (selfViewPos?.left ?? 0) - drag.offsetX) > 4 ||
            Math.abs(e.clientY - (selfViewPos?.top ?? 0) - drag.offsetY) > 4
        ) {
            drag.moved = true;
        }
        setSelfViewPos({ left, top });
        e.stopPropagation();
    };

    const handleSelfPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
        if (selfDragRef.current.pointerId !== e.pointerId) return;
        e.currentTarget.releasePointerCapture(e.pointerId);
        const wasDragged = selfDragRef.current.moved;
        selfDragRef.current.pointerId = -1;
        if (!wasDragged) {
            setSwapped((s) => !s);
            setSelfViewPos(null);
        }
        e.stopPropagation();
    };
    const peer = context.peer;
    const name = displayName(peer, context.isCaller ? "Đang gọi" : "Cuộc gọi đến");
    const active = ["connecting", "connected", "reconnecting"].includes(state);
    const timer = useCallTimer(state === "connected");
    const callType = context.session?.call_type ?? context.callType;
    const isAudioCall = callType === "audio";
    const peerAvatar = resolveCdnUrl(peer?.avatar);
    const conversationTheme = context.conversation?.theme;
    const parsedTheme = parseConversationThemeConfig(context.conversation?.background);
    const controlsBackground =
        conversationTheme?.outgoing_bubble_color ||
        parsedTheme.outgoingBubbleColor ||
        context.conversation?.outgoing_bubble_color ||
        conversationTheme?.background_color ||
        parsedTheme.backgroundColor ||
        context.conversation?.background_color;
    const controlsTextColor =
        conversationTheme?.outgoing_text_color ||
        parsedTheme.outgoingTextColor ||
        context.conversation?.outgoing_text_color ||
        (controlsBackground
            ? getReadableTextColor(
                  averageGradientColors(controlsBackground) ?? controlsBackground,
              )
            : muiTheme.palette.text.primary);

    if (state === "idle") return null;

    const collapseToMessages = () => {
        setCollapsed(true);
        const conversationId = context.session?.conversation_id ?? context.conversation?.id;
        if (conversationId) {
            navigate(`/messenger?conversationId=${conversationId}`);
        } else {
            navigate("/messenger");
        }
    };

    if (
        collapsed &&
        isAudioCall &&
        ["permission_checking", "calling", "connecting", "connected", "reconnecting"].includes(
            state,
        )
    ) {
        return (
            <Paper
                elevation={12}
                role="button"
                tabIndex={0}
                aria-label="Mở rộng cuộc gọi thoại"
                onClick={() => setCollapsed(false)}
                onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setCollapsed(false);
                    }
                }}
                sx={{
                    position: "fixed",
                    top: { xs: 8, sm: 12 },
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 2100,
                    width: { xs: "calc(100% - 16px)", sm: 440 },
                    minHeight: 64,
                    px: 1.25,
                    py: 0.75,
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    borderRadius: 2.5,
                    bgcolor: "rgba(17,24,39,0.96)",
                    ...(peerAvatar
                        ? {
                              backgroundImage: `linear-gradient(rgba(3,7,18,0.56), rgba(3,7,18,0.72)), url("${peerAvatar}")`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                          }
                        : {}),
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.14)",
                    backdropFilter: "blur(14px)",
                    cursor: "pointer",
                }}
            >
                <StreamAudio stream={remoteStream} />
                <PeerAvatar peer={peer} size={44} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={800} noWrap>
                        {name}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.72 }}>
                        {state === "connected"
                            ? timer
                            : state === "reconnecting"
                              ? "Đang kết nối lại..."
                              : "Đang gọi..."}
                    </Typography>
                </Box>
                <Box sx={{ transform: "scale(0.58)", width: 38, overflow: "visible" }}>
                    <AudioLevelBars stream={remoteStream} />
                </Box>
                <IconButton
                    aria-label={micOn ? "Tắt mic" : "Mở mic"}
                    onClick={(event) => {
                        event.stopPropagation();
                        onToggleMic();
                    }}
                    sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.12)" }}
                >
                    {micOn ? <MicIcon /> : <MicOffIcon />}
                </IconButton>
                <IconButton
                    aria-label="Kết thúc cuộc gọi"
                    onClick={(event) => {
                        event.stopPropagation();
                        onEnd();
                    }}
                    sx={{
                        color: "#fff",
                        bgcolor: "error.main",
                        "&:hover": { bgcolor: "error.dark" },
                    }}
                >
                    <CallEndIcon />
                </IconButton>
            </Paper>
        );
    }

    // Incoming call popup for receiver
    if (state === "ringing" && !context.isCaller) {
        return (
            <Dialog
                open
                maxWidth="xs"
                fullWidth
                disableEscapeKeyDown
                slotProps={{
                    paper: {
                        sx: {
                            bgcolor: "#070b18",
                            color: "#fff",
                            overflow: "hidden",
                        },
                    },
                }}
            >
                <DialogContent sx={{ position: "relative", overflow: "hidden" }}>
                    <CallAvatarBackground src={peerAvatar} />
                    <Stack
                        alignItems="center"
                        spacing={2}
                        sx={{ position: "relative", zIndex: 1, py: 2 }}
                    >
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
                            <Typography sx={{ color: "rgba(255,255,255,0.76)" }}>
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
                                    sx={{
                                        bgcolor: "error.main",
                                        color: "#fff",
                                        width: 56,
                                        height: 56,
                                        "&:hover": { bgcolor: "error.dark" },
                                    }}
                                >
                                    <CallEndIcon />
                                </IconButton>
                                <Typography
                                    variant="caption"
                                    sx={{ color: "rgba(255,255,255,0.76)" }}
                                >
                                    Từ chối
                                </Typography>
                            </Stack>
                            <Stack alignItems="center" spacing={0.5}>
                                <IconButton
                                    aria-label="Chấp nhận cuộc gọi"
                                    onClick={onAccept}
                                    sx={{
                                        bgcolor: "success.main",
                                        color: "#fff",
                                        width: 56,
                                        height: 56,
                                        "&:hover": { bgcolor: "success.dark" },
                                    }}
                                >
                                    <PhoneIcon />
                                </IconButton>
                                <Typography
                                    variant="caption"
                                    sx={{ color: "rgba(255,255,255,0.76)" }}
                                >
                                    Nghe máy
                                </Typography>
                            </Stack>
                        </Stack>
                    </Stack>
                </DialogContent>
            </Dialog>
        );
    }

    // Outgoing call state for caller
    if ((state === "calling" || state === "permission_checking") && context.isCaller) {
        if (isAudioCall) {
            return (
                <Backdrop open sx={{ zIndex: 2000, color: "#fff", bgcolor: "#070b18" }}>
                    <Box sx={{ position: "fixed", inset: 0, overflow: "hidden" }}>
                        <CallAvatarBackground src={peerAvatar} />
                        <IconButton
                            aria-label="Quay lại tin nhắn và thu nhỏ cuộc gọi"
                            onClick={collapseToMessages}
                            sx={{
                                position: "absolute",
                                top: 16,
                                left: 16,
                                zIndex: 1,
                                color: "#fff",
                                bgcolor: "rgba(15,23,42,0.5)",
                            }}
                        >
                            <ArrowBackIcon />
                        </IconButton>
                        <Stack
                            alignItems="center"
                            sx={{ position: "relative", height: "100%", pt: "14vh", pb: 5 }}
                        >
                            <PeerAvatar peer={peer} size={104} />
                            <Typography variant="h5" fontWeight={800} sx={{ mt: 2 }}>
                                {name}
                            </Typography>
                            <Typography sx={{ opacity: 0.76, mt: 0.5 }}>
                                {state === "permission_checking"
                                    ? "Đang kiểm tra quyền microphone..."
                                    : "Đang gọi..."}
                            </Typography>
                            <Box sx={{ flex: 1 }} />
                            <Stack alignItems="center" spacing={0.75}>
                                <IconButton
                                    aria-label="Hủy cuộc gọi"
                                    onClick={onEnd}
                                    sx={{
                                        bgcolor: "rgba(255,255,255,0.18)",
                                        color: "#fff",
                                        width: 64,
                                        height: 64,
                                        "&:hover": { bgcolor: "error.main" },
                                    }}
                                >
                                    <CallEndIcon />
                                </IconButton>
                                <Typography variant="caption">Hủy</Typography>
                            </Stack>
                        </Stack>
                    </Box>
                </Backdrop>
            );
        }
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
                            <Typography variant="h6" fontWeight={800}>
                                {name}
                            </Typography>
                            <Typography color="text.secondary">
                                {state === "permission_checking"
                                    ? "Đang kiểm tra quyền..."
                                    : "Đang gọi..."}
                            </Typography>
                        </Box>
                        {error ? (
                            <Typography color="error" variant="body2">
                                {error}
                            </Typography>
                        ) : null}
                        <Stack alignItems="center" spacing={0.5}>
                            <IconButton
                                aria-label="Hủy cuộc gọi"
                                onClick={onEnd}
                                sx={{
                                    bgcolor: "error.main",
                                    color: "#fff",
                                    width: 56,
                                    height: 56,
                                    "&:hover": { bgcolor: "error.dark" },
                                }}
                            >
                                <CallEndIcon />
                            </IconButton>
                            <Typography variant="caption" color="text.secondary">
                                Hủy
                            </Typography>
                        </Stack>
                    </Stack>
                </DialogContent>
            </Dialog>
        );
    }

    if (!active) {
        return (
            <Dialog
                open
                maxWidth="xs"
                fullWidth
                slotProps={
                    isAudioCall
                        ? {
                              paper: {
                                  sx: {
                                      bgcolor: "#070b18",
                                      color: "#fff",
                                      overflow: "hidden",
                                  },
                              },
                          }
                        : undefined
                }
            >
                <DialogContent sx={{ position: "relative", overflow: "hidden" }}>
                    {isAudioCall ? <CallAvatarBackground src={peerAvatar} /> : null}
                    <Stack
                        alignItems="center"
                        spacing={2}
                        sx={{ position: "relative", zIndex: 1, py: 2 }}
                    >
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

    const handleFloatingPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        const element = floatingRef.current;
        if (!element) return;
        const rect = element.getBoundingClientRect();
        dragRef.current = {
            pointerId: event.pointerId,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
            startX: event.clientX,
            startY: event.clientY,
            moved: false,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const handleFloatingPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        const element = floatingRef.current;
        if (drag.pointerId !== event.pointerId || !element) return;
        if (
            Math.abs(event.clientX - drag.startX) > 4 ||
            Math.abs(event.clientY - drag.startY) > 4
        ) {
            drag.moved = true;
        }
        const margin = 8;
        const left = Math.min(
            Math.max(event.clientX - drag.offsetX, margin),
            window.innerWidth - element.offsetWidth - margin,
        );
        const top = Math.min(
            Math.max(event.clientY - drag.offsetY, margin),
            window.innerHeight - element.offsetHeight - margin,
        );
        setFloatingPosition({ left, top });
    };

    const handleFloatingPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (dragRef.current.pointerId !== event.pointerId) return;
        event.currentTarget.releasePointerCapture(event.pointerId);
        const wasDragged = dragRef.current.moved;
        dragRef.current.pointerId = -1;
        if (!wasDragged) setCollapsed(false);
    };

    if (collapsed && context.session?.call_type === "video") {
        return (
            <Paper
                ref={floatingRef}
                elevation={18}
                role="button"
                tabIndex={0}
                aria-label="Mở rộng cuộc gọi video"
                onPointerDown={handleFloatingPointerDown}
                onPointerMove={handleFloatingPointerMove}
                onPointerUp={handleFloatingPointerUp}
                onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setCollapsed(false);
                    }
                }}
                sx={{
                    position: "fixed",
                    ...(floatingPosition ?? { right: 16, bottom: 16 }),
                    zIndex: 2000,
                    width: { xs: 168, sm: 240 },
                    aspectRatio: "16 / 9",
                    overflow: "hidden",
                    borderRadius: 2,
                    bgcolor: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.24)",
                    boxShadow: "0 18px 48px rgba(0,0,0,0.5)",
                    cursor: "grab",
                    touchAction: "none",
                    userSelect: "none",
                    transition: floatingPosition
                        ? "box-shadow 160ms ease"
                        : "opacity 180ms ease, transform 180ms ease",
                    "&:hover": {
                        boxShadow: "0 22px 56px rgba(0,0,0,0.62)",
                    },
                    "&:active": { cursor: "grabbing" },
                }}
            >
                <StreamVideo stream={remoteStream} label="Remote video thu nhỏ" />
            </Paper>
        );
    }

    return (
        <Backdrop open sx={{ zIndex: 2000, color: "#fff", bgcolor: "rgba(2,6,23,0.94)" }}>
            <Box
                sx={{
                    position: "fixed",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                }}
            >
                {isAudioCall ? <CallAvatarBackground src={peerAvatar} /> : null}
                <Box sx={{ flex: 1, position: "relative", zIndex: 1, minHeight: 0 }}>
                    {context.session?.call_type === "video" ? (
                        <StreamVideo
                            stream={swapped ? localStream : remoteStream}
                            muted={swapped}
                            label={swapped ? "Local video (main)" : "Remote video"}
                        />
                    ) : (
                        <>
                            <StreamAudio stream={remoteStream} />
                            <Stack
                                alignItems="center"
                                justifyContent="center"
                                sx={{ height: "100%" }}
                                spacing={2}
                            >
                                <PeerAvatar peer={peer} size={112} />
                                <Typography variant="h5" fontWeight={800}>
                                    {name}
                                </Typography>
                                <AudioLevelBars stream={remoteStream} />
                            </Stack>
                        </>
                    )}
                    {context.session?.call_type === "video" ? (
                        <Paper
                            ref={selfViewRef}
                            elevation={8}
                            onPointerDown={handleSelfPointerDown}
                            onPointerMove={handleSelfPointerMove}
                            onPointerUp={handleSelfPointerUp}
                            sx={{
                                position: "absolute",
                                ...(selfViewPos ?? { right: 20, bottom: 104 }),
                                width: { xs: 116, sm: 180 },
                                aspectRatio: "9 / 16",
                                overflow: "hidden",
                                borderRadius: 2,
                                bgcolor: "#111827",
                                cursor: "grab",
                                touchAction: "none",
                                userSelect: "none",
                                "&:active": { cursor: "grabbing" },
                                "&:hover": { boxShadow: "0 8px 32px rgba(0,0,0,0.6)" },
                            }}
                        >
                            <StreamVideo
                                stream={swapped ? remoteStream : localStream}
                                muted={!swapped}
                                label={swapped ? "Remote video (pip)" : "Local video"}
                            />
                        </Paper>
                    ) : null}
                    <Box
                        sx={{
                            position: "absolute",
                            top: 16,
                            left: 16,
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 1,
                        }}
                    >
                        {(context.session?.call_type === "video" ||
                            context.session?.call_type === "audio") && (
                            <IconButton
                                aria-label="Quay lại tin nhắn và thu nhỏ cuộc gọi"
                                onClick={collapseToMessages}
                                sx={{
                                    color: "#fff",
                                    bgcolor: "rgba(15,23,42,0.58)",
                                    backdropFilter: "blur(8px)",
                                    "&:hover": { bgcolor: "rgba(15,23,42,0.78)" },
                                }}
                            >
                                <ArrowBackIcon />
                            </IconButton>
                        )}
                        <Box sx={{ pt: 0.25 }}>
                            <Typography variant="subtitle1" fontWeight={800}>
                                {name}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                {state === "reconnecting" ? "Đang kết nối lại..." : timer}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
                <Stack
                    direction="row"
                    justifyContent="center"
                    spacing={1.5}
                    sx={{
                        position: "relative",
                        zIndex: 1,
                        px: 2,
                        py: 3,
                        background:
                            controlsBackground ||
                            alpha(muiTheme.palette.background.paper, 0.84),
                        color: controlsTextColor,
                        backdropFilter: "blur(10px)",
                        borderTop: `1px solid ${alpha(controlsTextColor, 0.14)}`,
                    }}
                >
                    <ControlButton
                        label={micOn ? "Tắt mic" : "Mở mic"}
                        onClick={onToggleMic}
                        color={controlsTextColor}
                    >
                        {micOn ? <MicIcon /> : <MicOffIcon />}
                    </ControlButton>
                    {context.session?.call_type === "video" ? (
                        <>
                            <ControlButton
                                label={cameraOn ? "Tắt camera" : "Mở camera"}
                                onClick={onToggleCamera}
                                color={controlsTextColor}
                            >
                                {cameraOn ? <VideocamIcon /> : <VideocamOffIcon />}
                            </ControlButton>
                            <ControlButton
                                label="Chuyển camera"
                                onClick={onSwitchCamera}
                                color={controlsTextColor}
                            >
                                <CameraswitchIcon />
                            </ControlButton>
                        </>
                    ) : null}
                    <Tooltip title="Kết thúc cuộc gọi" placement="top">
                        <IconButton
                            aria-label="Kết thúc cuộc gọi"
                            onClick={onEnd}
                            sx={{
                                bgcolor: "error.main",
                                color: "#fff",
                                width: 56,
                                height: 56,
                                "&:hover": { bgcolor: "error.dark" },
                            }}
                        >
                            <CallEndIcon />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Box>
        </Backdrop>
    );
}

function ControlButton({
    label,
    onClick,
    children,
    color = "#fff",
}: {
    label: string;
    onClick: () => void;
    children: ReactNode;
    color?: string;
}) {
    return (
        <Tooltip title={label} placement="top">
            <IconButton
            aria-label={label}
            onClick={onClick}
            sx={{
                bgcolor: `color-mix(in srgb, ${color} 14%, transparent)`,
                color,
                width: 56,
                height: 56,
                "&:hover": {
                    bgcolor: `color-mix(in srgb, ${color} 24%, transparent)`,
                },
            }}
            >
                {children}
            </IconButton>
        </Tooltip>
    );
}

function PeerAvatar({ peer, size }: { peer?: Participant; size: number }) {
    return <Avatar src={resolveCdnUrl(peer?.avatar)} sx={{ width: size, height: size }} />;
}

function CallAvatarBackground({ src }: { src?: string }) {
    return (
        <>
            {src ? (
                <Box
                    aria-hidden
                    sx={{
                        position: "absolute",
                        inset: -24,
                        backgroundImage: `url("${src}")`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        filter: "blur(10px)",
                        transform: "scale(1.08)",
                        opacity: 0.68,
                    }}
                />
            ) : null}
            <Box
                aria-hidden
                sx={{
                    position: "absolute",
                    inset: 0,
                    bgcolor: "rgba(3,7,18,0.42)",
                }}
            />
        </>
    );
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
