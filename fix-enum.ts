import postgres from 'postgres';

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);
  
  try {
    console.log('Adding waitlist to booking_status enum...');
    await sql`ALTER TYPE "public"."booking_status" ADD VALUE 'waitlist';`;
    console.log('Successfully added waitlist!');
  } catch (error) {
    console.error('Error adding enum value:', error);
  } finally {
    await sql.end();
  }
}

main();
