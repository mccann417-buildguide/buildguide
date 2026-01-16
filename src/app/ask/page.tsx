// src/app/ask/page.tsx
import React, { Suspense } from "react";
import Link from "next/link";
import AskClient from "./AskClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function Loading() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-14 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Ask a Question</h1>
          <p className="mt-1 text-neutral-700">Loading…</p>
        </div>
        <Link
          href="/"
          className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50"
        >
          Back home
        </Link>
      </div>

      <div className="rounded-2xl border p-6 text-sm text-neutral-700">
        Loading Ask…
      </div>
    </main>
  );
}

export default function AskPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AskClient />
    </Suspense>
  );
}
