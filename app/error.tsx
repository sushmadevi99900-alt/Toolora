"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/Button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Phase 2: forward to an error-reporting service.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-20 text-center sm:px-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-(--foreground) sm:text-3xl">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-[15px] text-(--muted)">
        An unexpected error occurred. Please try again — your data has not been sent anywhere.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="secondary">Back to homepage</ButtonLink>
      </div>
    </div>
  );
}
