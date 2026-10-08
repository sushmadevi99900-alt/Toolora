import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800 disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400",
  secondary:
    "border border-(--border) bg-(--surface) text-(--foreground) hover:bg-(--surface-2) active:bg-(--surface-2) disabled:opacity-50",
  ghost: "text-brand-700 hover:bg-brand-50 active:bg-brand-100 dark:text-brand-300 dark:hover:bg-white/5 disabled:opacity-50",
  danger: "bg-danger-600 text-white hover:bg-danger-500 active:bg-danger-600 disabled:opacity-50",
};

const SIZES: Record<Size, string> = {
  sm: "min-h-[36px] px-3 text-sm",
  md: "min-h-[44px] px-5 text-[15px]",
  lg: "min-h-[52px] px-7 text-base",
};

interface Base {
  variant?: Variant;
  size?: Size;
  className?: string;
}

interface ButtonProps extends Base, React.ButtonHTMLAttributes<HTMLButtonElement> {}
interface LinkButtonProps extends Base {
  href: string;
  children: React.ReactNode;
  prefetch?: boolean;
}

const base = "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors select-none disabled:cursor-not-allowed [&_svg]:shrink-0";

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return <button className={cn(base, VARIANTS[variant], SIZES[size], className)} {...props} />;
}

export function ButtonLink({ variant = "primary", size = "md", className, href, children, prefetch }: LinkButtonProps) {
  return (
    <Link href={href} prefetch={prefetch} className={cn(base, VARIANTS[variant], SIZES[size], className)}>
      {children}
    </Link>
  );
}
