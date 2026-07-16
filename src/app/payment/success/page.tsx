"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function PaymentSuccessPage() {
  const [state, setState] = useState<"PENDING" | "PAID" | "UNKNOWN">("PENDING");
  const [manageToken, setManageToken] = useState<string | null>(null);

  useEffect(() => {
    const token = window.sessionStorage.getItem("slovesto_payment_manage_token");
    const initial = window.setTimeout(() => {
      setManageToken(token);
      if (!token) setState("UNKNOWN");
    }, 0);
    if (!token) return () => window.clearTimeout(initial);
    let active = true;
    const check = async () => {
      const response = await fetch(`/api/cards/${encodeURIComponent(token)}/status`, { cache: "no-store" });
      const body = await response.json().catch(() => null) as { status?: { paymentStatus?: string } } | null;
      if (!active) return;
      if (body?.status?.paymentStatus === "PAID") { setState("PAID"); return; }
      window.setTimeout(check, 2500);
    };
    void check();
    return () => { active = false; window.clearTimeout(initial); };
  }, []);

  return <main style={{ maxWidth: 640, margin: "80px auto", padding: 24 }}>
    <h1>{state === "PAID" ? "Оплата прошла" : "Проверяем оплату…"}</h1>
    <p>{state === "PAID" ? "Вернитесь к управлению открыткой, чтобы продолжить финальную подготовку и передать её получателю." : "Подтверждение от платёжного сервиса может занять несколько секунд."}</p>
    {manageToken ? <Link href={`/manage/${manageToken}`}>Вернуться к открытке</Link> : null}
  </main>;
}
