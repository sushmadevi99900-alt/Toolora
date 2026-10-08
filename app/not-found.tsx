import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-20 text-center sm:px-6">
      <p aria-hidden="true" className="text-6xl font-extrabold tracking-tight text-brand-600 dark:text-brand-400">
        404
      </p>
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-(--foreground) sm:text-3xl">
        Tool not found
      </h1>
      <p className="mt-2 max-w-md text-[15px] leading-relaxed text-(--muted)">
        The page you are looking for does not exist or may have moved. Try one of these instead:
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <ButtonLink href="/tools">All Tools</ButtonLink>
        <ButtonLink href="/categories" variant="secondary">Categories</ButtonLink>
        <ButtonLink href="/" variant="ghost">Homepage</ButtonLink>
      </div>
      <p className="mt-6 text-sm text-(--muted)">
        Looking for something specific? <Link href="/search" className="font-semibold text-brand-700 hover:underline dark:text-brand-300">Search tools</Link>
      </p>
    </div>
  );
}
