import FingerprintIcon from "@mui/icons-material/Fingerprint";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Divider,
    Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useState } from "react";
import { useCurrentUser } from "@hooks/common/useCurrentUser";
import { registerPasskey } from "@/services/webAuthnService";

export default function SecuritySettingsPage() {
    const { data: currentUser, isLoading } = useCurrentUser();
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const handleRegisterPasskey = async () => {
        if (!currentUser?.uuid) return;
        setStatus("loading");
        setErrorMsg("");
        try {
            await registerPasskey(String(currentUser.uuid));
            setStatus("success");
        } catch (err: unknown) {
            const e = err as { name?: string; message?: string };
            if (e.name === "NotAllowedError") {
                setErrorMsg("Đăng ký bị từ chối hoặc hết thời gian. Vui lòng thử lại.");
            } else if (e.name === "InvalidStateError") {
                setErrorMsg("Thiết bị này đã được đăng ký trước đó.");
            } else {
                setErrorMsg(
                    e.message ?? "Đăng ký thất bại. Trình duyệt có thể không hỗ trợ WebAuthn.",
                );
            }
            setStatus("error");
        }
    };

    if (isLoading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 600, mx: "auto", py: 4, px: 2 }}>
            <Typography variant="h5" fontWeight={700} gutterBottom>
                Bảo mật tài khoản
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Quản lý các phương thức đăng nhập và bảo mật cho tài khoản của bạn.
            </Typography>

            <Card
                elevation={0}
                sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 3,
                    overflow: "hidden",
                }}
            >
                <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                        <Box
                            sx={(theme) => ({
                                width: 48,
                                height: 48,
                                borderRadius: 2,
                                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#000",
                                flexShrink: 0,
                            })}
                        >
                            <FingerprintIcon sx={{ fontSize: 28 }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle1" fontWeight={700}>
                                Face ID / Passkey
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                Đăng nhập nhanh bằng nhận diện khuôn mặt, vân tay, hoặc PIN thiết bị
                                mà không cần nhập mật khẩu. Hoạt động trên iPhone, Android, Mac và
                                Windows Hello.
                            </Typography>
                        </Box>
                    </Box>

                    <Divider sx={{ my: 2.5 }} />

                    {status === "success" && (
                        <Alert
                            severity="success"
                            icon={<CheckCircleOutlineIcon />}
                            sx={{ mb: 2, borderRadius: 2 }}
                        >
                            Thiết bị này đã được đăng ký thành công! Bạn có thể dùng Face ID để đăng
                            nhập lần sau.
                        </Alert>
                    )}

                    {status === "error" && (
                        <Alert
                            severity="error"
                            sx={{ mb: 2, borderRadius: 2 }}
                            onClose={() => setStatus("idle")}
                        >
                            {errorMsg}
                        </Alert>
                    )}

                    <Button
                        variant="contained"
                        size="large"
                        startIcon={
                            status === "loading" ? (
                                <CircularProgress size={18} color="inherit" />
                            ) : (
                                <FingerprintIcon />
                            )
                        }
                        disabled={status === "loading" || !currentUser}
                        onClick={handleRegisterPasskey}
                        sx={(theme) => ({
                            borderRadius: 2,
                            textTransform: "none",
                            color: "#000",
                            px: 3,
                            py: 1.25,
                            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                            boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.35)}`,
                            "&:hover": {
                                boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.5)}`,
                            },
                            "&.Mui-disabled": {
                                color: "#000",
                                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                            },
                        })}
                    >
                        {status === "loading" ? "Đang xử lý..." : "Thiết lập Face ID / Passkey"}
                    </Button>

                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mt: 1.5 }}
                    >
                        Bạn có thể đăng ký nhiều thiết bị. Trình duyệt sẽ yêu cầu xác nhận danh tính
                        bằng sinh trắc học.
                    </Typography>
                </CardContent>
            </Card>
        </Box>
    );
}
