// src/components/Section.tsx
import React from "react";

export function Section({
  id,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto max-w-6xl px-6 py-14">
      <div className="max-w-2xl">
        {eyebrow ? (
          <div className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
            {eyebrow}
          </div>
        ) : null}
        <h2 className="mt-2 text-2xl md:text-3xl font-semibold">{title}</h2>
        {subtitle ? <p className="mt-3 text-neutral-700">{subtitle}</p> : null}
      </div>
      {children ? <div className="mt-8">{children}</div> : null}
    </section>
  );
}
