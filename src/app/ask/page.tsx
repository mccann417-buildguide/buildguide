// src/app/ask/page.tsx

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import AskClient from "./AskClient";

export default function AskPage() {
  return <AskClient />;
}
