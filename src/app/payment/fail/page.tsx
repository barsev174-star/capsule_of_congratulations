"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function PaymentFailPage() {
  const [manageToken, setManageToken] = useState<string | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setManageToken(window.sessionStorage.getItem("slovesto_payment_manage_token")), 0);
    return () => window.clearTimeout(timer);
  }, []);
  return <main style={{ maxWidth: 640, margin: "80px auto", padding: 24 }}>
    <h1>Оплата не завершена</h1>
    <p>Открытка сохранена. Вы сможете вернуться и повторить оплату.</p>
    {manageToken ? <Link href={`/manage/${manageToken}`}>Вернуться к открытке</Link> : null}
  </main>;
}
