export const homeActivityEvents = ["home_page_view", "home_example_click", "home_create_click"] as const;
export type HomeActivityEvent = (typeof homeActivityEvents)[number];

export const homeActivityPlacements = ["header", "hero", "templates", "price", "final", "footer"] as const;
export type HomeActivityPlacement = (typeof homeActivityPlacements)[number];

export const isHomeActivityEvent = (value: string): value is HomeActivityEvent =>
  homeActivityEvents.some((event) => event === value);

export const isHomeActivityPlacement = (value: unknown): value is HomeActivityPlacement =>
  homeActivityPlacements.some((placement) => placement === value);
