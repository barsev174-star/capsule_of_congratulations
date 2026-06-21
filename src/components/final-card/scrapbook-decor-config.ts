export type ScrapbookDecorAssetMobileOverrides = {
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  width?: string;
  rotate?: number;
  opacity?: number;
  zIndex?: number;
  visible?: boolean;
};

export type ScrapbookComponentAssetMobileOverrides = {
  visible?: boolean;
  backgroundSize?: string;
  backgroundPositionX?: string;
  backgroundPositionY?: string;
  opacity?: number;
  paperTop?: string;
  paperLeft?: string;
  paperRight?: string;
  paperBottom?: string;
  paperWidth?: string;
  paperHeight?: string;
  width?: string;
  maxWidth?: string;
  rotate?: number;
  zIndex?: number;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  minHeight?: string;
};

export const SCRAPBOOK_DECOR_ANCHORS = [
  "templateRoot",
  "hero",
  "summary",
  "qualities",
  "greetings",
  "memories",
  "bestPhrases",
  "footer"
] as const;

export type ScrapbookDecorAnchor = (typeof SCRAPBOOK_DECOR_ANCHORS)[number];

export const SCRAPBOOK_VISUAL_GROUPS = [
  "All",
  "Background",
  "Paper layers",
  "Quality tags",
  "Greeting cards",
  "Quote cards",
  "Stickers",
  "Photo frames",
  "Flowers",
  "Notes",
  "Confetti"
] as const;

export type ScrapbookVisualGroup = Exclude<(typeof SCRAPBOOK_VISUAL_GROUPS)[number], "All">;

export type ScrapbookFloatingAsset = {
  type: "floating";
  id: string;
  label: string;
  anchor: ScrapbookDecorAnchor;
  group: Extract<ScrapbookVisualGroup, "Background" | "Stickers" | "Photo frames" | "Flowers" | "Notes" | "Confetti">;
  src: string;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  width: string;
  rotate: number;
  opacity: number;
  zIndex: number;
  visible: boolean;
  hideOnMobile: boolean;
  kind?: "image" | "note";
  content?: string;
  mobile?: ScrapbookDecorAssetMobileOverrides;
};

export type ScrapbookComponentAsset = {
  type: "component";
  id: string;
  label: string;
  group: Extract<ScrapbookVisualGroup, "Paper layers" | "Quality tags" | "Greeting cards" | "Quote cards" | "Photo frames">;
  src: string;
  visible: boolean;
  backgroundSize: string;
  backgroundPositionX: string;
  backgroundPositionY: string;
  opacity: number;
  paperTop?: string;
  paperLeft?: string;
  paperRight?: string;
  paperBottom?: string;
  paperWidth?: string;
  paperHeight?: string;
  width?: string;
  maxWidth?: string;
  rotate?: number;
  zIndex?: number;
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
  minHeight?: string;
  mobile?: ScrapbookComponentAssetMobileOverrides;
};

export type ScrapbookVisualAsset = ScrapbookFloatingAsset | ScrapbookComponentAsset;

