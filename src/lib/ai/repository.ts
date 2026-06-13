import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { AiGenerationLog } from "@/lib/ai/types";

const aiLogFilePath = join(process.cwd(), "data", "ai-generations.json");

const ensureJsonFile = async (filePath: string) => {
  await mkdir(dirname(filePath), { recursive: true });

  try {
    await readFile(filePath, "utf8");
  } catch {
    await writeFile(filePath, "[]", "utf8");
  }
};

const readAiLogs = async (): Promise<AiGenerationLog[]> => {
  await ensureJsonFile(aiLogFilePath);
  const raw = await readFile(aiLogFilePath, "utf8");

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AiGenerationLog[]) : [];
  } catch {
    return [];
  }
};

export const saveAiGenerationLog = async (entry: AiGenerationLog) => {
  const existing = await readAiLogs();
  existing.push(entry);
  await writeFile(aiLogFilePath, JSON.stringify(existing, null, 2), "utf8");
};

export const countAiGenerationsByCardId = async (cardId: string) => {
  const existing = await readAiLogs();
  return existing.filter((item) => item.cardId === cardId && item.generationType === "participant_message").length;
};
