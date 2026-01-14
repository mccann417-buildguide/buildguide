// src/components/SiteHeader.tsx
import Link from "next/link";
import Image from "next/image";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border overflow-hidden bg-white">
            <Image
              src="/icons/icon-192.png"
              alt="BuildGuide"
              width={36}
              height={36}
              className="h-9 w-9 object-cover"
              priority
            />
          </span>
          <span>BuildGuide</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-neutral-700">
          <Link href="/history" className="hover:text-neutral-900">
            History
          </Link>
          <Link href="/#how-it-works" className="hover:text-neutral-900">
            How it works
          </Link>
          <Link href="/#testimonials" className="hover:text-neutral-900">
            Reviews
          </Link>
          <Link href="/#pricing" className="hover:text-neutral-900">
            Pricing
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/history"
            className="hidden sm:inline-flex rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            History
          </Link>

          <Link
            href="/photo"
            className="rounded-xl bg-black text-white px-4 py-2 text-sm font-medium hover:bg-black/90"
          >
            Try Photo Check
          </Link>
        </div>
      </div>
    </header>
  );
}