export const scrapbookFloatingAssets: ScrapbookFloatingAsset[] = [
  {
    type: "floating",
    id: "confettiTop",
    label: "Confetti Top",
    anchor: "hero",
    group: "Confetti",
    src: "/templates/scrapbook-clean/confetti-top.svg",
    top: "10px",
    left: "17%",
    width: "126%",
    rotate: 0,
    opacity: 0.9,
    zIndex: 1,
    visible: true,
    hideOnMobile: true
  },
  {
    type: "floating",
    id: "heartStickerTopLeft",
    label: "Heart Sticker Top Left",
    anchor: "hero",
    group: "Stickers",
    src: "/templates/scrapbook-clean/heart-sticker-puffy-pink.png",
    top: "28px",
    left: "28px",
    width: "76px",
    rotate: -12,
    opacity: 1,
    zIndex: 2,
    visible: true,
    hideOnMobile: true
  },
  {
    type: "floating",
    id: "polaroidCakeLeft",
    label: "Polaroid Cake Left",
    anchor: "hero",
    group: "Photo frames",
    src: "/templates/scrapbook-clean/top-polaroid-cake.png",
    top: "108px",
    left: "35px",
    width: "196px",
    rotate: -10,
    opacity: 1,
    zIndex: 2,
    visible: true,
    hideOnMobile: true,
    right: "-100px"
  },
  {
    type: "floating",
    id: "goldHeartLeft",
    label: "Gold Heart Left",
    anchor: "hero",
    group: "Stickers",
    src: "/templates/scrapbook-clean/heart-sticker-puffy-gold.png",
    top: "320px",
    left: "194px",
    width: "56px",
    rotate: 18,
    opacity: 1,
    zIndex: 2,
    visible: true,
    hideOnMobile: true
  },
  {
    type: "floating",
    id: "polaroidFlowersTopRight",
    label: "Polaroid Flowers Top Right",
    anchor: "hero",
    group: "Photo frames",
    src: "/templates/scrapbook-clean/top-polaroid-bouquet.png",
    top: "34px",
    right: "-160px",
    width: "196px",
    rotate: 7,
    opacity: 1,
    zIndex: 2,
    visible: true,
    hideOnMobile: true
  },
  {
    type: "floating",
    id: "stickyNoteToday",
    label: "Sticky Note Today",
    anchor: "hero",
    group: "Notes",
    src: "/templates/scrapbook-clean/sticky-note-irregular.png",
    top: "250px",
    right: "-145px",
    width: "124px",
    rotate: -7,
    opacity: 1,
    zIndex: 3,
    visible: true,
    hideOnMobile: true,
    kind: "note",
    content: "Сегодня твой день!"
  },
  {
    type: "floating",
    id: "watercolorStainPink",
    label: "Watercolor Pink",
    anchor: "bestPhrases",
    group: "Background",
    src: "/templates/scrapbook-clean/watercolor-stain-pink.png",
    top: "-12px",
    left: "-28px",
    width: "220px",
    rotate: -8,
    opacity: 0.32,
    zIndex: 1,
    visible: true,
    hideOnMobile: true
  },
  {
    type: "floating",
    id: "watercolorStainBeige",
    label: "Watercolor Beige",
    anchor: "greetings",
    group: "Background",
    src: "/templates/scrapbook-clean/watercolor-stain-beige.png",
    top: "210px",
    right: "-34px",
    width: "260px",
    rotate: 12,
    opacity: 0.32,
    zIndex: 1,
    visible: true,
    hideOnMobile: true
  },
  {
    type: "floating",
    id: "rightConfettiScatter",
    label: "Confetti Right",
    anchor: "templateRoot",
    group: "Confetti",
    src: "/templates/scrapbook-clean/confetti-right.svg",
    top: "310px",
    right: "10px",
    width: "172px",
    rotate: 0,
    opacity: 0.9,
    zIndex: 1,
    visible: true,
    hideOnMobile: true
  },
  {
    type: "floating",
    id: "driedFlowersRight",
    label: "Dried Flowers Right",
    anchor: "summary",
    group: "Flowers",
    src: "/templates/scrapbook-clean/dried-flowers-right.png",
    top: "-16px",
    right: "-26px",
    width: "112px",
    rotate: 17,
    opacity: 0.9,
    zIndex: 2,
    visible: true,
    hideOnMobile: true
  },
  {
    type: "floating",
    id: "pinkHeartMidRight",
    label: "Pink Heart Mid Right",
    anchor: "memories",
    group: "Stickers",
    src: "/templates/scrapbook-clean/heart-sticker-puffy-pink.png",
    top: "59%",
    right: "52px",
    width: "56px",
    rotate: 14,
    opacity: 1,
    zIndex: 2,
    visible: true,
    hideOnMobile: true
  },
  {
    type: "floating",
    id: "goldHeartBottomRight",
    label: "Gold Heart Bottom Right",
    anchor: "memories",
    group: "Stickers",
    src: "/templates/scrapbook-clean/heart-sticker-puffy-gold.png",
    bottom: "292px",
    right: "72px",
    width: "106px",
    rotate: -18,
    opacity: 1,
    zIndex: 1,
    visible: true,
    hideOnMobile: true
  },
  {
    type: "floating",
    id: "driedFlowersBottomLeft",
    label: "Dried Flowers Bottom Left",
    anchor: "greetings",
    group: "Flowers",
    src: "/templates/scrapbook-clean/dried-flowers-bottom-left.png",
    bottom: "10px",
    left: "424px",
    width: "312px",
    rotate: -22,
    opacity: 1,
    zIndex: 2,
    visible: true,
    hideOnMobile: true
  },
  {
    type: "floating",
    id: "footerFloralCluster",
    label: "Footer Floral Cluster",
    anchor: "footer",
    group: "Flowers",
    src: "/templates/scrapbook-clean/footer-floral-cluster.png",
    bottom: "8px",
    right: "2px",
    width: "400px",
    rotate: -1,
    opacity: 1,
    zIndex: 1,
    visible: true,
    hideOnMobile: true
  }
];

