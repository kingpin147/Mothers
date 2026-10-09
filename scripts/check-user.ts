import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const sql = postgres(process.env.DATABASE_URL!);
  try {
    const persons = await sql`SELECT id, email, first_name, last_name, credit_balance, role, created_at FROM person WHERE email ILIKE '%kwamba%'`;
    console.log('Persons found:', JSON.stringify(persons, null, 2));

    const members = await sql`
      SELECT m.id, m.person_id, m.status, m.tier, m.stripe_subscription_id, m.stripe_customer_id, m.current_period_end, m.cancel_at_period_end 
      FROM member m 
      JOIN person p ON m.person_id = p.id 
      WHERE p.email ILIKE '%kwamba%'
    `;
    console.log('Members found:', JSON.stringify(members, null, 2));

    const bookings = await sql`
      SELECT b.id, b.event_id, b.status, b.kind, b.credits_charged, b.created_at 
      FROM booking b 
      JOIN person p ON b.person_id = p.id 
      WHERE p.email ILIKE '%kwamba%'
    `;
    console.log('Bookings found:', JSON.stringify(bookings, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await sql.end();
  }
}
run();
