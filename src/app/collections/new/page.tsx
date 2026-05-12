"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Album } from "@/lib/types";
import Spinner from "@/components/Spinner";

export default function NewCollectionPage() {
  const router = useRouter();
  const supabase = createClient();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [albumId, setAlbumId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.from("albums").select("*").order("year", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setAlbums(data);
          if (data[0]) setAlbumId(data[0].id);
        }
      });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data, error } = await supabase
      .from("collections")
      .insert({ owner_id: user.id, album_id: albumId, display_name: displayName })
      .select()
      .single();

    if (error) {
      setError(error.message);
    } else {
      router.push(`/collections/${data.id}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">📖</div>
          <h1 className="text-2xl font-bold text-gray-900">Nova coleção</h1>
          <p className="text-gray-500 text-sm mt-1">Crie seu álbum para começar</p>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Álbum</label>
            <select
              value={albumId}
              onChange={(e) => setAlbumId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
              required
            >
              {albums.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome da coleção</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
              placeholder="Ex: Álbum do João"
              required
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Spinner />}
            {loading ? "Criando..." : "Criar coleção"}
          </button>
        </form>
      </div>
    </div>
  );
}
