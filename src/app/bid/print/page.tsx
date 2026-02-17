"use client";

import dynamic from "next/dynamic";
import React from "react";

const PrintClient = dynamic(() => import("./PrintClient"), { ssr: false });

export default function Page() {
  return <PrintClient />;
}
