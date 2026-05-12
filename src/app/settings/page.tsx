"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Profile } from "@/lib/types";
import Spinner from "@/components/Spinner";

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingSignOut, setLoadingSignOut] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data);
        setDisplayName(data.display_name);
      }
    }
    load();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", profile!.id);

    if (error) setError(error.message);
    else setSuccess("Perfil atualizado!");
    setLoading(false);
  };

  const handleSignOut = async () => {
    setLoadingSignOut(true);
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(profile!.username);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-400">Carregando...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-600 text-white px-4 py-4 flex items-center gap-3">
        <Link href="/" className="text-white">← Voltar</Link>
        <h1 className="font-bold">Meu perfil</h1>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-1">Conta</h2>
          <p className="text-sm text-gray-500 mb-4">@{profile.username}</p>

          <form onSubmit={handleUpdate} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome de exibição</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            {success && <p className="text-green-600 text-sm">{success}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Spinner />}
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-3">Compartilhe seu usuário</h2>
          <p className="text-sm text-gray-500 mb-2">
            Passe este nome para alguém te adicionar como colaborador na coleção deles:
          </p>
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3">
            <span className="font-mono font-bold text-green-700">@{profile.username}</span>
            <button
              onClick={handleCopy}
              className="ml-auto text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          disabled={loadingSignOut}
          className="w-full bg-white border border-red-200 text-red-500 py-3 rounded-2xl font-medium hover:bg-red-50 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loadingSignOut && <Spinner className="h-4 w-4 text-red-400" />}
          {loadingSignOut ? "Saindo..." : "Sair da conta"}
        </button>
      </div>
    </div>
  );
}
