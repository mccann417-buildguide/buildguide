// src/components/PricingCard.tsx
import Link from "next/link";

export function PricingCard({
  name,
  price,
  tagline,
  features,
  ctaText,
  ctaHref,
  highlight,
}: {
  name: string;
  price: string;
  tagline: string;
  features: string[];
  ctaText: string;
  ctaHref: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-6 shadow-sm",
        highlight ? "border-black" : "",
      ].join(" ")}
    >
      <div className="flex items-baseline justify-between">
        <div className="text-lg font-semibold">{name}</div>
        {highlight ? (
          <span className="text-xs font-semibold rounded-full border border-black px-2 py-1">
            Most Popular
          </span>
        ) : null}
      </div>

      <div className="mt-2 text-3xl font-semibold">{price}</div>
      <div className="mt-2 text-sm text-neutral-700">{tagline}</div>

      <ul className="mt-5 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <span className="mt-[2px]">✅</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Link
        href={ctaHref}
        className={[
          "mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium",
          highlight
            ? "bg-black text-white hover:bg-black/90"
            : "border hover:bg-neutral-50",
        ].join(" ")}
      >
        {ctaText}
      </Link>
    </div>
  );
}
