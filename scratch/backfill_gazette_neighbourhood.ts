import { db } from "../src/db/index";
import { gazettePost, gazetteReply, member } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Starting backfill for Gazette Posts and Replies...");
  
  // Backfill Posts
  const posts = await db.query.circlePost.findMany();
  let updatedPosts = 0;
  for (const p of posts) {
    if (!p.anonymousArea || p.anonymousArea === "Barcelona") {
      const mem = await db.query.member.findFirst({
        where: eq(member.personId, p.personId),
      });
      if (mem?.neighbourhood && mem.neighbourhood !== p.anonymousArea) {
        await db.update(gazettePost)
          .set({ anonymousArea: mem.neighbourhood })
          .where(eq(gazettePost.id, p.id));
        updatedPosts++;
      }
    }
  }
  
  // Backfill Replies
  const replies = await db.query.circleReply.findMany();
  let updatedReplies = 0;
  for (const r of replies) {
    if (!r.anonymousArea || r.anonymousArea === "Barcelona") {
      const mem = await db.query.member.findFirst({
        where: eq(member.personId, r.personId),
      });
      if (mem?.neighbourhood && mem.neighbourhood !== r.anonymousArea) {
        await db.update(gazetteReply)
          .set({ anonymousArea: mem.neighbourhood })
          .where(eq(gazetteReply.id, r.id));
        updatedReplies++;
      }
    }
  }

  console.log(`Finished backfill. Updated ${updatedPosts} posts and ${updatedReplies} replies.`);
}

main().catch(console.error);
