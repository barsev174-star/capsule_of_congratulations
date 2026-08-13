import { scaffoldTemplate } from "./template-pipeline-lib.mjs";

const options = Object.fromEntries(process.argv.slice(2).map((part) => {
  const [key, ...value] = part.replace(/^--/, "").split("=");
  return [key, value.join("=")];
}));

try {
  const result = await scaffoldTemplate({ root: process.cwd(), id: options.id, name: options.name });
  console.log(`TEMPLATE_CREATED ${result.id}`);
  console.log(`Профиль: ${result.templateDir}`);
  console.log(`Исходные ассеты: ${result.sourceDir}`);
  console.log("Добавьте файлы из template.assets.json, затем выполните npm run template:assets и npm run template:check.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
