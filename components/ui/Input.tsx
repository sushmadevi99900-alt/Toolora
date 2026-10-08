import { cn } from "@/lib/utils";

const field =
  "w-full rounded-xl border border-(--border) bg-(--surface) px-4 text-[15px] text-(--foreground) placeholder:text-(--muted)/70 transition-colors hover:border-brand-300 focus:border-brand-500 disabled:opacity-60 dark:hover:border-white/20";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(field, "min-h-[44px]", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(field, "min-h-[160px] py-3 leading-relaxed", className)} {...props} />;
}

export function FieldLabel({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-(--foreground)">
      {children}
      {required && (
        <span aria-hidden="true" className="ml-1 text-danger-600">
          *
        </span>
      )}
    </label>
  );
}
