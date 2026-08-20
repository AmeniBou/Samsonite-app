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
  hideConfirm?: boolean;
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
  hideConfirm = false,
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
        <DialogContent className="max-w-[390px] gap-0 overflow-hidden rounded-lg border border-border bg-white p-0 shadow-2xl sm:rounded-lg">
          <div className="px-5 pb-4 pt-5">
            <div className="flex items-start gap-3">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${toneClasses.icon}`}>
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div className="min-w-0 pr-6">
                <DialogTitle className="text-sm font-bold leading-5 text-foreground">{title}</DialogTitle>
                <DialogDescription className="mt-1 text-xs leading-5 text-muted-foreground">
                  {description}
                </DialogDescription>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t border-border bg-muted/30 px-5 py-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={busy}
              className="min-w-24 border border-border bg-white px-4 py-2.5 text-xs font-bold transition-colors hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelLabel}
            </button>
            {!hideConfirm && (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={busy}
                className={`min-w-24 px-4 py-2.5 text-xs font-bold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${toneClasses.confirm}`}
              >
                {busy ? pendingLabel : confirmLabel}
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ConfirmDeleteDialog;
