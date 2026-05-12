import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: ownCollections } = await supabase
    .from("collections")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (ownCollections && ownCollections.length > 0) {
    redirect(`/collections/${ownCollections[0].id}`);
  }

  const { data: sharedCollections } = await supabase
    .from("collection_collaborators")
    .select("collection_id")
    .eq("user_id", user.id)
    .limit(1);

  if (sharedCollections && sharedCollections.length > 0) {
    redirect(`/collections/${sharedCollections[0].collection_id}`);
  }

  redirect("/collections/new");
}
