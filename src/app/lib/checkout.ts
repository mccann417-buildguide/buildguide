export async function startCheckout(kind: "one_report" | "project_pass_14d" | "home_plus", paths?: {
  successPath?: string;
  cancelPath?: string;
}) {
  const res = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind,
      successPath: paths?.successPath ?? "/",
      cancelPath: paths?.cancelPath ?? "/",
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw new Error(data?.error || "Checkout failed");
  if (!data?.url) throw new Error("Missing checkout url");

  window.location.href = data.url;
}
