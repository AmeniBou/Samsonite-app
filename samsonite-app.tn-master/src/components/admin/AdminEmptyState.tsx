import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type AdminEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  bordered?: boolean;
  className?: string;
};

const AdminEmptyState = ({ icon: Icon, title, description, bordered = false, className }: AdminEmptyStateProps) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center px-6 py-10 text-center",
      bordered && "rounded-lg border border-dashed border-gray-300 bg-white",
      className
    )}
  >
    <Icon className="h-10 w-10 text-gray-300" aria-hidden="true" />
    <p className="mt-3 text-sm font-semibold text-gray-700">{title}</p>
    <p className="mt-1 max-w-md text-xs leading-5 text-gray-500">{description}</p>
  </div>
);

export default AdminEmptyState;
