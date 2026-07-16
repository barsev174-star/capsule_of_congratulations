import type { ReactNode } from "react";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return <main style={{ width: "min(100% - 32px, 760px)", margin: "0 auto", padding: "40px 0 64px", color: "#3e2b23", lineHeight: 1.6 }}>{children}</main>;
}