export const scrapbookComponentAssets: ScrapbookComponentAsset[] = [
  {
    type: "component",
    id: "heroPaper",
    label: "Hero Paper",
    group: "Paper layers",
    src: "/templates/scrapbook-clean/torn-paper-section1.png",
    visible: true,
    backgroundSize: "109% 100%",
    backgroundPositionX: "center",
    backgroundPositionY: "-30px",
    opacity: 1,
    paperTop: "0px",
    paperLeft: "0px",
    paperRight: "0px",
    paperBottom: "0px",
    paperWidth: "1100px",
    paperHeight: "520px",
    width: "900px",
    maxWidth: "1100px",
    rotate: 0,
    paddingTop: "1px",
    paddingRight: "48px",
    paddingBottom: "96px",
    paddingLeft: "1px",
    minHeight: "360px",
    zIndex: 1,
    mobile: {
      backgroundSize: "170% 186%",
      backgroundPositionY: "52%",
      paddingTop: "36px",
      paddingRight: "22px",
      paddingBottom: "72px",
      paddingLeft: "22px",
      minHeight: "420px"
    }
  },
  {
    type: "component",
    id: "summaryPaper",
    label: "Summary Paper",
    group: "Paper layers",
    src: "/templates/scrapbook-clean/torn-paper-summary.png",
    visible: true,
    backgroundSize: "100% 100%",
    backgroundPositionX: "center",
    backgroundPositionY: "center",
    opacity: 1,
    paperTop: "-16px",
    paperLeft: "-16px",
    paperRight: "-16px",
    paperBottom: "-16px",
    paperWidth: "auto",
    paperHeight: "auto",
    width: "92%",
    maxWidth: "980px",
    rotate: 0,
    paddingTop: "20px",
    paddingRight: "40px",
    paddingBottom: "30px",
    paddingLeft: "70px",
    minHeight: "126px",
    zIndex: 1,
    mobile: {
      backgroundSize: "118% 118%",
      paddingTop: "18px",
      paddingRight: "18px",
      paddingBottom: "24px",
      paddingLeft: "18px"
    }
  },
  {
    type: "component",
    id: "qualitiesTitlePaper",
    label: "Qualities Title Paper",
    group: "Paper layers",
    src: "/templates/scrapbook-clean/torn-paper-summary.png",
    visible: true,
    backgroundSize: "120% 100%",
    backgroundPositionX: "center",
    backgroundPositionY: "center",
    opacity: 0.92,
    paddingTop: "8px",
    paddingRight: "24px",
    paddingBottom: "12px",
    paddingLeft: "24px"
  },
  {
    type: "component",
    id: "qualitiesPaper",
    label: "Qualities Paper",
    group: "Paper layers",
    src: "/templates/scrapbook-clean/torn-paper-section1.png",
    visible: true,
    backgroundSize: "100% 100%",
    backgroundPositionX: "center",
    backgroundPositionY: "center",
    opacity: 0.85,
    paperTop: "-12px",
    paperLeft: "-12px",
    paperRight: "-12px",
    paperBottom: "-12px",
    paperWidth: "auto",
    paperHeight: "auto",
    width: "100%",
    maxWidth: "760px",
    rotate: 0,
    paddingTop: "22px",
    paddingRight: "28px",
    paddingBottom: "28px",
    paddingLeft: "28px",
    minHeight: "120px",
    zIndex: 1,
    mobile: {
      backgroundSize: "110% 110%",
      paddingTop: "18px",
      paddingRight: "18px",
      paddingBottom: "22px",
      paddingLeft: "18px"
    }
  },
  {
    type: "component",
    id: "qualityTagShort1",
    label: "Quality Tag 1",
    group: "Quality tags",
    src: "/templates/scrapbook-clean/paper-tag-short1.png",
    visible: true,
    backgroundSize: "100% 100%",
    backgroundPositionX: "center",
    backgroundPositionY: "center",
    opacity: 1,
    width: "180px",
    maxWidth: "180px",
    rotate: 1,
    paddingTop: "30px",
    paddingRight: "24px",
    paddingBottom: "22px",
    paddingLeft: "24px",
    minHeight: "4px"
  },
  {
    type: "component",
    id: "qualityTagShort2",
    label: "Quality Tag 2",
    group: "Quality tags",
    src: "/templates/scrapbook-clean/paper-tag-short2.png",
    visible: true,
    backgroundSize: "100% 80%",
    backgroundPositionX: "center",
    backgroundPositionY: "center",
    opacity: 1,
    width: "188px",
    maxWidth: "188px",
    rotate: 2,
    paddingTop: "35px",
    paddingRight: "24px",
    paddingBottom: "22px",
    paddingLeft: "24px",
    minHeight: "94px"
  },
  {
    type: "component",
    id: "qualityTagShort3",
    label: "Quality Tag 3",
    group: "Quality tags",
    src: "/templates/scrapbook-clean/paper-tag-short3.png",
    visible: true,
    backgroundSize: "100% 80%",
    backgroundPositionX: "center",
    backgroundPositionY: "center",
    opacity: 1,
    width: "188px",
    maxWidth: "188px",
    rotate: -1,
    paddingTop: "35px",
    paddingRight: "24px",
    paddingBottom: "22px",
    paddingLeft: "24px",
    minHeight: "94px"
  },
  {
    type: "component",
    id: "quoteCardPink",
    label: "Quote Card Pink",
    group: "Quote cards",
    src: "/templates/scrapbook-clean/quote-card-pink-v2.png",
    visible: true,
    backgroundSize: "110% 108%",
    backgroundPositionX: "center",
    backgroundPositionY: "-16px",
    opacity: 1,
    paddingTop: "1px",
    paddingRight: "28px",
    paddingBottom: "30px",
    paddingLeft: "28px",
    minHeight: "188px"
  },
  {
    type: "component",
    id: "quoteCardBeige",
    label: "Quote Card Beige",
    group: "Quote cards",
    src: "/templates/scrapbook-clean/quote-card-beige.png",
    visible: true,
    backgroundSize: "125% 98%",
    backgroundPositionX: "center",
    backgroundPositionY: "-6px",
    opacity: 1,
    paddingTop: "1px",
    paddingRight: "28px",
    paddingBottom: "30px",
    paddingLeft: "28px",
    minHeight: "188px"
  },
  {
    type: "component",
    id: "quoteCardBlue",
    label: "Quote Card Blue",
    group: "Quote cards",
    src: "/templates/scrapbook-clean/quote-card-blue.png",
    visible: true,
    backgroundSize: "106% 105%",
    backgroundPositionX: "70%",
    backgroundPositionY: "135%",
    opacity: 1,
    paddingTop: "1px",
    paddingRight: "28px",
    paddingBottom: "30px",
    paddingLeft: "28px",
    minHeight: "188px"
  },
  {
    type: "component",
    id: "quotesPaper",
    label: "Quotes Paper",
    group: "Paper layers",
    src: "/templates/scrapbook-clean/torn-paper-section1.png",
    visible: true,
    backgroundSize: "108% 100%",
    backgroundPositionX: "-50px",
    backgroundPositionY: "center",
    opacity: 0.78,
    paperTop: "-14px",
    paperLeft: "-14px",
    paperRight: "-14px",
    paperBottom: "-14px",
    paperWidth: "auto",
    paperHeight: "auto",
    width: "100%",
    maxWidth: "1100px",
    rotate: 0,
    paddingTop: "28px",
    paddingRight: "28px",
    paddingBottom: "32px",
    paddingLeft: "28px",
    minHeight: "220px",
    zIndex: 1,
    mobile: {
      backgroundSize: "110% 110%",
      paddingTop: "20px",
      paddingRight: "18px",
      paddingBottom: "24px",
      paddingLeft: "18px"
    }
  },
  {
    type: "component",
    id: "greetingCardPink",
    label: "Greeting Card Pink",
    group: "Greeting cards",
    src: "/templates/scrapbook-clean/greeting-card-pink.png",
    visible: true,
    backgroundSize: "113% 120%",
    backgroundPositionX: "-40px",
    backgroundPositionY: "center",
    opacity: 1,
    paperTop: "0px",
    paperLeft: "0px",
    paperRight: "0px",
    paperBottom: "0px",
    paddingTop: "16px",
    paddingRight: "18px",
    paddingBottom: "16px",
    paddingLeft: "18px",
    minHeight: "190px"
  },
  {
    type: "component",
    id: "greetingCardCream",
    label: "Greeting Card Cream",
    group: "Greeting cards",
    src: "/templates/scrapbook-clean/greeting-card-cream.png",
    visible: true,
    backgroundSize: "110% 119%",
    backgroundPositionX: "center",
    backgroundPositionY: "center",
    opacity: 1,
    paperTop: "0px",
    paperLeft: "0px",
    paperRight: "0px",
    paperBottom: "0px",
    paddingTop: "16px",
    paddingRight: "18px",
    paddingBottom: "16px",
    paddingLeft: "18px",
    minHeight: "190px"
  },
  {
    type: "component",
    id: "greetingCardBlue",
    label: "Greeting Card Blue",
    group: "Greeting cards",
    src: "/templates/scrapbook-clean/greeting-card-blue.png",
    visible: true,
    backgroundSize: "105% 118%",
    backgroundPositionX: "center",
    backgroundPositionY: "center",
    opacity: 1,
    paperTop: "0px",
    paperLeft: "0px",
    paperRight: "0px",
    paperBottom: "0px",
    paddingTop: "16px",
    paddingRight: "18px",
    paddingBottom: "16px",
    paddingLeft: "18px",
    minHeight: "190px"
  },
  {
    type: "component",
    id: "messagePolaroidLandscape",
    label: "Message Photo Polaroid Landscape",
    group: "Photo frames",
    src: "/templates/scrapbook-clean/polaroid-frame-horizontal.png",
    visible: true,
    backgroundSize: "110% 110%",
    backgroundPositionX: "center",
    backgroundPositionY: "-12px",
    opacity: 1,
    paperTop: "0px",
    paperLeft: "-8px",
    paperRight: "-8px",
    paperBottom: "-20px",
    paddingTop: "12px",
    paddingRight: "12px",
    paddingBottom: "18px",
    paddingLeft: "12px",
    minHeight: "auto",
    rotate: 0
  },
  {
    type: "component",
    id: "messagePolaroidPortrait",
    label: "Message Photo Polaroid Portrait",
    group: "Photo frames",
    src: "/templates/scrapbook-clean/polaroid-frame-vertical.png",
    visible: true,
    backgroundSize: "100% 100%",
    backgroundPositionX: "center",
    backgroundPositionY: "center",
    opacity: 1,
    paperTop: "-8px",
    paperLeft: "-8px",
    paperRight: "-8px",
    paperBottom: "-8px",
    paddingTop: "12px",
    paddingRight: "12px",
    paddingBottom: "18px",
    paddingLeft: "12px",
    minHeight: "auto"
  },
  {
    type: "component",
    id: "memoryPolaroidFrame",
    label: "Memory Polaroid Frame",
    group: "Photo frames",
    src: "/templates/scrapbook-clean/polaroid-frame-horizontal.png",
    visible: true,
    backgroundSize: "110% 100%",
    backgroundPositionX: "center",
    backgroundPositionY: "-10px",
    opacity: 1,
    paperTop: "-8px",
    paperLeft: "-8px",
    paperRight: "-8px",
    paperBottom: "-8px",
    paddingTop: "12px",
    paddingRight: "12px",
    paddingBottom: "18px",
    paddingLeft: "12px",
    minHeight: "auto"
  },
  {
    type: "component",
    id: "messagesPaper",
    label: "Messages Paper",
    group: "Paper layers",
    src: "/templates/scrapbook-clean/torn-paper-section1.png",
    visible: true,
    backgroundSize: "118% 118%",
    backgroundPositionX: "center",
    backgroundPositionY: "center",
    opacity: 0.62,
    paddingTop: "24px",
    paddingRight: "28px",
    paddingBottom: "28px",
    paddingLeft: "28px",
    minHeight: "auto"
  },
  {
    type: "component",
    id: "aiSummaryPaper",
    label: "AI Summary Paper",
    group: "Paper layers",
    src: "/templates/scrapbook-clean/torn-paper-summary.png",
    visible: true,
    backgroundSize: "100% 100%",
    backgroundPositionX: "center",
    backgroundPositionY: "center",
    opacity: 1,
    paperTop: "-16px",
    paperLeft: "-16px",
    paperRight: "-16px",
    paperBottom: "-16px",
    paperWidth: "auto",
    paperHeight: "auto",
    paddingTop: "30px",
    paddingRight: "78px",
    paddingBottom: "34px",
    paddingLeft: "75px",
    minHeight: "150px",
    zIndex: 1,
    mobile: {
      backgroundSize: "100% 100%",
      paperTop: "-12px",
      paperLeft: "-12px",
      paperRight: "-12px",
      paperBottom: "-12px",
      paddingTop: "22px",
      paddingRight: "22px",
      paddingBottom: "26px",
      paddingLeft: "22px"
    }
  },
  {
    type: "component",
    id: "closingPaper",
    label: "Closing Paper",
    group: "Paper layers",
    src: "/templates/scrapbook-clean/torn-paper-section1.png",
    visible: true,
    backgroundSize: "100% 100%",
    backgroundPositionX: "center",
    backgroundPositionY: "center",
    opacity: 0.72,
    paperTop: "-16px",
    paperLeft: "-16px",
    paperRight: "-16px",
    paperBottom: "-16px",
    paperWidth: "auto",
    paperHeight: "auto",
    paddingTop: "34px",
    paddingRight: "42px",
    paddingBottom: "38px",
    paddingLeft: "42px",
    minHeight: "156px",
    zIndex: 1,
    mobile: {
      backgroundSize: "100% 100%",
      paperTop: "-12px",
      paperLeft: "-12px",
      paperRight: "-12px",
      paperBottom: "-12px",
      paddingTop: "24px",
      paddingRight: "22px",
      paddingBottom: "26px",
      paddingLeft: "22px"
    }
  }
];

export const scrapbookVisualAssets: ScrapbookVisualAsset[] = [
  ...scrapbookFloatingAssets,
  ...scrapbookComponentAssets
];
