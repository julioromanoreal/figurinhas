"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import StickerGrid from "@/components/StickerGrid";
import type { Collection, StickerCategory, Sticker, CollectionSticker } from "@/lib/types";
import Link from "next/link";
import Spinner from "@/components/Spinner";

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

type ShareMode = "all" | "owned" | "missing" | "duplicates";

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
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [collectionStickers, setCollectionStickers] = useState<CollectionSticker[]>(initialCollectionStickers);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [loadingSignOut, setLoadingSignOut] = useState(false);

  const totalOwned = collectionStickers.filter((cs) => cs.status === "owned").length;
  const progress = stickers.length > 0 ? (totalOwned / stickers.length) * 100 : 0;

  const isSubscribed = useRef(false);

  const refetchStickers = useCallback(async () => {
    const { data } = await supabase
      .from("collection_stickers")
      .select("*")
      .eq("collection_id", collection.id);
    if (data) setCollectionStickers(data);
  }, [collection.id, supabase]);

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
            setCollectionStickers((prev) => {
              if (prev.some((cs) => cs.id === payload.new.id)) return prev;
              return [...prev, payload.new as CollectionSticker];
            });
          } else if (payload.eventType === "UPDATE") {
            setCollectionStickers((prev) =>
              prev.map((cs) => cs.id === payload.new.id ? payload.new as CollectionSticker : cs)
            );
          } else if (payload.eventType === "DELETE") {
            setCollectionStickers((prev) => prev.filter((cs) => cs.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          if (isSubscribed.current) {
            refetchStickers();
          }
          isSubscribed.current = true;
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [collection.id, refetchStickers]); // supabase is memoized, stable reference

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refetchStickers();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [refetchStickers]);

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

  const generateShareText = useCallback((mode: ShareMode) => {
    const stickerMap = new Map(collectionStickers.map((cs) => [cs.sticker_id, cs]));
    const totalDuplicates = collectionStickers.reduce((sum, cs) => sum + (cs.status === "owned" ? (cs.duplicate_count ?? 0) : 0), 0);
    const getNum = (code: string) => code.split("-")[1] ?? code;

    const modeLabel: Record<ShareMode, string> = {
      all: "Lista completa",
      owned: "Figurinhas que tenho",
      missing: "Figurinhas que faltam",
      duplicates: "Figurinhas repetidas",
    };

    const lines: string[] = [];
    lines.push(`*${collection.display_name} - Copa do Mundo 2026*`);
    lines.push(`_${modeLabel[mode]}_`);
    lines.push(`✅ Tenho: ${totalOwned}/${stickers.length} (${progress.toFixed(0)}%) | 🔄 Repetidas: ${totalDuplicates} | ❌ Faltam: ${stickers.length - totalOwned}`);

    for (const cat of categories) {
      const catStickers = stickers
        .filter((s) => s.category_id === cat.id)
        .sort((a, b) => a.sort_order - b.sort_order);
      if (catStickers.length === 0) continue;

      const owned = catStickers.filter((s) => stickerMap.get(s.id)?.status === "owned");
      const missing = catStickers.filter((s) => { const cs = stickerMap.get(s.id); return !cs || cs.status === "missing"; });
      const duplicates = owned.filter((s) => (stickerMap.get(s.id)?.duplicate_count ?? 0) > 0);

      const catLines: string[] = [];
      if (mode === "all" || mode === "owned") {
        if (owned.length > 0) catLines.push(`✅ ${owned.map((s) => getNum(s.code)).join(", ")}`);
      }
      if (mode === "all" || mode === "missing") {
        if (missing.length > 0) catLines.push(`❌ ${missing.map((s) => getNum(s.code)).join(", ")}`);
      }
      if (mode === "all" || mode === "duplicates") {
        if (duplicates.length > 0) catLines.push(`🔄 ${duplicates.map((s) => `${getNum(s.code)} (x${stickerMap.get(s.id)!.duplicate_count})`).join(", ")}`);
      }

      if (catLines.length > 0) {
        lines.push(`\n*${cat.name}*`);
        lines.push(...catLines);
      }
    }

    return lines.join("\n");
  }, [categories, stickers, collectionStickers, collection.display_name, totalOwned, progress]);

  const handleShare = useCallback(async (mode: ShareMode) => {
    const text = generateShareText(mode);
    setShareModalOpen(false);
    if (navigator.share) {
      await navigator.share({ text });
    } else {
      await navigator.clipboard.writeText(text);
      alert("Lista copiada para a área de transferência!");
    }
  }, [generateShareText]);

  const handleSignOut = async () => {
    setLoadingSignOut(true);
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
                  <button
                    onClick={() => { setMenuOpen(false); setShareModalOpen(true); }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50"
                  >
                    📤 Compartilhar lista
                  </button>
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
                    disabled={loadingSignOut}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 text-red-500 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loadingSignOut && <Spinner className="h-3 w-3 text-red-400" />}
                    {loadingSignOut ? "Saindo..." : "Sair"}
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

      {shareModalOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShareModalOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl p-5 space-y-3">
            <h2 className="font-semibold text-gray-900 text-center mb-1">O que deseja compartilhar?</h2>
            {(
              [
                { mode: "all", label: "📋 Lista completa" },
                { mode: "owned", label: "✅ Somente as que tenho" },
                { mode: "missing", label: "❌ Somente as que faltam" },
                { mode: "duplicates", label: "🔄 Somente as repetidas" },
              ] as { mode: ShareMode; label: string }[]
            ).map(({ mode, label }) => (
              <button
                key={mode}
                onClick={() => handleShare(mode)}
                className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-800 transition-colors"
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setShareModalOpen(false)}
              className="w-full text-center py-3 text-sm text-gray-400 hover:text-gray-600"
            >
              Cancelar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
