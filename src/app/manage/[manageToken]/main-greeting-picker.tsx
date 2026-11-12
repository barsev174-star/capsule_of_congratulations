"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { Contribution } from "@/lib/cards/types";
import { MAIN_GREETING_MAX_LENGTH } from "@/lib/contributions/limits";
import { setMainGreetingAction } from "./actions";
import { useModalFocus } from "./use-modal-focus";
import styles from "./main-greeting-picker.module.css";

type Props = {
  contributions: Contribution[];
  currentMainId: string | null;
  manageToken: string;
  onClose: () => void;
  onCreate: () => void;
  onShorten: (contribution: Contribution) => void;
  onSelected: (id: string) => void;
};

export const MainGreetingPicker = ({ contributions, currentMainId, manageToken, onClose, onCreate, onShorten, onSelected }: Props) => {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState(currentMainId);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const active = contributions.filter((item) => item.status === "visible");
  const search = query.trim().toLocaleLowerCase("ru");
  const matching = active.filter((item) => `${item.authorName} ${item.authorRole ?? ""} ${item.message}`.toLocaleLowerCase("ru").includes(search));
  const selected = active.find((item) => item.id === selectedId);
  const needsShortening = Boolean(selected && selected.message.length > MAIN_GREETING_MAX_LENGTH);
  const requestClose = () => { if (!isPending) onClose(); };
  useModalFocus(dialogRef, requestClose);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || selected.id === currentMainId || isPending) return;
    if (needsShortening) {
      onShorten(selected);
      return;
    }
    setError("");
    const formData = new FormData();
    formData.set("manageToken", manageToken);
    formData.set("contributionId", selected.id);
    startTransition(async () => {
      try {
        const result = await setMainGreetingAction(formData);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        router.refresh();
        onSelected(selected.id);
      } catch {
        setError("Не удалось выбрать главное поздравление. Попробуйте ещё раз.");
      }
    });
  };

  return createPortal(
    <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
      <div ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="main-greeting-picker-title" aria-describedby="main-greeting-picker-description" tabIndex={-1}>
        <header className={styles.header}>
          <div>
            <h2 id="main-greeting-picker-title">{currentMainId ? "Заменить главное поздравление" : "Выбрать главное поздравление"}</h2>
            <p id="main-greeting-picker-description">Выберите активное поздравление — оно появится в отдельном блоке открытки.</p>
          </div>
          <button type="button" className={styles.close} aria-label="Закрыть выбор главного поздравления" disabled={isPending} onClick={onClose}>×</button>
        </header>
        <form className={styles.form} onSubmit={submit}>
          <div className={styles.content}>
            <label className={styles.search}>
              <span>Поиск среди активных поздравлений</span>
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Имя, роль или текст" disabled={isPending} />
            </label>
            <fieldset className={styles.list} disabled={isPending}>
              <legend>Активные поздравления</legend>
              {matching.map((item) => (
                <label key={item.id} className={styles.option} data-selected={selectedId === item.id}>
                  <input type="radio" name="main-greeting" value={item.id} checked={selectedId === item.id} onChange={() => { setSelectedId(item.id); setError(""); }} />
                  <span className={styles.copy}>
                    <strong>{item.authorName}</strong>
                    {item.authorRole ? <span className={styles.meta}>{item.authorRole}</span> : null}
                    {item.id === currentMainId ? <span className={styles.meta}>Сейчас главное</span> : null}
                    <span className={styles.message}>{item.message}</span>
                    {item.message.length > MAIN_GREETING_MAX_LENGTH ? <span className={styles.meta}>Нужно сократить до {MAIN_GREETING_MAX_LENGTH} символов</span> : null}
                  </span>
                </label>
              ))}
            </fieldset>
            {!matching.length ? <p className={styles.empty}>{active.length ? "Ничего не найдено. Измените поисковый запрос." : "Активных поздравлений пока нет. Создайте главное поздравление."}</p> : null}
          </div>
          <footer className={styles.footer}>
            {error ? <p className={styles.error} role="alert">{error}</p> : null}
            <button type="button" className={styles.secondary} disabled={isPending} onClick={onCreate}>Создать главное поздравление</button>
            <button type="submit" className={styles.primary} disabled={isPending || !selected || selected.id === currentMainId} aria-busy={isPending}>
              {isPending ? "Сохраняем…" : needsShortening ? "Сократить и сделать главным" : "Сделать главным"}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body
  );
};
