// src/app/pay/page.ts
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function PayPage() {
  redirect("/pricing");
}
