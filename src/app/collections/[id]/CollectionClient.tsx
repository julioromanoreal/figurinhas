"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import StickerGrid from "@/components/StickerGrid";
import type { Collection, StickerCategory, Sticker, CollectionSticker } from "@/lib/types";
import Link from "next/link";

interface Props {
  collection: Collection;
  categories: StickerCategory[];
  stickers: Sticker[];
  initialCollectionStickers: CollectionSticker[];
  canEdit: boolean;
  isOwner: boolean;
  currentUserId: string;
  allCollections: { id: string; display_name: string }[];
}

export default function CollectionClient({
  collection,
  categories,
  stickers,
  initialCollectionStickers,
  canEdit,
  isOwner,
  currentUserId,
  allCollections,
}: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [collectionStickers, setCollectionStickers] = useState<CollectionSticker[]>(initialCollectionStickers);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const totalOwned = collectionStickers.filter((cs) => cs.status === "owned").length;
  const progress = stickers.length > 0 ? (totalOwned / stickers.length) * 100 : 0;

  useEffect(() => {
    const channel = supabase
      .channel(`collection:${collection.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "collection_stickers",
          filter: `collection_id=eq.${collection.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setCollectionStickers((prev) => [...prev, payload.new as CollectionSticker]);
          } else if (payload.eventType === "UPDATE") {
            setCollectionStickers((prev) =>
              prev.map((cs) => cs.id === payload.new.id ? payload.new as CollectionSticker : cs)
            );
          } else if (payload.eventType === "DELETE") {
            setCollectionStickers((prev) => prev.filter((cs) => cs.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [collection.id, supabase]);

  const handleToggleSticker = useCallback(async (stickerId: string, current?: CollectionSticker) => {
    if (!canEdit) return;
    setSaving(true);

    if (!current || current.status === "missing") {
      if (!current) {
        const { data, error } = await supabase
          .from("collection_stickers")
          .insert({ collection_id: collection.id, sticker_id: stickerId, status: "owned", duplicate_count: 0 })
          .select()
          .single();
        if (error) console.error("insert error:", error);
        if (data) setCollectionStickers((prev) => [...prev, data]);
      } else {
        const { data, error } = await supabase
          .from("collection_stickers")
          .update({ status: "owned" })
          .eq("id", current.id)
          .select()
          .single();
        if (error) console.error("update error:", error);
        if (data) setCollectionStickers((prev) => prev.map((cs) => cs.id === data.id ? data : cs));
      }
    } else {
      const { data, error } = await supabase
        .from("collection_stickers")
        .update({ status: "missing", duplicate_count: 0 })
        .eq("id", current.id)
        .select()
        .single();
      if (error) console.error("update missing error:", error);
      if (data) setCollectionStickers((prev) => prev.map((cs) => cs.id === data.id ? data : cs));
    }

    setSaving(false);
  }, [canEdit, collection.id, supabase]);

  const handleDuplicateChange = useCallback(async (stickerId: string, count: number) => {
    if (!canEdit) return;
    const current = collectionStickers.find((cs) => cs.sticker_id === stickerId);
    if (!current || current.status !== "owned") return;

    setSaving(true);
    const { data } = await supabase
      .from("collection_stickers")
      .update({ duplicate_count: count })
      .eq("id", current.id)
      .select()
      .single();
    if (data) setCollectionStickers((prev) => prev.map((cs) => cs.id === data.id ? data : cs));
    setSaving(false);
  }, [canEdit, collectionStickers, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-green-600 text-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl">⚽</span>
            <div className="min-w-0">
              <h1 className="font-bold text-sm leading-tight truncate">{collection.display_name}</h1>
              <p className="text-green-200 text-xs truncate">
                {(collection.albums as { name?: string })?.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {saving && (
              <span className="text-xs text-green-200 animate-pulse">Salvando...</span>
            )}
            <div className="text-right text-xs">
              <div className="font-semibold">{totalOwned}/{stickers.length}</div>
              <div className="text-green-200">{progress.toFixed(0)}%</div>
            </div>
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                ☰
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 top-full mt-1 bg-white text-gray-900 rounded-xl shadow-xl border border-gray-100 w-56 z-50 text-sm overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {allCollections.map((col) => (
                    <Link
                      key={col.id}
                      href={`/collections/${col.id}`}
                      className={`block px-4 py-3 hover:bg-gray-50 ${col.id === collection.id ? "bg-green-50 text-green-700 font-medium" : ""}`}
                      onClick={() => setMenuOpen(false)}
                    >
                      📖 {col.display_name}
                    </Link>
                  ))}
                  <hr className="border-gray-100" />
                  <Link
                    href="/collections/new"
                    className="block px-4 py-3 hover:bg-gray-50 text-green-600"
                    onClick={() => setMenuOpen(false)}
                  >
                    + Nova coleção
                  </Link>
                  {isOwner && (
                    <Link
                      href={`/collections/${collection.id}/settings`}
                      className="block px-4 py-3 hover:bg-gray-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      ⚙️ Gerenciar coleção
                    </Link>
                  )}
                  <Link
                    href={`/compare?a=${collection.id}`}
                    className="block px-4 py-3 hover:bg-gray-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    🔄 QR Code para troca
                  </Link>
                  <hr className="border-gray-100" />
                  <Link
                    href="/settings"
                    className="block px-4 py-3 hover:bg-gray-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    👤 Meu perfil
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 text-red-500"
                  >
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 pb-3">
          <div className="h-1.5 bg-green-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {menuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <main className="flex-1 overflow-hidden">
        <StickerGrid
          categories={categories}
          stickers={stickers}
          collectionStickers={collectionStickers}
          onToggleSticker={handleToggleSticker}
          onDuplicateChange={handleDuplicateChange}
          readOnly={!canEdit}
        />
      </main>
    </div>
  );
}
