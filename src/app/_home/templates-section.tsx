import Image from "next/image";
import Link from "next/link";
import { getCardTemplates } from "@/lib/cards/templates-server";
import { getTemplateAsset } from "./landing-assets";
import styles from "./templates-section.module.css";

const templateStyleMap: Record<string, string> = {
  "paper-classic": styles.paperClassic,
  "warm-classic": styles.warmClassic,
  "team-modern": styles.teamModern,
  "bright-party": styles.brightParty,
  "soft-personal": styles.softPersonal
};

function TemplateMiniature({ templateId, accent }: { templateId: string; accent: string }) {
  const imageSrc = getTemplateAsset(templateId);
  const styleClass = templateStyleMap[templateId] ?? styles.paperClassic;

  if (imageSrc) {
    return (
      <div className={styles.assetPreview}>
        <Image src={imageSrc} alt="" fill className={styles.assetImage} sizes="220px" />
      </div>
    );
  }

  return (
    <div className={`${styles.preview} ${styleClass}`}>
      <div className={styles.accentWash} style={{ background: accent }} />
      <div className={styles.paperSheet}>
        <div className={styles.paperLine} />
        <div className={styles.paperLineShort} />
      </div>
      <div className={styles.miniEnvelope}>
        <span>♥</span>
      </div>
      <div className={styles.miniHeart} />
      <div className={styles.miniStripe} />
    </div>
  );
}

export async function TemplatesSection() {
  const cardTemplates = await getCardTemplates();

  return (
    <section id="templates" className={styles.section}>
      <div className={styles.shell}>
        <div className={styles.heading}>
          <h2 className={`${styles.title} text-balance`}>Выберите настроение открытки</h2>
          <p className={styles.subtitle}>На старте доступен один тщательно проработанный шаблон. Новые стили появятся позже.</p>
        </div>

        <div className={styles.grid}>
          {cardTemplates.map((template, index) => (
            <article key={template.id} className={`${styles.card} js-motion-card ${index === 0 ? "" : styles.comingSoon}`}>
              <TemplateMiniature templateId={template.id} accent={template.accent} />
              <h3 className={styles.cardTitle}>{template.name}</h3>
              <p className={styles.cardText}>{index === 0 ? "Тёплая бумажная открытка с мягкими деталями и атмосферой личного подарка." : "Новый стиль появится позже."}</p>
              <span className={index === 0 ? styles.availableBadge : styles.comingSoonBadge}>{index === 0 ? "Доступен" : "Скоро"}</span>
              {index === 0 && (template.id === "paper-birthday" || template.id === "route-adventure") ? (
                <Link className={styles.demoLink} href={`/example?template=${template.id}`}>
                  Открыть интерактивный пример
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
