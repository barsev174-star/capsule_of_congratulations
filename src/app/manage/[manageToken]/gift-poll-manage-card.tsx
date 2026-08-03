"use client";

import { useRef, useState } from "react";
import type { GiftPollWithOptions } from "@/lib/gift-polls/types";
import { closeGiftPollAction, reopenGiftPollAction } from "./actions";
import { ConfirmationDialog } from "./confirmation-dialog";
import { EditorSidebarCard } from "./editor-sidebar-card";
import { requestGiftPollSettings } from "./gift-poll-settings-form";
import styles from "./manage-page.module.css";

const CheckIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
const ClockIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>;
const EyeIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-5 9.5-5 9.5 5 9.5 5-3.4 5-9.5 5-9.5-5-9.5-5Z" /><circle cx="12" cy="12" r="2.5" /></svg>;
const ShieldIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8 20 6v5.2c0 5-3.3 8.5-8 10-4.7-1.5-8-5-8-10V6l8-3.2Z" /><path d="M12 8v6M9.8 11.8 12 14l2.2-2.2" /></svg>;

const pluralParticipants = (count: number) => count % 10 === 1 && count % 100 !== 11 ? "участника" : "участников";
const formatCloseDate = (value: string | null) => value ? new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "вручную";

export const GiftPollManageCard = ({ manageToken, poll, eligibleVoterCount }: { manageToken: string; poll: GiftPollWithOptions; eligibleVoterCount: number }) => {
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmReopen, setConfirmReopen] = useState(false);
  const closeFormRef = useRef<HTMLFormElement>(null);
  const reopenFormRef = useRef<HTMLFormElement>(null);

  const votersLabel = eligibleVoterCount > 0
    ? `${poll.totalVotes} из ${eligibleVoterCount} ${pluralParticipants(eligibleVoterCount)} проголосовали`
    : `Проголосовали: ${poll.totalVotes}`;

  return <EditorSidebarCard className={styles.giftManageCard} ariaLabel="Управление голосованием">
    <h2 className={styles.giftManageTitle}>Управление голосованием</h2>

    {poll.status === "open" ? <div className={styles.giftManageStatusOpen}>
      <strong><ClockIcon />Голосование открыто</strong>
      <span>{votersLabel}</span>
    </div> : poll.status === "closed" ? <div className={styles.giftManageStatus}>
      <strong><CheckIcon />Голосование завершено</strong>
      <span>{votersLabel}{poll.closedAt ? ` · закрыто ${formatCloseDate(poll.closedAt).toLowerCase()}` : ""}</span>
    </div> : <div className={styles.giftManageStatus}>
      <strong><ClockIcon />Черновик</strong>
      <span>Голосование ещё не открыто. Настройте варианты и откройте его в основном блоке.</span>
    </div>}

    <ul className={styles.giftManageRules}>
      <li><CheckIcon />Участник выбирает один вариант</li>
      <li><EyeIcon />Результаты видны только вам</li>
      <li><ShieldIcon />Получатель не увидит голосование</li>
    </ul>

    <div className={styles.giftManageFinish}>
      <div><strong>Завершение голосования</strong><span>Сейчас: {formatCloseDate(poll.closesAt)}</span></div>
      <button type="button" className={styles.giftManageEditButton} onClick={() => requestGiftPollSettings()}>Изменить</button>
    </div>

    {poll.status === "open" ? <>
      <form ref={closeFormRef} action={closeGiftPollAction} className={styles.giftPollHiddenForm} aria-hidden="true" tabIndex={-1}>
        <input type="hidden" name="manageToken" value={manageToken} />
        <input type="hidden" name="pollId" value={poll.id} />
      </form>
      <button type="button" className={styles.giftManageCloseButton} onClick={() => setConfirmClose(true)}>Закрыть голосование</button>
    </> : null}

    {poll.status === "closed" ? <>
      <form ref={reopenFormRef} action={reopenGiftPollAction} className={styles.giftPollHiddenForm} aria-hidden="true" tabIndex={-1}>
        <input type="hidden" name="manageToken" value={manageToken} />
        <input type="hidden" name="pollId" value={poll.id} />
      </form>
      <button type="button" className={styles.giftManageCloseButton} onClick={() => setConfirmReopen(true)}>Возобновить голосование</button>
    </> : null}

    {confirmClose ? <ConfirmationDialog
      title="Закрыть голосование?"
      description="Участники больше не смогут голосовать или менять свой выбор. Результаты сохранятся."
      onDismiss={() => setConfirmClose(false)}
      actions={[
        { label: "Отмена", tone: "secondary", onClick: () => setConfirmClose(false) },
        { label: "Закрыть голосование", tone: "primary", onClick: () => { setConfirmClose(false); closeFormRef.current?.requestSubmit(); } }
      ]}
    /> : null}

    {confirmReopen ? <ConfirmationDialog
      title="Возобновить голосование?"
      description={poll.totalVotes > 0 ? "Участники снова смогут голосовать и менять свой выбор. Варианты останутся зафиксированными." : "Участники снова смогут голосовать. Варианты можно будет изменить до первого голоса."}
      onDismiss={() => setConfirmReopen(false)}
      actions={[
        { label: "Отмена", tone: "secondary", onClick: () => setConfirmReopen(false) },
        { label: "Возобновить", tone: "primary", onClick: () => { setConfirmReopen(false); reopenFormRef.current?.requestSubmit(); } }
      ]}
    /> : null}
  </EditorSidebarCard>;
};
