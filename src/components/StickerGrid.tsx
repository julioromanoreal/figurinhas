"use client";

import { useState, useMemo, useCallback } from "react";
import type { StickerCategory, Sticker, CollectionSticker } from "@/lib/types";
import StickerCard from "./StickerCard";

type FilterType = "all" | "owned" | "missing" | "duplicates";

interface Props {
  categories: StickerCategory[];
  stickers: Sticker[];
  collectionStickers: CollectionSticker[];
  onToggleSticker: (stickerId: string, current?: CollectionSticker) => void;
  onDuplicateChange: (stickerId: string, count: number) => void;
  readOnly?: boolean;
}

export default function StickerGrid({
  categories,
  stickers,
  collectionStickers,
  onToggleSticker,
  onDuplicateChange,
  readOnly,
}: Props) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(["all"]));

  const stickerMap = useMemo(() => {
    const map = new Map<string, CollectionSticker>();
    collectionStickers.forEach((cs) => map.set(cs.sticker_id, cs));
    return map;
  }, [collectionStickers]);

  const totalOwned = useMemo(
    () => collectionStickers.filter((cs) => cs.status === "owned").length,
    [collectionStickers]
  );
  const totalDuplicates = useMemo(
    () => collectionStickers.filter((cs) => cs.duplicate_count > 0).length,
    [collectionStickers]
  );

  const filteredCategories = useMemo(() => {
    return categories.map((cat) => {
      const catStickers = stickers.filter((s) => s.category_id === cat.id);
      const filtered = catStickers.filter((s) => {
        const cs = stickerMap.get(s.id);
        const q = search.toLowerCase();
        const matchesSearch =
          !search ||
          s.code.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          cat.name.toLowerCase().includes(q);

        if (!matchesSearch) return false;

        if (filter === "owned") return cs?.status === "owned";
        if (filter === "missing") return !cs || cs.status === "missing";
        if (filter === "duplicates") return (cs?.duplicate_count ?? 0) > 0;
        return true;
      });
      return { ...cat, filtered };
    }).filter((cat) => cat.filtered.length > 0);
  }, [categories, stickers, stickerMap, filter, search]);

  const toggleCategory = useCallback((catId: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }, []);

  const filters: { key: FilterType; label: string; count?: number }[] = [
    { key: "all", label: "Todos", count: stickers.length },
    { key: "owned", label: "Tenho", count: totalOwned },
    { key: "missing", label: "Faltam", count: stickers.length - totalOwned },
    { key: "duplicates", label: "Repetidas", count: totalDuplicates },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex gap-1 px-3 pt-3 pb-2 overflow-x-auto scrollbar-none">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f.key
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.label}
              {f.count !== undefined && (
                <span className={`ml-1.5 text-xs ${filter === f.key ? "opacity-80" : "opacity-60"}`}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="px-3 pb-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por número, nome ou país..."
            className="w-full px-3 py-2 text-sm bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 pb-24">
        {filteredCategories.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">🔍</p>
            <p>Nenhuma figurinha encontrada</p>
          </div>
        )}

        {filteredCategories.map((cat) => {
          const isOpen = openCategories.has(cat.id) || openCategories.has("all") || !!search;
          const ownedCount = cat.filtered.filter(
            (s) => stickerMap.get(s.id)?.status === "owned"
          ).length;

          return (
            <div key={cat.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{cat.name}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {ownedCount}/{cat.filtered.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${cat.filtered.length > 0 ? (ownedCount / cat.filtered.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-gray-400 text-sm">{isOpen ? "▲" : "▼"}</span>
                </div>
              </button>

              {isOpen && (
                <div className="px-3 pb-3 grid grid-cols-5 gap-1.5 sm:grid-cols-7 md:grid-cols-10">
                  {cat.filtered.map((sticker) => (
                    <StickerCard
                      key={sticker.id}
                      sticker={sticker}
                      collectionSticker={stickerMap.get(sticker.id)}
                      onToggle={onToggleSticker}
                      onDuplicateChange={onDuplicateChange}
                      readOnly={readOnly}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
