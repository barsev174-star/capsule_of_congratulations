import { defineTemplate, defineTextCard, type TemplateProfile } from "@/lib/templates/profile";
import { defineSectionUnderlay } from "@/lib/templates/section-underlays";
import { getUniversalPhotoFramePreset } from "@/lib/templates/photo-frame-presets";
import { team_editorialProfile as together } from "@/templates/team-editorial/profile";

const asset = (name: string, width: number, height: number) => ({
  src: `/templates/new-year/${name}.webp` as const, width, height
});

const paper = "#fff5df";
const goatMedallion = asset("goat-medallion-v2", 128, 128);
const goatSprigOrnament = asset("goat-sprig-ornament", 312, 312);
const lightText = { text: "#fff8e9", muted: "#ffedc9" };
const palettes = {
  red: { page: "#fae8c8", title: "#921c3a", scene: "#a0203a", gold: "#ffe6a3" },
  green: { page: "#0a4937", title: "#fff0b6", scene: "#125d44", gold: "#ffe7a5" }
} as const;

const letter = defineSectionUnderlay(asset("letter-v3", 1100, 440), "adaptive-frame", {
  slices: { top: .20, right: .14, bottom: .20, left: .14 },
  safeArea: { x: .12, y: .13, width: .80, height: .74 }
});
const notes = ["pine", "berries", "bell", "bauble"].map((name) =>
  defineSectionUnderlay(asset(`festive-letter-${name}`, 800, 360), "adaptive-frame", {
    slices: { top: .17, right: .23, bottom: .48, left: .19 },
    fitEdgesToHeight: true,
    safeArea: { x: .085, y: .11, width: .83, height: .78 }
  })
);
const qualityMedals = ["snowflake", "sparkle", "sprig", "bell", "star"] as const;
const quoteCards = ["ivory", "champagne", "ivory"].map((finish) =>
  defineTextCard(asset(`festive-quote-${finish}`, 720, 240), "quote-winter-paper", { textColor: "#332718" })
);

const winterFrame = (frame: TemplateProfile["assets"]["photoFrames"]["memory"], name: string) => {
  const { width, height } = getUniversalPhotoFramePreset(frame.preset).source;
  return {
    ...frame,
    caption: { ...frame.caption, fontScale: name === "memory" ? .95 : frame.caption.fontScale },
    base: asset(`winter-mat-${name}`, width, height),
    overlay: asset(`winter-mat-${name}-ribbon`, width, height),
    overlayVariants: name === "portrait" ? undefined : [asset("winter-mat-clip", 336, 240), asset("winter-mat-fir-v2", 336, 240)]
  };
};

