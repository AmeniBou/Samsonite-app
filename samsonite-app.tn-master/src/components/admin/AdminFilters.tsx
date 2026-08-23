import type { InputHTMLAttributes, ReactNode } from "react";
import { Filter, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

export const adminFilterLabelClass =
  "space-y-1.5 text-xs font-semibold text-gray-600";

export const adminFilterControlClass =
  "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 shadow-sm transition-colors hover:border-gray-400 focus:border-gray-950 focus:outline-none focus:ring-2 focus:ring-gray-950/10";

export const adminFilterActionClass =
  "inline-flex h-9 items-center justify-center gap-2 rounded-full px-3 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-950/10";

export const adminFilterChipClass =
  "inline-flex h-9 items-center justify-center rounded-full border px-3 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-950/10";

type AdminFiltersPanelProps = {
  title: string;
  summary: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AdminFiltersPanel({ title, summary, actions, children, className }: AdminFiltersPanelProps) {
  return (
    <section className={cn("overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm", className)} aria-label={title}>
      <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-950 text-white" aria-hidden="true">
            <Filter className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-gray-950">{title}</h2>
            <p className="text-xs text-gray-500" aria-live="polite">{summary}</p>
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

type AdminFilterSearchProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
};

export function AdminFilterSearch({ label, className, ...props }: AdminFilterSearchProps) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
      <input
        type="search"
        aria-label={label}
        className={cn(adminFilterControlClass, "bg-gray-50 pl-10 pr-4 placeholder:font-normal placeholder:text-gray-400 hover:bg-white focus:bg-white", className)}
        {...props}
      />
    </div>
  );
}

type AdminFilterChipProps = {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
  activeClassName?: string;
};

export function AdminFilterChip({ active, children, onClick, activeClassName }: AdminFilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        adminFilterChipClass,
        active
          ? activeClassName || "border-gray-950 bg-gray-950 text-white"
          : "border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-950"
      )}
    >
      {children}
    </button>
  );
}

type AdminActiveFilterProps = {
  label: string;
  onRemove: () => void;
};

export function AdminActiveFilter({ label, onRemove }: AdminActiveFilterProps) {
  return (
    <span className="inline-flex h-8 items-center gap-1 rounded-full bg-gray-100 pl-3 pr-1 text-xs font-semibold text-gray-700">
      <span>{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-950 focus:outline-none focus:ring-2 focus:ring-gray-950/15"
        aria-label={`Supprimer le filtre ${label}`}
        title={`Supprimer le filtre ${label}`}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </span>
  );
}
