// src/app/components/ResultSection.tsx
import React from "react";

export function ResultSection({
  title,
  items,
  icon,
}: {
  title: string;
  items: string[];
  icon?: string;
}) {
  if (!items?.length) return null;

  return (
    <div className="rounded-2xl border p-4">
      <div className="font-semibold flex items-center gap-2">
        {icon ? <span>{icon}</span> : null}
        <span>{title}</span>
      </div>
      <ul className="mt-3 space-y-2 text-sm text-neutral-800">
        {items.map((x) => (
          <li key={x} className="flex gap-2">
            <span className="mt-[2px]">•</span>
            <span>{x}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
