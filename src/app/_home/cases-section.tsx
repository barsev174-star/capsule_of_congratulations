import styles from "./cases-section.module.css";

/* Предметные мини-иллюстрации в едином тёплом стиле:
   бумажные поверхности, терракотовые акценты, мягкие коричневые контуры. */

function CakeIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {/* свеча */}
      <rect x="22.7" y="8.5" width="2.6" height="9" rx="1.3" fill="var(--accent)" />
      <path d="M24 2.5c1.7 1.9 2.1 3.4 1.1 4.9-0.7 1-2 1-2.6-.1-0.7-1.3 0-3 1.5-4.8z" fill="#E9A94B" />
      {/* верхний ярус */}
      <rect x="15" y="19" width="18" height="9" rx="2.5" fill="var(--surface-strong)" stroke="var(--accent)" strokeWidth="1.6" />
      <path d="M15 23.5c2.2 2.2 4 2.2 6 0 2 2.2 4 2.2 6 0 2 2.2 3.8 2.2 6 0" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" />
      {/* нижний ярус */}
      <rect x="10" y="28" width="28" height="10" rx="2.5" fill="var(--accent-light)" stroke="var(--accent)" strokeWidth="1.6" />
      <path d="M10 32.5c2.6 2.4 4.7 2.4 7 0 2.3 2.4 4.7 2.4 7 0 2.3 2.4 4.4 2.4 7 0 2.6 2.4 4.4 2.4 7 0" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" />
      {/* блюдце */}
      <rect x="7" y="38.5" width="34" height="3" rx="1.5" fill="var(--text)" opacity="0.28" />
    </svg>
  );
}

function BookFlowerIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {/* раскрытая книга */}
      <path
        d="M24 14.5c-4.2-3-9.3-3.6-14-2v22.5c4.7-1.6 9.8-1 14 2 4.2-3 9.3-3.6 14-2V12.5c-4.7-1.6-9.8-1-14 2z"
        fill="var(--surface-strong)"
        stroke="var(--text)"
        strokeOpacity="0.55"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M24 14.5V37" stroke="var(--text)" strokeOpacity="0.35" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M14 19.5c2.4-.6 4.8-.4 7 .6M14 24.5c2.4-.6 4.8-.4 7 .6" stroke="var(--text)" strokeOpacity="0.3" strokeWidth="1.3" strokeLinecap="round" />
      {/* цветок */}
      <g transform="translate(33 12)">
        <circle cx="0" cy="-4.4" r="2.5" fill="var(--accent-soft)" />
        <circle cx="4.2" cy="-1.4" r="2.5" fill="var(--accent-soft)" />
        <circle cx="2.6" cy="3.8" r="2.5" fill="var(--accent-soft)" />
        <circle cx="-2.6" cy="3.8" r="2.5" fill="var(--accent-soft)" />
        <circle cx="-4.2" cy="-1.4" r="2.5" fill="var(--accent-soft)" />
        <circle cx="0" cy="0" r="2.1" fill="#E9A94B" />
      </g>
      <path d="M31 18.5c-1.5 2.5-2 5-1.5 7.5" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function TeamIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {/* боковые фигуры */}
      <circle cx="10.5" cy="17" r="4.6" fill="var(--accent-soft)" />
      <path d="M2.8 33.5c.6-4.8 3.7-7.6 7.7-7.6 2.4 0 4.5 1 5.9 2.7" fill="var(--accent-soft)" />
      <circle cx="37.5" cy="17" r="4.6" fill="var(--accent-soft)" />
      <path d="M45.2 33.5c-.6-4.8-3.7-7.6-7.7-7.6-2.4 0-4.5 1-5.9 2.7" fill="var(--accent-soft)" />
      {/* центральная фигура */}
      <circle cx="24" cy="15" r="6" fill="var(--accent)" />
      <path d="M12.5 36c1-7 5.7-11 11.5-11s10.5 4 11.5 11c0 1.2-1 2.2-2.2 2.2H14.7c-1.2 0-2.2-1-2.2-2.2z" fill="var(--accent)" />
      {/* сердечко */}
      <path d="M24 29.3c-1.1-1.6-3.4-1.5-4.2.2-.7 1.6.4 3.1 4.2 5.2 3.8-2.1 4.9-3.6 4.2-5.2-.8-1.7-3.1-1.8-4.2-.2z" fill="var(--surface-strong)" />
    </svg>
  );
}

function PolaroidIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <g transform="rotate(-6 24 24)">
        <rect x="11" y="8" width="26" height="32" rx="3" fill="var(--surface-strong)" stroke="var(--text)" strokeOpacity="0.4" strokeWidth="1.6" />
        <rect x="15" y="12" width="18" height="17" rx="1.5" fill="var(--accent-light)" />
        {/* солнце и холмы внутри снимка */}
        <circle cx="20" cy="17" r="2.4" fill="#E9A94B" />
        <path d="M15 26.5l4.5-4.5 3.5 3.5 3-3 7 7v-1H15z" fill="var(--accent)" opacity="0.75" />
        {/* сердечко-подпись */}
        <path d="M24 33c-.9-1.3-2.7-1.2-3.4.2-.6 1.3.4 2.5 3.4 4.2 3-1.7 4-2.9 3.4-4.2-.7-1.4-2.5-1.5-3.4-.2z" fill="var(--accent)" />
      </g>
    </svg>
  );
}

function BalloonIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {/* маленький шар */}
      <ellipse cx="33" cy="13" rx="6" ry="7" fill="var(--accent-soft)" />
      <path d="M33 20l-1.4 2h2.8l-1.4-2z" fill="var(--accent-soft)" />
      <path d="M33 22c-1 3 1 5 0 8" stroke="var(--text)" strokeOpacity="0.4" strokeWidth="1.3" strokeLinecap="round" />
      {/* большой шар */}
      <ellipse cx="19" cy="16" rx="9.5" ry="11" fill="var(--accent)" />
      <ellipse cx="16" cy="12" rx="2.6" ry="3.6" fill="var(--surface-strong)" opacity="0.35" />
      <path d="M19 27l-2 2.6h4l-2-2.6z" fill="var(--accent)" />
      <path d="M19 29.6c-1.6 3.6 1.6 6 .4 9.4-.5 1.5-1.7 2.6-3.4 3.4" stroke="var(--text)" strokeOpacity="0.5" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function EnvelopeHeartIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {/* сердце над конвертом */}
      <path d="M24 15.5c-2-3-6.3-2.8-7.8.4-1.3 2.9.8 5.7 7.8 9.6 7-3.9 9.1-6.7 7.8-9.6-1.5-3.2-5.8-3.4-7.8-.4z" fill="var(--accent)" />
      {/* конверт */}
      <rect x="8" y="22" width="32" height="20" rx="3.5" fill="var(--surface-strong)" stroke="var(--text)" strokeOpacity="0.5" strokeWidth="1.7" />
      <path d="M9.5 24.5l14.5 9.5 14.5-9.5" stroke="var(--text)" strokeOpacity="0.5" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M9.5 40.5l9-7M38.5 40.5l-9-7" stroke="var(--text)" strokeOpacity="0.3" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

const cases = [
  { icon: <CakeIcon />, title: "День рождения коллеги" },
  { icon: <BookFlowerIcon />, title: "Учителю или воспитателю" },
  { icon: <TeamIcon />, title: "От всей команды" },
  { icon: <PolaroidIcon />, title: "Для друга или подруги" },
  { icon: <BalloonIcon />, title: "Юбилей" },
  { icon: <EnvelopeHeartIcon />, title: "Благодарность или прощание" }
];

export function CasesSection() {
  return (
    <section id="cases" className={styles.section}>
      <div className={styles.shell}>
        <div className={styles.heading}>
          <h2 className={`${styles.title} text-balance`}>Для каких случаев</h2>
          <p className={styles.subtitle}>Подходит почти для любого повода, когда хочется сказать тёплые слова вместе.</p>
        </div>

        <div className={styles.grid}>
          {cases.map((item) => (
            <article key={item.title} className={`${styles.card} js-motion-card`}>
              <span className={styles.icon}>{item.icon}</span>
              <h3 className={styles.cardTitle}>{item.title}</h3>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
