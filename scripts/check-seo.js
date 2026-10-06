const seo = [
  {
    page: 'Layout / Root / Home',
    title: 'The Mothers — Private Moms Club & Community in Barcelona', // 56
    desc: 'The Mothers is a private moms club in Barcelona offering curated gatherings, genuine community, and trusted experiences designed for modern mothers and bumps.' // 158
  },
  {
    page: 'Membership',
    title: 'Private Membership for Mothers in Barcelona | The Mothers', // 57
    desc: 'Join The Mothers Barcelona private members club. Enjoy credit-based booking for curated gatherings, supportive stage groups, and exclusive partner privileges.' // 158
  },
  {
    page: 'Events',
    title: 'Upcoming Events and Gatherings for Mothers | The Mothers', // 56
    desc: 'Discover curated walks, play dates, mothers dinners, and expert workshops across Barcelona. Book your spot easily with flexible credits and meet local moms.' // 156
  },
  {
    page: 'Gazette',
    title: 'La Gazette — Private Community Forum for Barcelona Moms', // 55
    desc: 'Connect honestly with mothers in Barcelona. Share advice, ask questions, discuss parenting stages, and find local friendships inside our supportive forum space.' // 160
  },
  {
    page: 'Journal',
    title: 'The Journal — Motherhood Insights & Guides | The Mothers', // 56
    desc: 'Thoughtful articles on pregnancy, postpartum doulas, infant sleep, feeding, and returning to work, written by trusted specialists for modern mothers in Barcelona.' // 162
  },
  {
    page: 'Partners',
    title: 'Curated Partner Network & Motherhood Perks in Barcelona', // 55
    desc: 'Explore our vetted directory of Barcelona specialists, prenatal yoga studios, lactation experts, postpartum doulas, and family-friendly hospitality venues.' // 155
  },
  {
    page: 'FAQ',
    title: 'Frequently Asked Questions About Membership | The Mothers', // 57
    desc: 'Get answers about joining The Mothers in Barcelona, how credits work, event cancellations, stage groups, host opportunities, and our curated partner network.' // 157
  },
  {
    page: 'Host',
    title: 'Become a Host & Welcome Local Mothers | The Mothers BCN', // 55
    desc: 'Host gatherings in Barcelona and welcome fellow mothers at upcoming events. Earn credits, build your network, and play a meaningful role in our local community.' // 160
  },
  {
    page: 'Login',
    title: 'Member Sign In & Account Access | The Mothers Barcelona', // 55
    desc: 'Sign in to your account at The Mothers Barcelona to manage event bookings, check your credit balance, access La Gazette community forum, and view your perks.' // 157
  },
  {
    page: 'Terms',
    title: 'Terms & Conditions of Membership | The Mothers Barcelona', // 56
    desc: 'Read the official terms and conditions for The Mothers Barcelona, governing accounts, credit wallets, event bookings, community guidelines, and memberships.' // 156
  },
  {
    page: 'Privacy',
    title: 'Privacy Policy & Data Protection | The Mothers Barcelona', // 56
    desc: 'Learn how The Mothers Barcelona protects your personal data, respects member privacy, handles booking records, and complies with European GDPR regulations.' // 155
  },
  {
    page: 'Top Up',
    title: 'Top Up Credits for Event Bookings | The Mothers Barcelona', // 57
    desc: 'Purchase credits for your wallet to book walks, workshops, suppers, and gatherings across Barcelona. Transparent pricing with no recurring fees or lock-ins.' // 156
  },
  {
    page: 'Coming Soon',
    title: 'The Mothers Barcelona — Private Membership Club for Moms', // 56
    desc: 'A private membership club for mothers in Barcelona is opening soon. Join the early access list to receive priority invitations and connect with local mothers.' // 158
  }
];

let allPassed = true;
seo.forEach(s => {
  const tLen = s.title.length;
  const dLen = s.desc.length;
  const tOk = tLen >= 55 && tLen <= 65;
  const dOk = dLen >= 155 && dLen <= 165;
  if (!tOk || !dOk) allPassed = false;
  console.log(`${s.page.padEnd(22)} Title: ${tLen} (${tOk ? 'PASS' : 'FAIL'}) | Desc: ${dLen} (${dOk ? 'PASS' : 'FAIL'})`);
});
console.log('ALL PASSED:', allPassed);
