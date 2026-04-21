import { cn } from "@/lib/utils";

type Variant = "default" | "violet" | "green" | "amber" | "red" | "blue";

const variants: Record<Variant, string> = {
  default: "bg-neutral-800 text-neutral-300",
  violet: "bg-violet-900/60 text-violet-300 border border-violet-800",
  green: "bg-green-900/60 text-green-300 border border-green-800",
  amber: "bg-amber-900/60 text-amber-300 border border-amber-800",
  red: "bg-red-900/60 text-red-300 border border-red-800",
  blue: "bg-blue-900/60 text-blue-300 border border-blue-800",
};

export function Badge({
  variant = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", variants[variant], className)}
      {...props}
    />
  );
}
