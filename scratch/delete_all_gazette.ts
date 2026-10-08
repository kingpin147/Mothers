import { db } from "../src/db/index";
import { gazettePost, gazetteReply, gazetteHeart, gazetteReport } from "../src/db/schema";

async function main() {
  console.log("Starting to delete all Gazette data...");
  
  // Delete in order to respect foreign key constraints
  console.log("Deleting reports...");
  await db.delete(gazetteReport);
  
  console.log("Deleting hearts...");
  await db.delete(gazetteHeart);
  
  console.log("Deleting replies...");
  await db.delete(gazetteReply);
  
  console.log("Deleting posts...");
  await db.delete(gazettePost);

  console.log("Successfully deleted all Gazette posts, replies, hearts, and reports.");
}

main().catch(console.error);
