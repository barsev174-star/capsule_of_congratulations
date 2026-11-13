import { AdminStatusBadge, type AdminStatusTone } from "./admin-ui";

const domains: Record<string, Record<string, [string, AdminStatusTone]>> = {
  collection: { DRAFT: ["Черновик", "neutral"], OPEN: ["Сбор открыт", "info"], CLOSED: ["Сбор закрыт", "neutral"] },
  payment: { UNPAID: ["Не оплачено", "neutral"], PAID: ["Оплачено", "success"], REFUNDED: ["Возврат", "neutral"], REVOKED: ["Доступ отозван", "neutral"] },
  delivery: { PREPARING: ["Подготавливается", "info"], DELIVERED: ["Передана", "success"] },
  order: { CREATED: ["Ожидает оплаты", "warning"], PAID: ["Оплачен", "success"], PARTIALLY_REFUNDED: ["Частичный возврат", "warning"], REFUNDED: ["Возврат", "neutral"], CANCELED: ["Отменён", "neutral"], REVOKED: ["Доступ отозван", "neutral"] },
  attempt: { PENDING: ["Ожидает оплаты", "warning"], SUCCEEDED: ["Оплачено", "success"], CANCELED: ["Отменено", "neutral"], EXPIRED: ["Срок истёк", "neutral"] },
  reminder: { pending: ["Запланировано", "warning"], sending: ["Отправляется", "info"], sent: ["Отправлено", "success"], failed: ["Ошибка", "error"], cancelled: ["Отменена", "neutral"] },
  contribution: { visible: ["Видно", "success"], hidden: ["Скрыто", "neutral"], deleted: ["Удалено", "neutral"] },
  support: { new: ["Новое", "warning"], in_progress: ["В работе", "info"], resolved: ["Решено", "success"] },
  refund: { PROCESSING: ["Выполняется", "info"], SUCCEEDED: ["Возвращено", "success"], CANCELED: ["Возврат не выполнен", "error"] }
};
export function AdminStatus({ domain, value }: { domain: string; value: string }) {
  const [label, tone] = domains[domain]?.[value] ?? [value, "neutral"];
  return <AdminStatusBadge tone={tone}>{label}</AdminStatusBadge>;
}
