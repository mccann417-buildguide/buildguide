// src/app/pay/cancel/page.tsx
import Link from "next/link";

export default function PayCancelPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-14 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Payment canceled</h1>
        <p className="mt-2 text-neutral-700">No worries — you can try again anytime.</p>
      </div>

      <div className="flex gap-3">
        <Link href="/bid" className="rounded-xl bg-black text-white px-4 py-2 text-sm font-medium hover:bg-black/90">
          Back to Bid Check
        </Link>
        <Link href="/" className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50">
          Home
        </Link>
      </div>
    </main>
  );
}
