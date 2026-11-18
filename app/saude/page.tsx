// app/saude/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SaudeRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/saude/minha-saude");
  }, [router]);

  return null;
}