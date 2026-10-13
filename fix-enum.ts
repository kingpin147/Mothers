import postgres from 'postgres';

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);
  
  try {
    console.log('Adding cancelled to booking_status enum...');
    await sql`ALTER TYPE "public"."booking_status" ADD VALUE IF NOT EXISTS 'cancelled';`;
    console.log('Successfully added cancelled to booking_status!');
    const rows = await sql`SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'booking_status';`;
    console.log('Verified booking_status enum values in DB:', rows.map(r => r.enumlabel));
  } catch (error) {
    console.error('Error adding enum value:', error);
  } finally {
    await sql.end();
  }
}

main();
