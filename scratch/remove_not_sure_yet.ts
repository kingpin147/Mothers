import { db } from "../src/db/index";
import { gazettePost, gazetteReply, member } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Starting to remove 'Not sure yet' from database...");
  
  // 1. Update members
  const membersWithNotSure = await db.query.member.findMany({
    where: eq(member.neighbourhood, "Not sure yet"),
  });
  console.log(`Found ${membersWithNotSure.length} members with 'Not sure yet'. Updating to 'Barcelona'...`);
  for (const m of membersWithNotSure) {
    await db.update(member).set({ neighbourhood: "Barcelona" }).where(eq(member.id, m.id));
  }

  // 2. Update gazettePosts
  const postsWithNotSure = await db.query.circlePost.findMany({
    where: eq(gazettePost.anonymousArea, "Not sure yet"),
  });
  console.log(`Found ${postsWithNotSure.length} posts with 'Not sure yet'. Updating to 'Barcelona'...`);
  for (const p of postsWithNotSure) {
    await db.update(gazettePost).set({ anonymousArea: "Barcelona" }).where(eq(gazettePost.id, p.id));
  }

  // 3. Update gazetteReplies
  const repliesWithNotSure = await db.query.circleReply.findMany({
    where: eq(gazetteReply.anonymousArea, "Not sure yet"),
  });
  console.log(`Found ${repliesWithNotSure.length} replies with 'Not sure yet'. Updating to 'Barcelona'...`);
  for (const r of repliesWithNotSure) {
    await db.update(gazetteReply).set({ anonymousArea: "Barcelona" }).where(eq(gazetteReply.id, r.id));
  }

  console.log("Finished cleanup of 'Not sure yet'.");
}

main().catch(console.error);
