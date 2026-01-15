// src/app/question/page.tsx

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import React, { Suspense } from "react";
import QuestionClient from "./QuestionClient";

export default function QuestionPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-4xl px-6 py-14">
          <div className="rounded-2xl border p-6 text-sm text-neutral-700">
            Loading…
          </div>
        </main>
      }
    >
      <QuestionClient />
    </Suspense>
  );
}
