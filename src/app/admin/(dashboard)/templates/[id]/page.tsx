import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cardTemplates } from "@/lib/cards/templates";
import { getTemplateOverrideById } from "@/lib/admin/repository-phase2";
import { requireAdminRole } from "@/lib/admin/session";
import { AdminPageHeader,AdminDetailPanel } from "../../../components/admin-ui";
import { AdminTemplateForm } from "../../../components/admin-template-form";
import styles from "../../../admin.module.css";
export default async function AdminTemplateDetailPage({params}:{params:Promise<{id:string}>}) {
  await requireAdminRole("admin");
  const {id}=await params, template=cardTemplates.find(t=>t.id===id);
  if(!template) notFound();
  const override=await getTemplateOverrideById(id);
  return <><AdminPageHeader title={override?.name ?? template.name} description={`Технический шаблон: ${template.id}`}><Link className={styles.detailLink} href="/admin/templates">К списку</Link></AdminPageHeader>
  <AdminDetailPanel title="Настройки"><AdminTemplateForm id={id} name={override?.name ?? template.name} description={override?.description ?? template.description} accent={override?.accent ?? template.accent} recommendedFor={(override?.recommendedFor ?? template.recommendedFor).join(", ")} isActive={override?.isActive ?? true}/></AdminDetailPanel>
  {template.themes && <AdminDetailPanel title="Цветовые темы"><div className={styles.templateList}>{template.themes.map(theme=><article key={theme.id} className={styles.templateRow}><Image src={theme.preview} alt="" width={72} height={96} className={styles.templateThumb}/><div className={styles.templateInfo}><h2>{theme.name}</h2><p>{theme.description}</p></div></article>)}</div><p className={styles.analyticsNote}>Это темы одного шаблона. Настройки активности относятся ко всему шаблону.</p></AdminDetailPanel>}</>;
}
