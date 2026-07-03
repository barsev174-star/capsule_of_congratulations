export type SupportRequestCategory = "problem" | "suggestion" | "question";
export type SupportRequestStatus = "new" | "in_progress" | "resolved";

export type SupportRequest = {
  id: string;
  category: SupportRequestCategory;
  contactName: string | null;
  email: string;
  message: string;
  source: string;
  status: SupportRequestStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateSupportRequestInput = Pick<
  SupportRequest,
  "category" | "contactName" | "email" | "message" | "source"
>;
