import { requestStructuredAi, type StructuredAiUsage } from "@/lib/ai/structured-client";

export type RouterAiUsage = StructuredAiUsage;

type RouterAiStructuredRequest = {
  model: string;
  system: string;
  user: string;
  schema: object;
  schemaName: string;
  maxCompletionTokens: number;
  temperature?: number;
};

export const requestRouterAiStructured = async <T>({
  model,
  system,
  user,
  schema,
  schemaName,
  maxCompletionTokens,
  temperature
}: RouterAiStructuredRequest): ReturnType<typeof requestStructuredAi<T>> => {
  return requestStructuredAi<T>({
    transport: "routerai",
    model,
    system,
    user,
    schema,
    schemaName,
    maxCompletionTokens,
    temperature
  });
};
