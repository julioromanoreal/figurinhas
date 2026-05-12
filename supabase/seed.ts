import { createClient } from "@supabase/supabase-js";
import { COPA2026_CATEGORIES, COPA2026_ALBUM_SLUG } from "../src/lib/stickers/copa2026";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function seed() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log("Seeding Copa do Mundo 2026 album...");

  const { data: album, error: albumError } = await supabase
    .from("albums")
    .upsert({
      name: "Copa do Mundo FIFA 2026",
      year: 2026,
      slug: COPA2026_ALBUM_SLUG,
      description: "Álbum oficial Panini da Copa do Mundo FIFA 2026 — USA, Canada & Mexico",
    }, { onConflict: "slug" })
    .select()
    .single();

  if (albumError) {
    console.error("Error inserting album:", albumError);
    process.exit(1);
  }

  console.log("Album created:", album.id);

  for (let catIndex = 0; catIndex < COPA2026_CATEGORIES.length; catIndex++) {
    const category = COPA2026_CATEGORIES[catIndex];

    const { data: cat, error: catError } = await supabase
      .from("sticker_categories")
      .upsert({
        album_id: album.id,
        name: category.name,
        sort_order: catIndex,
      }, { onConflict: "album_id,name" })
      .select()
      .single();

    if (catError) {
      console.error(`Error inserting category ${category.name}:`, catError);
      continue;
    }

    const stickersToInsert = category.stickers.map((s, sIndex) => ({
      category_id: cat.id,
      code: s.code,
      name: s.name,
      sort_order: sIndex,
    }));

    const { error: stickerError } = await supabase
      .from("stickers")
      .upsert(stickersToInsert, { onConflict: "category_id,code" });

    if (stickerError) {
      console.error(`Error inserting stickers for ${category.name}:`, stickerError);
    } else {
      console.log(`  ✓ ${category.name} (${category.stickers.length} stickers)`);
    }
  }

  console.log("Seed complete!");
}

seed().catch(console.error);
