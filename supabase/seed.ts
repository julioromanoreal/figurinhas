import { createClient } from "@supabase/supabase-js";
import { COPA2026_CATEGORIES, COPA2026_ALBUM_SLUG } from "../src/lib/stickers/copa2026";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function seed() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log("Seeding Copa do Mundo 2026 album...");

  const { data: album, error: albumError } = await supabase
    .from("albums")
    .upsert(
      {
        name: "Copa do Mundo FIFA 2026",
        year: 2026,
        slug: COPA2026_ALBUM_SLUG,
        description: "Álbum oficial Panini da Copa do Mundo FIFA 2026 — USA, Canada & Mexico",
      },
      { onConflict: "slug" }
    )
    .select()
    .single();

  if (albumError) {
    console.error("Error upserting album:", albumError);
    process.exit(1);
  }

  console.log("Album:", album.id);

  const { data: existingCategories } = await supabase
    .from("sticker_categories")
    .select("id, name")
    .eq("album_id", album.id);

  const existingCatMap = new Map((existingCategories ?? []).map((c) => [c.name, c.id]));

  const { data: existingStickers } = await supabase
    .from("stickers")
    .select("code, category_id")
    .limit(5000);

  const existingStickerSet = new Set(
    (existingStickers ?? []).map((s) => `${s.category_id}:${s.code}`)
  );

  let insertedCategories = 0;
  let insertedStickers = 0;
  let skippedStickers = 0;

  for (let catIndex = 0; catIndex < COPA2026_CATEGORIES.length; catIndex++) {
    const category = COPA2026_CATEGORIES[catIndex];

    let catId = existingCatMap.get(category.name);

    if (!catId) {
      const { data: cat, error: catError } = await supabase
        .from("sticker_categories")
        .insert({ album_id: album.id, name: category.name, sort_order: catIndex })
        .select()
        .single();

      if (catError) {
        console.error(`  ✗ Category "${category.name}":`, catError.message);
        continue;
      }

      catId = cat.id;
      insertedCategories++;
    }

    const missing = category.stickers.filter(
      (s, sIndex) => !existingStickerSet.has(`${catId}:${s.code}`)
    );

    if (missing.length === 0) {
      skippedStickers += category.stickers.length;
      continue;
    }

    const { error: stickerError } = await supabase.from("stickers").insert(
      missing.map((s, i) => ({
        category_id: catId,
        code: s.code,
        name: s.name,
        sort_order: category.stickers.findIndex((x) => x.code === s.code),
      }))
    );

    if (stickerError) {
      console.error(`  ✗ Stickers for "${category.name}":`, stickerError.message);
    } else {
      console.log(`  ✓ ${category.name}: +${missing.length} stickers`);
      insertedStickers += missing.length;
      skippedStickers += category.stickers.length - missing.length;
    }
  }

  console.log(`\nDone!`);
  console.log(`  Categories inserted: ${insertedCategories}`);
  console.log(`  Stickers inserted:   ${insertedStickers}`);
  console.log(`  Stickers already OK: ${skippedStickers}`);
}

seed().catch(console.error);
