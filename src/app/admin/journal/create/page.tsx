"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminJournalCreateRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/journal");
  }, [router]);

  return (
    <div style={{ padding: "40px", textAlign: "center", fontFamily: "'Lora', Georgia, serif", color: "#39292a" }}>
      Redirecting to Journal CMS...
    </div>
  );
}
