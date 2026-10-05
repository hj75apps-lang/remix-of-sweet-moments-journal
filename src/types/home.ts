export type HomeItemType = "WIDGET" | "APP";

export type WidgetKind = "navigation" | "media" | "weather" | "favorites" | "clock";
export type AppId = "map" | "music" | "radio" | "phone" | "settings";

export interface ItemSize {
  w: number;
  h: number;
}

export interface HomeItem {
  id: string;
  type: HomeItemType;
  /** WidgetKind for widgets, AppId for apps */
  ref: WidgetKind | AppId;
  size: ItemSize;
}

export interface HomeLayout {
  version: 2;
  items: HomeItem[];
}
