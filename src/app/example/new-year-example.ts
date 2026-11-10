import { dispatchCardTemplateRenderer } from "@/lib/templates/dispatcher";
import { buildUniversalFixtureViewModel } from "@/lib/templates/view-model";
import { getGiftIntroScene } from "@/lib/templates/gift-intro-scene";
import { newYearExampleThemes, type NewYearExampleId } from "./example-query";

export const getNewYearExample = (id: NewYearExampleId) => {
  const theme = newYearExampleThemes[id];
  const dispatch = dispatchCardTemplateRenderer("new-year", theme);
  if (dispatch?.kind !== "universal-v1") {
    throw new Error("Новогодний шаблон должен использовать универсальный рендерер.");
  }
  const { profile } = dispatch.registration;
  const { fixture, scenario, photoCount } = profile.demo;
  const model = buildUniversalFixtureViewModel(fixture, { templateId: profile.id, scenario, photoCount });
  return { dispatch, model, introScene: getGiftIntroScene(profile) };
};
