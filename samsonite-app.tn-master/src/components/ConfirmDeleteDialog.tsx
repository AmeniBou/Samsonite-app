import { ReactNode, useState } from "react";
import { AlertTriangle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmDeleteDialogProps {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pendingLabel?: string;
  tone?: "danger" | "warning" | "info";
  disabled?: boolean;
  onConfirm: () => void | Promise<void>;
  children: (openDialog: () => void) => ReactNode;
}

const toneStyles = {
  danger: {
    icon: "bg-red-50 text-red-600",
    confirm: "bg-red-600 hover:bg-red-700",
  },
  warning: {
    icon: "bg-amber-50 text-amber-700",
    confirm: "bg-amber-600 hover:bg-amber-700",
  },
  info: {
    icon: "bg-blue-50 text-blue-700",
    confirm: "bg-blue-600 hover:bg-blue-700",
  },
};

const ConfirmDeleteDialog = ({
  title = "Confirmer la suppression",
  description = "Cette action est definitive. Voulez-vous continuer ?",
  confirmLabel = "Supprimer",
  cancelLabel = "Annuler",
  pendingLabel = "Suppression...",
  tone = "danger",
  disabled = false,
  onConfirm,
  children,
}: ConfirmDeleteDialogProps) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const toneClasses = toneStyles[tone];

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {children(() => {
        if (!disabled) setOpen(true);
      })}
      <Dialog open={open} onOpenChange={(nextOpen) => !busy && setOpen(nextOpen)}>
        <DialogContent className="max-w-md rounded-none border-0 p-0 sm:rounded-none">
          <div className="border-b border-border px-6 py-5">
            <div className="flex items-start gap-3">
              <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${toneClasses.icon}`}>
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <DialogTitle className="text-lg font-black uppercase tracking-tight">{title}</DialogTitle>
                <DialogDescription className="mt-2 text-sm leading-6 text-muted-foreground">
                  {description}
                </DialogDescription>
              </div>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-3 px-6 py-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={busy}
              className="border border-border px-5 py-3 text-sm font-black uppercase tracking-wide transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={busy}
              className={`px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${toneClasses.confirm}`}
            >
              {busy ? pendingLabel : confirmLabel}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ConfirmDeleteDialog;
