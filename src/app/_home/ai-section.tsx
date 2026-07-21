"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ai-section.module.css";

const draftText =
  "Хочу поздравить коллегу Машу с днем рождения. Она всегда всё помнит и напоминает, когда мы что-то забываем. Когда я пришел в команду, помогла разобраться и отвечала на миллион вопросов. Пожелать здоровья, путешествий, меньше срочных задач и больше времени на себя. Можно пошутить про календарь и дедлайны.";

const variants: Array<[string, string]> = [
  [
    "Аккуратно",
    "Маша, с днём рождения! Спасибо, что всегда помнишь о важном и вовремя напоминаешь нам. Когда я пришёл в команду, ты помогла мне освоиться и терпеливо отвечала на вопросы. Желаю здоровья, путешествий и больше времени на себя!"
  ],
  [
    "Теплее",
    "Маша, с днём рождения! Спасибо за твою внимательность, терпение и готовность помочь. Благодаря тебе мне было намного легче освоиться в команде. Желаю крепкого здоровья, ярких путешествий, меньше срочных задач и больше времени на себя!"
  ],
  [
    "Живее",
    "Маша, с днём рождения! Ты помнишь всё за себя и, кажется, ещё за половину команды. Спасибо, что помогла мне освоиться и выдержала поток вопросов. Желаю здоровья, путешествий и отпуска, который дедлайны не смогут найти в календаре!"
  ]
];

export function AiSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [chosen, setChosen] = useState(false);
  const autoRef = useRef<{ stopped: boolean; timers: number[] }>({ stopped: false, timers: [] });

  const stopAuto = () => {
    autoRef.current.stopped = true;
    autoRef.current.timers.forEach((timer) => window.clearTimeout(timer));
    autoRef.current.timers = [];
  };

  // Один спокойный проход Аккуратно → Теплее → Живее
  const scheduleCycle = () => {
    if (autoRef.current.stopped) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    autoRef.current.timers.push(
      window.setTimeout(() => {
        if (!autoRef.current.stopped) setActive(1);
      }, 1700)
    );
    autoRef.current.timers.push(
      window.setTimeout(() => {
        if (!autoRef.current.stopped) setActive(2);
      }, 3400)
    );
  };

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            observer.disconnect();
            scheduleCycle();
          }
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      stopAuto();
    };
  }, []);

  const runDemo = () => {
    stopAuto();
    setChosen(false);
    setActive(0);
    autoRef.current.stopped = false;
    scheduleCycle();
  };

  const selectTab = (index: number) => {
    stopAuto();
    setActive(index);
    setChosen(false);
  };

  return (
    <section id="ai" ref={sectionRef} className={styles.section} aria-labelledby="ai-title">
      <div className={styles.shell}>
        <div className={styles.heading}>
          <h2 id="ai-title" className={`${styles.title} text-balance`}>
            Не знаете, как написать красиво?
          </h2>
          <p className={styles.subtitle}>
            Опишите человека своими словами — ИИ-помощник предложит три готовых варианта поздравления.
          </p>
          <p className={styles.meta}>Сохраняет ваши мысли · предлагает три варианта · любой текст можно изменить</p>
        </div>

        <div className={`${styles.demo} js-motion-card`}>
          <article className={styles.source}>
            <span className={styles.label}>Ваш черновик</span>
            <p className={styles.sourceText}>{draftText}</p>
            <button type="button" className={styles.demoButton} onClick={runDemo}>
              Получить варианты <span aria-hidden="true">✦</span>
            </button>
          </article>

          <div className={styles.arrow} aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </div>

          <article className={styles.result}>
            <div className={styles.tabs} role="tablist" aria-label="Варианты поздравления">
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
              {chosen ? "Вариант выбран ✓" : "Выбрать этот вариант"}
            </button>
          </article>
        </div>
      </div>
    </section>
  );
}
