"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CollectionCollaborator, Collection } from "@/lib/types";
import Spinner from "@/components/Spinner";

interface Props {
  params: Promise<{ id: string }>;
}

export default function CollectionSettingsPage({ params }: Props) {
  const { id } = use(params);
  const supabase = createClient();
  const router = useRouter();

  const [collection, setCollection] = useState<Collection | null>(null);
  const [collaborators, setCollaborators] = useState<CollectionCollaborator[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteCanEdit, setInviteCanEdit] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: col } = await supabase
        .from("collections")
        .select("*, albums(*)")
        .eq("id", id)
        .single();

      if (!col) { router.push("/"); return; }

      const { data: { user } } = await supabase.auth.getUser();
      if (col.owner_id !== user?.id) { router.push(`/collections/${id}`); return; }

      setCollection(col);
      setDisplayName(col.display_name);

      const { data: collabs } = await supabase
        .from("collection_collaborators")
        .select("*, profiles(*)")
        .eq("collection_id", id);

      setCollaborators(collabs ?? []);
    }
    load();
  }, [id]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoadingSave(true);
    const { error } = await supabase
      .from("collections")
      .update({ display_name: displayName })
      .eq("id", id);
    if (error) setError(error.message);
    else setSuccess("Nome atualizado!");
    setLoadingSave(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoadingInvite(true);

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, display_name, username")
      .eq("username", inviteUsername.toLowerCase())
      .single();

    if (!profile) {
      setError(`Usuário "${inviteUsername}" não encontrado.`);
      setLoadingInvite(false);
      return;
    }

    if (profile.id === collection?.owner_id) {
      setError("Você não pode se convidar.");
      setLoadingInvite(false);
      return;
    }

    const { error } = await supabase
      .from("collection_collaborators")
      .upsert({ collection_id: id, user_id: profile.id, can_edit: inviteCanEdit });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(`${profile.display_name} adicionado(a) com sucesso!`);
      setInviteUsername("");

      const { data: collabs } = await supabase
        .from("collection_collaborators")
        .select("*, profiles(*)")
        .eq("collection_id", id);
      setCollaborators(collabs ?? []);
    }
    setLoadingInvite(false);
  };

  const handleRemoveCollaborator = async (userId: string) => {
    setRemovingId(userId);
    await supabase
      .from("collection_collaborators")
      .delete()
      .eq("collection_id", id)
      .eq("user_id", userId);
    setCollaborators((prev) => prev.filter((c) => c.user_id !== userId));
    setRemovingId(null);
  };

  const handleDeleteCollection = async () => {
    if (!confirm("Tem certeza que deseja excluir esta coleção? Esta ação não pode ser desfeita.")) return;
    setLoadingDelete(true);
    await supabase.from("collections").delete().eq("id", id);
    router.push("/");
  };

  if (!collection) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-400">Carregando...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-600 text-white px-4 py-4 flex items-center gap-3">
        <Link href={`/collections/${id}`} className="text-white">
          ← Voltar
        </Link>
        <h1 className="font-bold">Gerenciar coleção</h1>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-3">Nome da coleção</h2>
          <form onSubmit={handleUpdateName} className="flex gap-2">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
            />
            <button
              type="submit"
              disabled={loadingSave}
              className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loadingSave && <Spinner />}
              {loadingSave ? "Salvando..." : "Salvar"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-3">Compartilhar com alguém</h2>
          <p className="text-sm text-gray-500 mb-4">
            Adicione a sua esposa, familiar ou amigo para que ambos possam ver e editar a coleção em tempo real.
          </p>
          <form onSubmit={handleInvite} className="space-y-3">
            <input
              type="text"
              value={inviteUsername}
              onChange={(e) => setInviteUsername(e.target.value)}
              placeholder="nome_de_usuario"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
              required
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="canEdit"
                checked={inviteCanEdit}
                onChange={(e) => setInviteCanEdit(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="canEdit" className="text-sm text-gray-600">
                Pode editar (marcar figurinhas)
              </label>
            </div>
            <button
              type="submit"
              disabled={loadingInvite}
              className="w-full bg-green-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loadingInvite && <Spinner />}
              {loadingInvite ? "Adicionando..." : "Adicionar colaborador"}
            </button>
          </form>

          {error && <p className="mt-3 text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          {success && <p className="mt-3 text-green-600 text-sm bg-green-50 rounded-lg px-3 py-2">{success}</p>}
        </div>

        {collaborators.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-3">Colaboradores</h2>
            <div className="space-y-2">
              {collaborators.map((collab) => (
                <div key={collab.user_id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {(collab.profiles as { display_name?: string })?.display_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      @{(collab.profiles as { username?: string })?.username} · {collab.can_edit ? "Pode editar" : "Somente leitura"}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveCollaborator(collab.user_id)}
                    disabled={removingId === collab.user_id}
                    className="text-red-400 hover:text-red-600 text-sm px-2 py-1 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {removingId === collab.user_id && <Spinner className="h-3 w-3 text-red-400" />}
                    {removingId === collab.user_id ? "Removendo..." : "Remover"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-red-100">
          <h2 className="font-semibold text-red-600 mb-2">Zona de perigo</h2>
          <button
            onClick={handleDeleteCollection}
            disabled={loadingDelete}
            className="w-full border border-red-200 text-red-500 py-2 rounded-xl text-sm font-medium hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loadingDelete && <Spinner className="h-4 w-4 text-red-400" />}
            {loadingDelete ? "Excluindo..." : "Excluir coleção"}
          </button>
        </div>
      </div>
    </div>
  );
}
