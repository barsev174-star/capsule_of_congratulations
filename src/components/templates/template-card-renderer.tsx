import { FinalCard } from "@/components/final-card/final-card";
import type { PublicShareFooterAction } from "@/components/final-card/final-card-actions";
import {
  UniversalTemplateCard,
  type UniversalTemplateActionContext,
  type UniversalTemplateViewport
} from "@/components/templates/universal-v1/universal-card";
import type { FinalCardViewModel } from "@/lib/final-card/view-model";
import type { CardBlockReadinessView } from "@/lib/manage/card-design-readiness";
import type { TemplateRendererDispatch } from "@/lib/templates/dispatcher";
import type { UniversalTemplateSurface, UniversalTemplateViewModel } from "@/lib/templates/view-model";

type LegacyRendererProps = {
  dispatch: Extract<TemplateRendererDispatch, { kind: "legacy" }>;
  model: FinalCardViewModel;
  mode?: "gift" | "preview" | "public" | "draft-preview";
  manageToken?: string;
  publicShare?: PublicShareFooterAction;
  blockReadiness?: CardBlockReadinessView[];
  debugAssets?: boolean;
};

type UniversalRendererProps = {
  dispatch: Extract<TemplateRendererDispatch, { kind: "universal-v1" }>;
  model: UniversalTemplateViewModel;
  surface?: UniversalTemplateSurface;
  viewport?: UniversalTemplateViewport;
  actionContext?: UniversalTemplateActionContext;
  publicVersionHref?: string;
  manageToken?: string;
  blockReadiness?: CardBlockReadinessView[];
  debugSafeAreas?: boolean;
};

export type TemplateCardRendererProps = LegacyRendererProps | UniversalRendererProps;

export function TemplateCardRenderer(props: TemplateCardRendererProps) {
  if (props.dispatch.kind === "legacy") {
    const legacy = props as LegacyRendererProps;
    return (
      <FinalCard
        model={legacy.model}
        mode={legacy.mode}
        manageToken={legacy.manageToken}
        publicShare={legacy.publicShare}
        blockReadiness={legacy.blockReadiness}
        debugAssets={legacy.debugAssets}
      />
    );
  }

  const universal = props as UniversalRendererProps;
  return (
    <UniversalTemplateCard
      profile={universal.dispatch.registration.profile}
      model={universal.model}
      surface={universal.surface}
      viewport={universal.viewport}
      actionContext={universal.actionContext}
      publicVersionHref={universal.publicVersionHref}
      manageToken={universal.manageToken}
      blockReadiness={universal.blockReadiness}
      debugSafeAreas={universal.debugSafeAreas}
    />
  );
}
