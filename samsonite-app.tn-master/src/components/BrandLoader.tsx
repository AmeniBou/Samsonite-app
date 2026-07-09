interface BrandLoaderProps {
  message?: string;
  fullScreen?: boolean;
  imageSrc?: string;
  imageAlt?: string;
  spinImage?: boolean;
  hideMessage?: boolean;
  className?: string;
}

const BrandLoader = ({
  message = "Chargement de l'experience Samsonite...",
  fullScreen = false,
  imageSrc,
  imageAlt = "Chargement",
  spinImage = false,
  hideMessage = false,
  className = "",
}: BrandLoaderProps) => {
  return (
    <div
      className={`${
        fullScreen ? "fixed inset-0 z-[120] bg-background/95 backdrop-blur-sm" : "py-16"
      } flex flex-col items-center justify-center ${className}`}
    >
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={imageAlt}
          className={`w-14 h-14 object-contain ${spinImage ? "animate-spin" : ""}`}
          onError={(event) => {
            event.currentTarget.src = "/placeholder.svg";
          }}
        />
      ) : (
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-samsonite-navy/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-samsonite-navy border-r-samsonite-red animate-spin" />
          <img
            src="/assets/samsonite-logo.png"
            alt="Samsonite"
            className="h-8 w-auto object-contain"
            onError={(event) => {
              event.currentTarget.src = "/placeholder.svg";
            }}
          />
        </div>
      )}
      {!hideMessage && (
        <p className="mt-4 text-xs tracking-[0.2em] uppercase text-muted-foreground">{message}</p>
      )}
    </div>
  );
};

export default BrandLoader;

