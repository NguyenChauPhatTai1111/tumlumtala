import CallIcon from "@mui/icons-material/Call";
import VideocamIcon from "@mui/icons-material/Videocam";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Paper, Typography } from "@mui/material";
import { useState } from "react";
import type { ActiveGroupCallInfo } from "../context/GlobalCallContext";

type OngoingCallBannerProps = {
    info: ActiveGroupCallInfo;
    onJoin: () => void;
    currentParticipantCount?: number;
};

export function OngoingCallBanner({ info, onJoin, currentParticipantCount }: OngoingCallBannerProps) {
    const [confirmOpen, setConfirmOpen] = useState(false);
    const count = currentParticipantCount ?? info.participantCount;
    const isVideo = info.callType === "video";
    const Icon = isVideo ? VideocamIcon : CallIcon;

    const handleBannerClick = () => {
        setConfirmOpen(true);
    };

    const handleConfirmJoin = () => {
        setConfirmOpen(false);
        onJoin();
    };

    return (
        <>
            <Paper
                elevation={0}
                onClick={handleBannerClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleBannerClick(); }}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    px: 2,
                    py: 1,
                    mx: 1,
                    mb: 0.5,
                    borderRadius: 2,
                    bgcolor: "success.main",
                    color: "#fff",
                    cursor: "pointer",
                    transition: "opacity 160ms",
                    "&:hover": { opacity: 0.9 },
                    userSelect: "none",
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        bgcolor: "rgba(255,255,255,0.2)",
                        animation: "callPulse 1.6s ease-in-out infinite",
                        "@keyframes callPulse": {
                            "0%, 100%": { transform: "scale(1)" },
                            "50%": { transform: "scale(1.12)" },
                        },
                    }}
                >
                    <Icon sx={{ fontSize: 20, color: "#fff" }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={700} variant="body2" noWrap>
                        {isVideo ? "Cuộc gọi video đang diễn ra" : "Cuộc gọi thoại đang diễn ra"}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.85 }}>
                        {count > 0 ? `${count} người tham gia` : "Nhấn để tham gia"}
                    </Typography>
                </Box>
                <Typography variant="caption" fontWeight={700} sx={{ whiteSpace: "nowrap", bgcolor: "rgba(255,255,255,0.2)", px: 1, py: 0.4, borderRadius: 1 }}>
                    Tham gia
                </Typography>
            </Paper>

            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Icon color="success" />
                    Tham gia cuộc gọi?
                </DialogTitle>
                <Divider />
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        {isVideo ? "Cuộc gọi video nhóm" : "Cuộc gọi thoại nhóm"} đang diễn ra với{" "}
                        <strong>{count} người</strong>. Bạn có muốn tham gia không?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setConfirmOpen(false)} color="inherit" variant="outlined" size="small">
                        Để sau
                    </Button>
                    <Button onClick={handleConfirmJoin} color="success" variant="contained" size="small">
                        Tham gia ngay
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
