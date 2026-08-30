"use client";

import { useState } from "react";
import styles from "./ai-section.module.css";

const draftText =
  "Хочу поздравить коллегу Машу с днем рождения. Она всегда всё помнит, напоминает когда мы что-то забываем. Когда я пришел в команду помогла разобраться, отвечала на миллион вопросов. Пожелать здоровья, путешествий, меньше срочных задач и больше времени на себя. Можно пошутить про календарь и дедлайны.";

// Основной текст создаётся первым; другие версии пользователь запрашивает при необходимости.
const variants: Array<[string, string]> = [
  [
    "Готовый текст",
    "Маша, с днём рождения! Спасибо, что помнишь о важном и всегда готова помочь. Когда я пришёл в команду, ты помогла мне освоиться и терпеливо отвечала на вопросы. Желаю здоровья, путешествий и больше времени на себя!"
  ],
  [
    "+ Теплее",
    "Маша, с днём рождения! Спасибо за твою внимательность, терпение и поддержку. Благодаря тебе мне было легче освоиться в команде. Желаю здоровья, ярких путешествий, меньше срочных задач и больше времени на себя!"
  ],
  [
    "+ Творческий",
    "Маша, с днём рождения! Ты помнишь всё за себя и, кажется, ещё за половину команды. Спасибо, что помогла мне освоиться. Желаю здоровья, путешествий и отпуска, который дедлайны не смогут найти в календаре!"
  ]
];

export function AiSection() {
  const [active, setActive] = useState(0);
  const [chosen, setChosen] = useState(false);

  const runDemo = () => {
    setChosen(false);
    setActive(0);
  };

  const selectTab = (index: number) => {
    setActive(index);
    setChosen(false);
  };

  return (
    <section id="ai" className={styles.section} aria-labelledby="ai-title">
      <div className={styles.shell}>
        <div className={styles.heading}>
          <h2 id="ai-title" className={`${styles.title} text-balance`}>
            Не знаете, как написать красиво?
          </h2>
          <p className={styles.subtitle}>
            Опишите человека своими словами — ИИ-помощник соберёт один готовый текст поздравления.
          </p>
          <p className={styles.meta}>Сохраняет ваши мысли · выдаёт один текст · теплее или творческий — по вашему запросу</p>
        </div>

        <div className={`${styles.demo} js-motion-card`}>
          <article className={styles.source}>
            <span className={styles.sticker}>Ваш черновик</span>
            <p className={styles.sourceText}>{draftText}</p>
            <button type="button" className={styles.demoButton} onClick={runDemo}>
              Собрать поздравление <span aria-hidden="true">✦</span>
            </button>
          </article>

          <div className={styles.arrow} aria-hidden="true">
            <svg viewBox="0 0 120 60" fill="none" className={styles.arrowLine}>
              <path d="M6 46 C 38 14, 82 14, 110 38" pathLength={1} className={styles.arrowPath} />
              <path d="M104 30 L 112 39 L 101 43" pathLength={1} className={styles.arrowPath} />
            </svg>
            <span className={styles.pencil} />
          </div>

          <article className={styles.result}>
            <span className={styles.resultHeart} aria-hidden="true">♥</span>
            <div className={styles.tabs} role="tablist" aria-label="Версии поздравления по запросу">
              {variants.map(([label], index) => (
                <button
                  key={label}
                  type="button"
                  role="tab"
                  aria-selected={active === index}
                  className={`${styles.tab} ${active === index ? styles.tabActive : ""}`}
                  onClick={() => selectTab(index)}
                >
                  {label}
                </button>
              ))}
            </div>
            <p key={active} role="tabpanel" className={styles.resultText}>
              {variants[active][1]}
            </p>
            <button
              type="button"
              className={`${styles.select} ${chosen ? styles.selectChosen : ""}`}
              onClick={() => setChosen(true)}
            >
              {chosen ? "Текст вставлен ✓" : "Вставить в поздравление ♡"}
            </button>
          </article>
        </div>
      </div>
    </section>
  );
}
