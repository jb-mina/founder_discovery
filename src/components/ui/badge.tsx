import { cn } from "@/lib/utils";

type Variant = "default" | "violet" | "green" | "amber" | "red" | "blue";

const variants: Record<Variant, string> = {
  default: "bg-neutral-100 text-neutral-700",
  violet: "bg-violet-100 text-violet-700 border border-violet-200",
  green: "bg-green-100 text-green-700 border border-green-200",
  amber: "bg-amber-100 text-amber-700 border border-amber-200",
  red: "bg-red-100 text-red-700 border border-red-200",
  blue: "bg-blue-100 text-blue-700 border border-blue-200",
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
