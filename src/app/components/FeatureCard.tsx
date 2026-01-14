// src/components/FeatureCard.tsx
import React from "react";

export function FeatureCard({
  title,
  desc,
  bullets,
}: {
  title: string;
  desc: string;
  bullets: string[];
}) {
  return (
    <div className="rounded-2xl border p-5 shadow-sm">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-neutral-700">{desc}</p>
      <ul className="mt-4 space-y-2 text-sm text-neutral-800">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="mt-[2px]">✅</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
