import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: collections } = await supabase
    .from("collections")
    .select("id, display_name, albums(name, year)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const { data: sharedCollections } = await supabase
    .from("collection_collaborators")
    .select("collection_id, collections(id, display_name, albums(name, year), profiles(display_name))")
    .eq("user_id", user.id);

  if (!collections || collections.length === 0) redirect("/collections/new");

  const firstId = collections[0]?.id;
  if (!firstId) redirect("/collections/new");

  redirect(`/collections/${firstId}`);
}
