export type StickerStatus = "owned" | "missing";

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  created_at: string;
}

export interface Album {
  id: string;
  name: string;
  year: number;
  slug: string;
  description: string | null;
  created_at: string;
}

export interface StickerCategory {
  id: string;
  album_id: string;
  name: string;
  sort_order: number;
}

export interface Sticker {
  id: string;
  category_id: string;
  code: string;
  name: string;
  sort_order: number;
}

export interface StickerWithCategory extends Sticker {
  sticker_categories: StickerCategory;
}

export interface Collection {
  id: string;
  owner_id: string;
  album_id: string;
  display_name: string;
  created_at: string;
  albums?: Album;
  profiles?: Profile;
}

export interface CollectionCollaborator {
  collection_id: string;
  user_id: string;
  can_edit: boolean;
  created_at: string;
  profiles?: Profile;
}

export interface CollectionSticker {
  id: string;
  collection_id: string;
  sticker_id: string;
  status: StickerStatus;
  duplicate_count: number;
  updated_at: string;
  stickers?: Sticker;
}

export interface CategoryWithStickers extends StickerCategory {
  stickers: (Sticker & { collectionSticker?: CollectionSticker })[];
}
