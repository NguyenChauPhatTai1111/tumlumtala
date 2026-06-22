import { Suspense, lazy, useCallback, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSnackbar, SnackbarProvider } from "notistack";
import { setNotifyFn } from "@/utils/snackbar";
import { ConfirmContext, type ConfirmFn, type ConfirmOptions } from "@context/confirm.context";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

const MessengerPage = lazy(() => import("@pages/messenger/MessengerPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function SnackbarBridge() {
  const { enqueueSnackbar } = useSnackbar();
  setNotifyFn(({ message, type }) => {
    enqueueSnackbar(message, { variant: type === "error" ? "error" : "success" });
  });
  return null;
}

type PendingConfirm = {
  options: ConfirmOptions;
  resolve: (v: boolean) => void;
};

function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const resolveRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setPending({ options, resolve });
    });
  }, []);

  const handleClose = (result: boolean) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={!!pending} onClose={() => handleClose(false)} maxWidth="xs" fullWidth>
        {pending && (
          <>
            <DialogTitle>{pending.options.title ?? "Xác nhận"}</DialogTitle>
            {pending.options.description && (
              <DialogContent>
                <DialogContentText>{pending.options.description}</DialogContentText>
              </DialogContent>
            )}
            <DialogActions>
              <Button onClick={() => handleClose(false)} color="inherit">
                {pending.options.cancelText ?? "Hủy"}
              </Button>
              <Button
                onClick={() => handleClose(true)}
                color={pending.options.variant === "danger" ? "error" : "primary"}
                variant="contained"
                autoFocus
              >
                {pending.options.confirmText ?? "Xác nhận"}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export default function MessengerPageWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <SnackbarProvider maxSnack={3} autoHideDuration={3000}>
        <SnackbarBridge />
        <ConfirmProvider>
          <Suspense fallback={null}>
            <MessengerPage />
          </Suspense>
        </ConfirmProvider>
      </SnackbarProvider>
    </QueryClientProvider>
  );
}
