// src/components/TestimonialCard.tsx
export function TestimonialCard({
  quote,
  name,
  role,
}: {
  quote: string;
  name: string;
  role: string;
}) {
  return (
    <div className="rounded-2xl border p-5 shadow-sm">
      <div className="text-sm text-neutral-700">⭐⭐⭐⭐⭐ (4.9/5)</div>
      <p className="mt-3 text-neutral-900 leading-relaxed">“{quote}”</p>
      <div className="mt-4 text-sm">
        <div className="font-semibold">{name}</div>
        <div className="text-neutral-600">{role}</div>
      </div>
    </div>
  );
}
