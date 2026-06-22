import { notify } from "@/utils/snackbar";

type NotificationParams = {
  type?: "success" | "error" | "progress";
  message?: string;
  description?: string;
};

export const useNotification = () => {
  const open = (params: NotificationParams) => {
    const type = params.type === "progress" ? "success" : (params.type ?? "success");
    notify(params.message ?? "", type, params.description);
  };
  return { open };
};
