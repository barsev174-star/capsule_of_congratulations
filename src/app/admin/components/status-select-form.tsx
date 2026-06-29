"use client";

import { useState } from "react";
import styles from "../admin.module.css";

type StatusOption = {
  value: string;
  label: string;
};

type StatusSelectFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  cardId: string;
  currentStatus: string;
  options: StatusOption[];
};

export function StatusSelectForm({ action, cardId, currentStatus, options }: StatusSelectFormProps) {
  const [isPending, setIsPending] = useState(false);

  const handleChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const form = event.currentTarget.form;

    if (!form) {
      return;
    }

    setIsPending(true);
    await action(new FormData(form));
    setIsPending(false);
  };

  return (
    <form action={action} className={styles.actionForm}>
      <input type="hidden" name="cardId" value={cardId} />
      <select
        name="status"
        defaultValue={currentStatus}
        className={styles.statusSelect}
        style={{ minWidth: "auto", opacity: isPending ? 0.6 : 1 }}
        onChange={handleChange}
        disabled={isPending}
      >
        {options.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </form>
  );
}
