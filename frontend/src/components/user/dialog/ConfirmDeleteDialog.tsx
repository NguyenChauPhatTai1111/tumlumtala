import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  name?: string;
  loading?: boolean;
}

export const ConfirmDeleteDialog = ({ open, onClose, onConfirm, name, loading }: Props) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle>Xác nhận xóa</DialogTitle>
    <DialogContent>
      <DialogContentText>
        Bạn có chắc muốn xóa người dùng <strong>{name}</strong>?
        Hành động này không thể hoàn tác.
      </DialogContentText>
    </DialogContent>
    <DialogActions sx={{ p: 2 }}>
      <Button onClick={onClose} disabled={loading}>Hủy</Button>
      <Button variant="contained" color="error" onClick={onConfirm} disabled={loading}>
        {loading ? "Đang xóa..." : "Xóa"}
      </Button>
    </DialogActions>
  </Dialog>
);
