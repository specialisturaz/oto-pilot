import { cn } from "@/lib/utils";

interface SpinnerProps {
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show loading text */
  showText?: boolean;
  /** Custom loading text (defaults to "Yukleniyor...") */
  text?: string;
}

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-3",
};

export function Spinner({
  className,
  size = "md",
  showText = false,
  text = "Yukleniyor...",
}: SpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div
        className={cn(
          "animate-spin rounded-full border-muted-foreground/25 border-t-primary",
          sizeClasses[size]
        )}
        role="status"
        aria-label={text}
      />
      {showText && (
        <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
      )}
    </div>
  );
}
