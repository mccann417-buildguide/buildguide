// src/app/pay/page.tsx
import Link from "next/link";

export const runtime = "nodejs";

export default function PayPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-14 space-y-4">
      <h1 className="text-2xl font-semibold">Payment</h1>
      <p className="text-neutral-700">
        Your checkout is handled securely by Stripe. After payment, you’ll be returned to the Bid page.
      </p>

      <div className="rounded-2xl border p-4 bg-neutral-50 text-sm text-neutral-800">
        If you expected to see your unlocked report, go back to the Bid page and make sure your URL includes a
        <span className="font-semibold"> resultId</span>.
      </div>

      <Link
        href="/bid"
        className="inline-flex rounded-xl bg-black text-white px-4 py-2 text-sm font-medium hover:bg-black/90"
      >
        Go to Bid Check
      </Link>
    </main>
  );
}
