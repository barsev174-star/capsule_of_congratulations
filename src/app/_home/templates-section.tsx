import Image from "next/image";
import Link from "next/link";
import { getCardTemplates, type CardTemplate } from "@/lib/cards/templates-server";
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

const featuredTemplateIds = new Set(["school-classic", "kindergarten-doodles", "team-editorial"]);
const homepageTemplateOrder = [
  "paper-birthday",
  "route-adventure",
  "team-editorial",
  "school-classic",
  "school-scrapbook",
  "kindergarten-doodles"
] as const;
const homepageTemplateOrderIndex = new Map<string, number>(homepageTemplateOrder.map((templateId, index) => [templateId, index]));

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

function TemplateCard({ template, theme, demoHref }: {
  template: CardTemplate;
  theme?: NonNullable<CardTemplate["themes"]>[number];
  demoHref?: string;
}) {
  const name = theme?.name ?? template.name;

  return (
    <article
      className={`${styles.card} js-motion-card ${theme ? styles.seasonalCard : ""}`}
      data-template-id={template.id}
      data-template-theme={theme?.id}
    >
      <TemplateMiniature templateId={template.id} accent={template.accent} preview={theme?.preview ?? template.preview} />
      <h3 className={styles.cardTitle}>{name}</h3>
      <p className={styles.cardText}>{theme?.description ?? template.description}</p>
      <span className={styles.availableBadge}>{featuredTemplateIds.has(template.id) ? "Новый · доступен" : "Доступен"}</span>
      {demoHref ? (
        <Link className={styles.demoLink} href={demoHref} aria-label={`Открыть интерактивный пример: ${name}`} data-home-action="example" data-home-placement="templates">
          Открыть интерактивный пример
        </Link>
      ) : null}
    </article>
  );
}

export async function TemplatesSection() {
  const cardTemplates = await getCardTemplates();
  const newYearTemplate = cardTemplates.find(({ id }) => id === "new-year");
  const orderedTemplates = cardTemplates.filter(({ id }) => id !== "new-year").sort(
    (left, right) =>
      (homepageTemplateOrderIndex.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (homepageTemplateOrderIndex.get(right.id) ?? Number.MAX_SAFE_INTEGER)
  );

  return (
    <section id="templates" className={styles.section}>
      <div className={styles.shell}>
        <div className={styles.heading}>
          <h2 className={`${styles.title} text-balance`}>Выберите настроение открытки</h2>
          <p className={styles.subtitle}>Выберите подходящий стиль. Оформление можно изменить в редакторе.</p>
        </div>

        <div className={styles.grid}>
          {newYearTemplate && newYearTemplate.themes?.map((theme) => (
            <TemplateCard
              key={theme.id}
              template={newYearTemplate}
              theme={theme}
              demoHref={`/example?template=new-year-${theme.id}&preview=recipient`}
            />
          ))}
          {orderedTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              demoHref={homepageTemplateOrderIndex.has(template.id) ? `/example?template=${template.id}` : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
