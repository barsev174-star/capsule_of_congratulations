"use client";

import { useState } from "react";
import { LegalDocumentModal } from "@/components/legal/legal-document-modal";

type PaymentCheckoutButtonProps = {
  manageToken: string;
  className: string;
  containerClassName?: string;
  fieldClassName?: string;
  consentClassName?: string;
  messageClassName?: string;
  collapsible?: boolean;
  revealLabel?: string;
};

export function PaymentCheckoutButton({
  manageToken,
  className,
  containerClassName,
  fieldClassName,
  consentClassName,
  messageClassName,
  collapsible = false,
  revealLabel = "Перейти к оплате"
}: PaymentCheckoutButtonProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [receiptEmail, setReceiptEmail] = useState("");
  const [offerAccepted, setOfferAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!collapsible);

  const startPayment = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      if (!offerAccepted || !privacyAccepted) {
        setMessage("Подтвердите принятие документов перед оплатой.");
        return;
      }
      const response = await fetch(`/api/cards/${encodeURIComponent(manageToken)}/payment/checkout`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ receiptEmail, offerAccepted, privacyAccepted }) });
      const body = await response.json() as { ok?: boolean; message?: string; checkout?: { confirmationUrl?: string } };
      if (!response.ok || !body.checkout?.confirmationUrl) {
        setMessage(body.message ?? "Не удалось начать оплату. Попробуйте ещё раз.");
        return;
      }
      window.sessionStorage.setItem("slovesto_payment_manage_token", manageToken);
      window.location.assign(body.checkout.confirmationUrl);
    } catch {
      setMessage("Не удалось начать оплату. Проверьте подключение и попробуйте ещё раз.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={containerClassName}>
      {!isExpanded ? (
        <button type="button" className={className} onClick={() => setIsExpanded(true)}>
          {revealLabel}
        </button>
      ) : (
        <>
      <label className={fieldClassName}>
        Email для чека
        <input type="email" value={receiptEmail} onChange={(event) => setReceiptEmail(event.target.value)} required />
      </label>
      <label className={consentClassName}>
        <input type="checkbox" checked={offerAccepted} onChange={(event) => setOfferAccepted(event.target.checked)} />
        <span>Я принимаю <LegalDocumentModal document="offer">публичную оферту</LegalDocumentModal> и <LegalDocumentModal document="refunds">правила возврата</LegalDocumentModal>.</span>
      </label>
      <label className={consentClassName}>
        <input type="checkbox" checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} />
        <span>Я ознакомился с <LegalDocumentModal document="privacy">политикой обработки персональных данных</LegalDocumentModal> и даю согласие на обработку данных, необходимых для оплаты и оказания услуги.</span>
      </label>
      <button type="button" className={className} onClick={startPayment} disabled={isLoading || !offerAccepted || !privacyAccepted}>
        {isLoading ? "Переходим к оплате…" : "Оплатить 399 ₽"}
      </button>
      {message ? <p className={messageClassName} role="alert">{message}</p> : null}
        </>
      )}
    </div>
  );
}
