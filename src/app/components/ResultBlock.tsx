// src/app/components/ResultBlock.tsx
export function ResultBlock({
  title,
  children,
  tone = "neutral",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "neutral" | "good" | "warn" | "danger";
}) {
  const toneClass =
    tone === "good"
      ? "border-green-300 bg-green-50"
      : tone === "warn"
      ? "border-yellow-300 bg-yellow-50"
      : tone === "danger"
      ? "border-red-300 bg-red-50"
      : "border-neutral-200 bg-white";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="font-semibold">{title}</div>
      <div className="mt-2 text-sm text-neutral-800">{children}</div>
    </div>
  );
}
