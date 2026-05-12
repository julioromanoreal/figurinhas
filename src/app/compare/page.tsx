"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import QRCode from "react-qr-code";
import Link from "next/link";

interface StickerInfo {
  id: string;
  code: string;
  name: string;
  category_name: string;
}

interface TradeResult {
  myDuplicatesThatTheyNeed: StickerInfo[];
  theirDuplicatesThatINeed: StickerInfo[];
  collectionAName: string;
  collectionBName: string;
}

function CompareContent() {
  const params = useSearchParams();
  const collectionAId = params.get("a");
  const collectionBId = params.get("b");
  const supabase = createClient();

  const [myCollections, setMyCollections] = useState<{ id: string; display_name: string }[]>([]);
  const [selectedMyCollection, setSelectedMyCollection] = useState("");
  const [result, setResult] = useState<TradeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCurrentUrl(window.location.origin);
  }, []);

  useEffect(() => {
    async function loadMyCollections() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("collections")
        .select("id, display_name")
        .eq("owner_id", user.id);

      if (data) {
        setMyCollections(data);
        if (data[0] && !collectionBId) setSelectedMyCollection(data[0].id);
      }
    }
    loadMyCollections();
  }, [collectionBId]);

  const runComparison = useCallback(async (aId: string, bId: string) => {
    setLoading(true);
    setResult(null);

    const [colA, colB, stickersAData, stickersBData, stickersInfo] = await Promise.all([
      supabase.from("collections").select("display_name").eq("id", aId).single(),
      supabase.from("collections").select("display_name").eq("id", bId).single(),
      supabase.from("collection_stickers").select("sticker_id, status, duplicate_count").eq("collection_id", aId),
      supabase.from("collection_stickers").select("sticker_id, status, duplicate_count").eq("collection_id", bId),
      supabase.from("stickers").select("id, code, name, sticker_categories(name)"),
    ]);

    const stickerDetails = new Map<string, StickerInfo>();
    (stickersInfo.data ?? []).forEach((s) => {
      stickerDetails.set(s.id, {
        id: s.id,
        code: s.code,
        name: s.name,
        category_name: (s.sticker_categories as { name?: string })?.name ?? "",
      });
    });

    const aDuplicates = new Set<string>();
    const aMissing = new Set<string>();
    const bDuplicates = new Set<string>();
    const bMissing = new Set<string>();

    (stickersAData.data ?? []).forEach((cs) => {
      if (cs.status === "owned" && cs.duplicate_count > 0) aDuplicates.add(cs.sticker_id);
      if (!cs || cs.status === "missing") aMissing.add(cs.sticker_id);
    });

    (stickersBData.data ?? []).forEach((cs) => {
      if (cs.status === "owned" && cs.duplicate_count > 0) bDuplicates.add(cs.sticker_id);
      if (!cs || cs.status === "missing") bMissing.add(cs.sticker_id);
    });

    const allStickerIds = new Set([
      ...(stickersAData.data ?? []).map((cs) => cs.sticker_id),
      ...(stickersBData.data ?? []).map((cs) => cs.sticker_id),
    ]);

    const missingFromA = new Set<string>();
    const missingFromB = new Set<string>();

    allStickerIds.forEach((sid) => {
      const inA = (stickersAData.data ?? []).find((cs) => cs.sticker_id === sid);
      const inB = (stickersBData.data ?? []).find((cs) => cs.sticker_id === sid);
      if (!inA || inA.status === "missing") missingFromA.add(sid);
      if (!inB || inB.status === "missing") missingFromB.add(sid);
    });

    const myDuplicatesThatTheyNeed: StickerInfo[] = [];
    const theirDuplicatesThatINeed: StickerInfo[] = [];

    aDuplicates.forEach((sid) => {
      if (missingFromB.has(sid)) {
        const info = stickerDetails.get(sid);
        if (info) myDuplicatesThatTheyNeed.push(info);
      }
    });

    bDuplicates.forEach((sid) => {
      if (missingFromA.has(sid)) {
        const info = stickerDetails.get(sid);
        if (info) theirDuplicatesThatINeed.push(info);
      }
    });

    myDuplicatesThatTheyNeed.sort((a, b) => a.code.localeCompare(b.code));
    theirDuplicatesThatINeed.sort((a, b) => a.code.localeCompare(b.code));

    setResult({
      myDuplicatesThatTheyNeed,
      theirDuplicatesThatINeed,
      collectionAName: colA.data?.display_name ?? "Coleção A",
      collectionBName: colB.data?.display_name ?? "Coleção B",
    });

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (collectionAId && collectionBId) {
      runComparison(collectionAId, collectionBId);
    }
  }, [collectionAId, collectionBId, runComparison]);

  const shareUrl = collectionAId ? `${currentUrl}/compare?a=${collectionAId}` : "";

  if (collectionAId && !collectionBId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-green-600 text-white px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-white">← Voltar</Link>
          <h1 className="font-bold">QR Code para troca</h1>
        </header>

        <div className="max-w-sm mx-auto p-4 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
            <p className="text-sm text-gray-500 mb-4">
              Mostre este QR Code para outra pessoa. Ela vai escanear e o app vai mostrar quais repetidas você tem que ela precisa, e vice-versa.
            </p>
            {shareUrl && (
              <div className="flex justify-center p-4 bg-white rounded-xl">
                <QRCode value={shareUrl} size={200} />
              </div>
            )}
            <p className="text-xs text-gray-400 mt-3 break-all">{shareUrl}</p>
            <button
              onClick={() => { navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="mt-3 w-full border border-gray-200 text-gray-600 py-2 rounded-xl text-sm hover:bg-gray-50 transition-colors"
            >
              {copied ? "✓ Copiado!" : "Copiar link"}
            </button>
          </div>

          {myCollections.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-3">Comparar com outra coleção</h2>
              <select
                value={selectedMyCollection}
                onChange={(e) => setSelectedMyCollection(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm mb-3 text-gray-900"
              >
                {myCollections.map((c) => (
                  <option key={c.id} value={c.id}>{c.display_name}</option>
                ))}
              </select>
              <Link
                href={`/compare?a=${collectionAId}&b=${selectedMyCollection}`}
                className="block w-full bg-green-600 text-white py-2 rounded-xl text-sm font-medium text-center hover:bg-green-700"
              >
                Ver análise de trocas
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (collectionAId && collectionBId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-green-600 text-white px-4 py-4 flex items-center gap-3">
          <Link href={`/compare?a=${collectionAId}`} className="text-white">← Voltar</Link>
          <h1 className="font-bold">Análise de trocas</h1>
        </header>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-400">Analisando coleções...</div>
          </div>
        )}

        {result && (
          <div className="max-w-lg mx-auto p-4 space-y-4">
            <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
              <p className="text-sm text-green-700">
                Comparando <strong>{result.collectionAName}</strong> com <strong>{result.collectionBName}</strong>
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-1">
                Suas repetidas que {result.collectionBName} precisa
              </h2>
              <p className="text-xs text-gray-400 mb-3">
                {result.myDuplicatesThatTheyNeed.length} figurinha(s)
              </p>
              {result.myDuplicatesThatTheyNeed.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Nenhuma correspondência</p>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {result.myDuplicatesThatTheyNeed.map((s) => (
                    <div key={s.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <span className="text-sm font-medium text-gray-900">{s.code}</span>
                      <span className="text-xs text-gray-500 text-right">{s.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-1">
                Repetidas de {result.collectionBName} que você precisa
              </h2>
              <p className="text-xs text-gray-400 mb-3">
                {result.theirDuplicatesThatINeed.length} figurinha(s)
              </p>
              {result.theirDuplicatesThatINeed.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Nenhuma correspondência</p>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {result.theirDuplicatesThatINeed.map((s) => (
                    <div key={s.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <span className="text-sm font-medium text-gray-900">{s.code}</span>
                      <span className="text-xs text-gray-500 text-right">{s.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <p className="text-4xl mb-4">🔄</p>
        <p className="text-gray-500">Escaneie o QR Code de outra pessoa para ver a análise de trocas.</p>
        <Link href="/" className="mt-4 inline-block text-green-600 underline text-sm">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Carregando...</p></div>}>
      <CompareContent />
    </Suspense>
  );
}
