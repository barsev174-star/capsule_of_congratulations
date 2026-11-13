import Image from "next/image";
import Link from "next/link";
import { cardTemplates } from "@/lib/cards/templates";
import { listTemplateOverrides } from "@/lib/admin/repository-phase2";
import { requireAdminRole } from "@/lib/admin/session";
import { AdminPageHeader,AdminStatusBadge } from "../../components/admin-ui";
import styles from "../../admin.module.css";
export default async function AdminTemplatesPage() {
  await requireAdminRole("admin");
  const overrides=await listTemplateOverrides();
  return <><AdminPageHeader title="Шаблоны" description="Выберите шаблон для редактирования. Цветовые темы находятся внутри технического шаблона."/><section className={styles.panel}><div className={styles.templateList}>{cardTemplates.map(template=>{
    const override=overrides.find(o=>o.id===template.id), active=override?.isActive ?? true;
    return <article className={styles.templateRow} key={template.id}>
      {template.preview?<Image src={template.preview} alt="" width={72} height={96} className={styles.templateThumb}/>:<div className={styles.templateThumb}/>}
      <div className={styles.templateInfo}><h2>{override?.name ?? template.name}</h2><p>{override?.description ?? template.description}</p><AdminStatusBadge tone={active?"success":"neutral"}>{active?"Активен":"Отключён"}</AdminStatusBadge></div><Link className={styles.detailLink} href={`/admin/templates/${template.id}`}>Редактировать</Link>
    </article>;
  })}</div></section></>;
}
