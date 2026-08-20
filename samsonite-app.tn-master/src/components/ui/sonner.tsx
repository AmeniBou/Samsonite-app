import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          success: "!border-emerald-200 !bg-emerald-50 !text-emerald-800",
          error: "!border-red-200 !bg-red-50 !text-red-700",
          title: "pr-7",
          description: "group-[.toast]:text-muted-foreground",
          closeButton:
            "!absolute !right-2 !top-2 !m-0 !flex !h-5 !w-5 !items-center !justify-center !rounded-full !border-0 !bg-transparent !text-current !opacity-60 hover:!bg-black/5 hover:!opacity-100",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