const createProfile = (theme: keyof typeof palettes) => {
  const palette = palettes[theme];
  const green = theme === "green";
  const counters = { text: "#302416", surface: paper, outline: "#d9ad65" };
  const qualityFrame = asset(`${theme}-enamel-ribbon`, 720, 180);
  const qualityCards = qualityMedals.map((medal) =>
    defineTextCard(qualityFrame, "quality-enamel", {
      textColor: "#fff4d9",
      emblem: asset(`${theme}-enamel-medal-${medal}`, 128, 128)
    })
  );

  return defineTemplate({
    ...together,
    id: "new-year",
    metadata: {
      name: "Новый год",
      description: "Групповая открытка с зимней сценой, бумажными письмами и золотым орнаментом.",
      accent: palette.title,
      preview: asset(green ? "green-preview-v3" : "preview", 1200, 630)
    },
    assets: {
      scene: {
        top: asset(`${theme}-scene-top-v3`, 1200, 800),
        mobileTop: asset(green ? "green-scene-mobile-top-v3" : "red-scene-mobile-top", 520, 650),
        middle: asset(`${theme}-winter-clearing-v3`, 1080, 2160),
        bottom: asset(green ? "green-scene-bottom-v4" : "red-scene-bottom-v5", 1116, 414),
        mobileBottom: asset(green ? "green-scene-mobile-bottom-v4" : "red-scene-mobile-bottom-v5", 500, 510),
        exportTop: {
          story: asset(`${theme}-scene-story-v3`, 810, 327),
          post: asset(`${theme}-scene-post-v3`, 810, 185),
          a4: asset(`${theme}-scene-a4-v3`, 930, 278)
        }
      },
      sections: { summary: letter },
      greetingCards: notes,
      qualityCards,
      exportQualityCards: qualityCards,
      quoteCards,
      exportQuoteCards: quoteCards,
      photoFrames: {
        messagePortrait: winterFrame(together.assets.photoFrames.messagePortrait, "portrait"),
        messageLandscape: winterFrame(together.assets.photoFrames.messageLandscape, "landscape"),
        memory: winterFrame(together.assets.photoFrames.memory, "memory")
      },
      decor: [{
        id: "winter-medallion",
        asset: goatSprigOrnament,
        anchor: "hero",
        rect: { x: .76, y: 0, width: .155, height: .46 },
        visibleOn: ["desktop", "export"],
        exportVariants: {
          story: { rect: { x: .776, y: .045, width: .145, height: .41 } },
          post: { rect: { x: .778, y: .05, width: .13, height: .62 } },
          a4: { rect: { x: .78, y: .05, width: .142, height: .55 } }
        }
      }, {
        id: "winter-medallion-mobile",
        asset: goatSprigOrnament,
        anchor: "hero",
        rect: { x: .505, y: 0, width: .245, height: .32 },
        visibleOn: ["mobile"]
      }, {
        id: "year-goat-letter-desktop",
        asset: asset("goat-engraving", 280, 280),
        anchor: "summary",
        rect: { x: .795, y: .13, width: .163, height: .72 },
        opacity: .35,
        visibleOn: ["desktop"]
      }, {
        id: "year-goat-letter-mobile",
        asset: asset("goat-engraving", 280, 280),
        anchor: "summary",
        rect: { x: .65, y: .64, width: .29, height: .32 },
        opacity: .30,
        visibleOn: ["mobile"]
      }]
    },
    typography: {
      ...together.typography,
      body: { family: "Lora", weight: 400 },
      occasion: { family: "Caveat", weight: 600 }
    },
    colors: {
      page: palette.page,
      text: "#202124",
      muted: "#5f6368",
      accent: green ? "#1d6a50" : "#a82b48",
      occasion: palette.gold,
      action: "#e9652f",
      surface: paper,
      surfaces: { summary: paper, messages: paper, memories: palette.scene },
      sections: {
        hero: lightText,
        summary: { text: "#34251c", muted: "#644633" },
        messages: { text: palette.title, muted: green ? "#ffedc9" : "#654233" },
        qualities: { text: palette.title },
        memories: green ? lightText : { text: palette.title, muted: "#4f2934" },
        quotes: { text: palette.title },
        closing: lightText
      }
    },
    intro: {
      surface: palette.scene,
      text: lightText.text,
      accent: palette.gold,
      preset: "classic",
      visualPreset: "winter-festive",
      kicker: "Новогодняя открытка",
      mark: goatMedallion
    },
    copy: { ...together.copy, quotesTitle: "Лучшие фразы" },
    export: {
      ...together.export,
      heroLayout: {
        story: { extraHeight: 0, nameHeight: 116, paddingBlock: [20, 20], paddingInline: 190, statsGap: 13 },
        post: { extraHeight: 12, nameHeight: 60, paddingBlock: [12, 14], paddingInline: 180, statsGap: 9, coverSceneMiddle: true },
        a4: { extraHeight: 0, nameHeight: 94, paddingBlock: [12, 12], paddingInline: 208, statsGap: 13, coverSceneMiddle: true }
      },
      heroDescriptionMaxWidth: { story: 650, post: 600, a4: 650 },
      counters: { preset: "classic-label", congratulations: counters, photos: counters }
    },
    performance: { networkBudget: 2_000_000, decodedMemoryBudget: 63_000_000 },
    demo: { ...together.demo, fixture: green ? "new-year-demo" : "new-year-natalya-demo" }
  });
};

export const new_yearProfile = createProfile("red");
export const newYearGreenProfile = createProfile("green");
