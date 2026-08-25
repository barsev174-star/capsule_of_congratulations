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
  "soft-personal": styles.softPersonal,
  "route-adventure": styles.routeAdventure
};

const featuredTemplateIds = new Set(["school-classic", "kindergarten-doodles"]);

function TemplateMiniature({ templateId, accent, preview }: { templateId: string; accent: string; preview?: string }) {
  const imageSrc = preview ?? getTemplateAsset(templateId);
  const styleClass = templateStyleMap[templateId] ?? styles.paperClassic;

  if (imageSrc) {
    return (
      <div className={styles.assetPreview}>
        <Image src={imageSrc} alt="" fill className={styles.assetImage} sizes="(max-width: 639px) 92vw, (max-width: 1023px) 45vw, 590px" />
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
          <p className={styles.subtitle}>Выберите один из пяти тщательно проработанных шаблонов. Новые стили появятся позже.</p>
        </div>

        <div className={styles.grid}>
          {cardTemplates.map((template) => (
            <article
              key={template.id}
              className={`${styles.card} js-motion-card ${styles.active} ${template.id === "school-classic" ? styles.secondRowStart : ""}`.trim()}
              data-template-id={template.id}
            >
              <TemplateMiniature templateId={template.id} accent={template.accent} preview={template.preview} />
              <h3 className={styles.cardTitle}>{template.name}</h3>
              <p className={styles.cardText}>{template.description}</p>
              <span className={styles.availableBadge}>{featuredTemplateIds.has(template.id) ? "Новый · доступен" : "Доступен"}</span>
              {template.id === "paper-birthday" || template.id === "route-adventure" || template.id === "school-scrapbook" || featuredTemplateIds.has(template.id) ? (
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
