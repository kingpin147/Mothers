import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generatePostSlug(body: string, fallbackId?: string): string {
  const cleaned = body.replace(/\r\n/g, "\n").trim();
  const lines = cleaned.split("\n").map(l => l.trim()).filter(Boolean);
  
  // Prefer the first non-greeting line
  const greetingRegex = /^(hello|hi|hey|hola|bonjour|salut|dear)\b.*[,!.]?$/i;
  let chosenText = lines.find(l => !greetingRegex.test(l) && l.length > 5);
  
  if (!chosenText) {
    chosenText = lines[0] || body;
  }
  
  // Also if chosenText contains questions like "Anyone is selling one" or "I am looking for..."
  // Try to pick up to 8 words
  const words = chosenText.split(/\s+/).slice(0, 8).join(" ");
  let slug = slugify(words);
  
  if (slug.length > 60) {
    slug = slug.slice(0, 60).replace(/-[^-]*$/, "");
  }
  
  if (!slug && fallbackId) {
    slug = `post-${fallbackId.slice(0, 8)}`;
  }
  
  return slug || "post";
}

async function main() {
  const rawUrl = process.env.DATABASE_URL!;
  const cleanedUrl = rawUrl.replace(/^["']|["']$/g, '');
  const sql = postgres(cleanedUrl);

  try {
    console.log("1. Adding slug column to circle_post if not exists...");
    await sql`ALTER TABLE "circle_post" ADD COLUMN IF NOT EXISTS "slug" text;`;
    
    console.log("2. Fetching posts...");
    const posts = await sql`SELECT id, body, slug FROM "circle_post" ORDER BY created_at ASC;`;
    console.log(`Found ${posts.length} posts.`);

    const usedSlugs = new Set<string>();

    for (const p of posts) {
      let baseSlug = p.slug || generatePostSlug(p.body, p.id);
      
      // Specifically check for Rachel's crib post
      if (p.id === 'd508e3e7-afa2-4446-9fbe-81a49618558f' || p.body.toLowerCase().includes('70x140 crib') || p.body.toLowerCase().includes('cot')) {
        baseSlug = 'second-hand-70x140-crib';
      }

      let uniqueSlug = baseSlug;
      let counter = 2;
      while (usedSlugs.has(uniqueSlug)) {
        uniqueSlug = `${baseSlug}-${counter}`;
        counter++;
      }
      usedSlugs.add(uniqueSlug);

      if (p.slug !== uniqueSlug) {
        console.log(`Setting slug for post ${p.id.slice(0, 8)}: "${uniqueSlug}"`);
        await sql`UPDATE "circle_post" SET "slug" = ${uniqueSlug} WHERE "id" = ${p.id};`;
      } else {
        console.log(`Post ${p.id.slice(0, 8)} already has slug: "${uniqueSlug}"`);
      }
    }

    console.log("3. Creating index on slug...");
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS "idx_circle_post_slug" ON "circle_post" ("slug");`;

    console.log("Done! Slugs migrated successfully.");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await sql.end();
  }
}

main();

