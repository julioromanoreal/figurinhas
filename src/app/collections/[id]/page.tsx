import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CollectionClient from "./CollectionClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CollectionPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: collection, error: collectionError } = await supabase
    .from("collections")
    .select("*, albums(*)")
    .eq("id", id)
    .single();

  if (collectionError || !collection) redirect("/collections/new");

  const isOwner = collection.owner_id === user.id;
  const { data: collaborator } = await supabase
    .from("collection_collaborators")
    .select("can_edit")
    .eq("collection_id", id)
    .eq("user_id", user.id)
    .single();

  const canEdit = isOwner || (collaborator?.can_edit ?? false);
  const hasAccess = isOwner || !!collaborator;
  if (!hasAccess) redirect("/collections/new");

  const { data: categoriesWithStickers } = await supabase
    .from("sticker_categories")
    .select("*, stickers(*)")
    .eq("album_id", collection.album_id)
    .order("sort_order")
    .order("sort_order", { referencedTable: "stickers" });

  const categories = (categoriesWithStickers ?? []).map(({ stickers: _s, ...cat }) => cat);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stickers = (categoriesWithStickers ?? []).flatMap((cat) => (cat.stickers as any[]) ?? []);

  const { data: collectionStickers } = await supabase
    .from("collection_stickers")
    .select("*")
    .eq("collection_id", id);

  const { data: userCollections } = await supabase
    .from("collections")
    .select("id, display_name")
    .eq("owner_id", user.id)
    .order("created_at");

  const { data: sharedCollections } = await supabase
    .from("collection_collaborators")
    .select("collections(id, display_name)")
    .eq("user_id", user.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sharedFlat: { id: string; display_name: string }[] = (sharedCollections ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((sc) => sc.collections as any)
    .filter((c: unknown) => c && typeof c === "object" && !Array.isArray(c))
    .map((c: unknown) => ({ id: (c as { id: string }).id, display_name: (c as { display_name: string }).display_name }));

  const allCollections: { id: string; display_name: string }[] = [
    ...(userCollections ?? []),
    ...sharedFlat,
  ];

  return (
    <CollectionClient
      collection={collection}
      categories={categories ?? []}
      stickers={stickers ?? []}
      initialCollectionStickers={collectionStickers ?? []}
      canEdit={canEdit}
      isOwner={isOwner}
      currentUserId={user.id}
      allCollections={allCollections}
    />
  );
}
