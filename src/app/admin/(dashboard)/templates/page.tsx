import { cardTemplates } from "@/lib/cards/templates";
import { listTemplateOverrides } from "@/lib/admin/repository-phase2";
import { requireAdminRole } from "@/lib/admin/session";
import { toggleTemplateOverrideAction, upsertTemplateOverrideAction } from "../../actions-phase2";
import styles from "../../admin.module.css";

export default async function AdminTemplatesPage() {
  await requireAdminRole("admin");
  const overrides = await listTemplateOverrides();
  const overrideById = new Map(overrides.map((override) => [override.id, override]));

  return (
    <>
      <h1 className={styles.pageTitle}>Шаблоны</h1>
      <p className={styles.pageSubtitle}>Редактирование метаданных и включение/выключение шаблонов</p>

      <section className={styles.panel}>
        {cardTemplates.map((template) => {
          const override = overrideById.get(template.id);
          const name = override?.name ?? template.name;
          const description = override?.description ?? template.description;
          const accent = override?.accent ?? template.accent;
          const recommendedFor = override?.recommendedFor ?? template.recommendedFor;
          const isActive = override ? override.isActive : true;

          return (
            <article
              key={template.id}
              style={{
                borderBottom: "1px solid var(--a-border)",
                padding: "20px 0",
                opacity: isActive ? 1 : 0.55
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: accent,
                    flexShrink: 0
                  }}
                />
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, color: "var(--a-text)" }}>{name}</h2>
                  <p style={{ margin: "4px 0 0", color: "var(--a-muted)", fontSize: 14 }}>{description}</p>
                </div>
                <span
                  className={`${styles.badge} ${isActive ? styles.badgeVisible : styles.badgeHidden}`}
                  style={{ marginLeft: "auto" }}
                >
                  {isActive ? "Активен" : "Выключен"}
                </span>
              </div>

              <form action={upsertTemplateOverrideAction} style={{ marginBottom: 12 }}>
                <input type="hidden" name="id" value={template.id} />
                <div className={styles.detailGrid} style={{ gap: 12, marginBottom: 12 }}>
                  <label className={styles.detailField}>
                    <span>Название</span>
                    <input type="text" name="name" defaultValue={name} className={styles.searchInput} />
                  </label>
                  <label className={styles.detailField}>
                    <span>Акцентный цвет</span>
                    <input type="text" name="accent" defaultValue={accent} className={styles.searchInput} />
                  </label>
                  <label className={styles.detailField} style={{ gridColumn: "1 / -1" }}>
                    <span>Описание</span>
                    <input type="text" name="description" defaultValue={description} className={styles.searchInput} />
                  </label>
                  <label className={styles.detailField} style={{ gridColumn: "1 / -1" }}>
                    <span>Рекомендуется для (через запятую)</span>
                    <input
                      type="text"
                      name="recommendedFor"
                      defaultValue={recommendedFor?.join(", ") ?? ""}
                      className={styles.searchInput}
                    />
                  </label>
                  <label className={styles.detailField} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" name="isActive" defaultChecked={isActive} />
                    <span>Активен</span>
                  </label>
                </div>
                <button type="submit" className={styles.filterButton}>
                  Сохранить
                </button>
              </form>

              <form action={toggleTemplateOverrideAction} className={styles.actionForm}>
                <input type="hidden" name="id" value={template.id} />
                <input type="hidden" name="isActive" value={String(!isActive)} />
                <button type="submit" className={styles.actionButton}>
                  {isActive ? "Выключить" : "Включить"}
                </button>
              </form>
            </article>
          );
        })}
      </section>
    </>
  );
}
