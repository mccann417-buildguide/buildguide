import dynamicImport from "next/dynamic";

export const dynamic = "force-dynamic";

const PrintClient = dynamicImport(() => import("./PrintClient"), { ssr: false });

export default function Page() {
  return <PrintClient />;
}
