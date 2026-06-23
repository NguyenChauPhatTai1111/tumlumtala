import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useEffect, useRef, useState } from "react";
import { updateMe, uploadAvatar } from "@api/userApi";
import { useCurrentUser, currentUserCache } from "@hooks/user/useCurrentUser";

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
}

export const ProfileDialog = ({ open, onClose }: ProfileDialogProps) => {
  const { user } = useCurrentUser();

  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");

  // avatar state
  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && user) {
      setFullname(user.fullname ?? "");
      setEmail(user.email ?? "");
      setPreviewURL(user.avatar ?? null);
      setPendingFile(null);
      setSuccess(false);
      setError(null);
    }
  }, [open, user]);

  // cleanup object URL on unmount / change
  useEffect(() => {
    return () => {
      if (previewURL && previewURL.startsWith("blob:")) {
        URL.revokeObjectURL(previewURL);
      }
    };
  }, [previewURL]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Ảnh quá lớn, tối đa 5MB");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Chỉ hỗ trợ JPEG, PNG và WebP");
      return;
    }

    if (previewURL?.startsWith("blob:")) URL.revokeObjectURL(previewURL);
    setPreviewURL(URL.createObjectURL(file));
    setPendingFile(file);
    setError(null);
    // reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleRemoveAvatar = () => {
    if (previewURL?.startsWith("blob:")) URL.revokeObjectURL(previewURL);
    setPreviewURL(null);
    setPendingFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError(null);

    try {
      let updated = user!;

      // 1. Upload avatar nếu có file mới
      if (pendingFile) {
        setUploadingAvatar(true);
        updated = await uploadAvatar(pendingFile);
        setUploadingAvatar(false);
        currentUserCache.set(updated);
        setPendingFile(null);
        setPreviewURL(updated.avatar ?? null);
      }

      // 2. Cập nhật profile nếu tên/email thay đổi
      const nameChanged = fullname.trim() !== (user?.fullname ?? "");
      const emailChanged = email.trim() !== (user?.email ?? "");
      if (nameChanged || emailChanged) {
        updated = await updateMe({
          fullname: fullname.trim() || undefined,
          email: email.trim() || undefined,
        });
        currentUserCache.set(updated);
      }

      setSuccess(true);
    } catch (err: unknown) {
      setUploadingAvatar(false);
      const msg = err instanceof Error ? err.message : "Cập nhật thất bại";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const initials = ((user?.fullname || user?.email) ?? "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isBusy = saving || uploadingAvatar;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
        <Typography variant="h6" fontWeight={700}>Hồ sơ của tôi</Typography>
        <IconButton size="small" onClick={onClose} disabled={isBusy}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {/* Avatar picker */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, mb: 3 }}>
          <Box sx={{ position: "relative", flexShrink: 0 }}>
            <Avatar
              src={previewURL ?? undefined}
              sx={{ width: 80, height: 80, bgcolor: "primary.main", fontSize: 28 }}
            >
              {!previewURL && initials}
            </Avatar>

            {/* overlay khi đang upload */}
            {uploadingAvatar && (
              <Box sx={{
                position: "absolute", inset: 0, borderRadius: "50%",
                bgcolor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <CircularProgress size={24} sx={{ color: "#fff" }} />
              </Box>
            )}

            {/* nút chọn ảnh */}
            {!uploadingAvatar && (
              <Tooltip title="Chọn ảnh">
                <IconButton
                  size="small"
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    position: "absolute", bottom: -4, right: -4,
                    bgcolor: "primary.main", color: "#fff",
                    width: 28, height: 28,
                    "&:hover": { bgcolor: "primary.dark" },
                  }}
                >
                  <PhotoCameraIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={600} noWrap>
              {user?.fullname || user?.email}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textTransform: "capitalize", mb: 0.5 }}>
              {user?.role}
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<PhotoCameraIcon sx={{ fontSize: 14 }} />}
                onClick={() => fileInputRef.current?.click()}
                disabled={isBusy}
                sx={{ fontSize: 12, py: 0.4 }}
              >
                {pendingFile ? "Đổi ảnh" : "Tải ảnh lên"}
              </Button>
              {previewURL && (
                <Button
                  size="small"
                  variant="text"
                  color="error"
                  startIcon={<DeleteOutlineIcon sx={{ fontSize: 14 }} />}
                  onClick={handleRemoveAvatar}
                  disabled={isBusy}
                  sx={{ fontSize: 12, py: 0.4 }}
                >
                  Xóa ảnh
                </Button>
              )}
            </Box>
            <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: "block" }}>
              JPEG, PNG, WebP · Tối đa 5MB
            </Typography>
          </Box>
        </Box>

        {/* hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        <Divider sx={{ mb: 2.5 }} />

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(false)}>
            Cập nhật hồ sơ thành công!
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            <TextField
              label="Họ và tên"
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              fullWidth
              size="small"
              disabled={isBusy}
            />
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              size="small"
              disabled={isBusy}
            />

            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, pt: 0.5 }}>
              <Button variant="outlined" onClick={onClose} disabled={isBusy}>
                Hủy
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isBusy}
                startIcon={isBusy ? <CircularProgress size={14} color="inherit" /> : null}
              >
                {uploadingAvatar ? "Đang tải ảnh..." : saving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </Box>
          </Stack>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
