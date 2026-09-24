// Sample data for local development. Safe to run repeatedly (upserts).
// Usage: npm run db:seed
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const listings = [
  { mlsNumber: 'HYD-2026-0001', title: 'Skyline penthouse with private terrace', propertyType: 'PENTHOUSE', address: 'Road No. 12, Banjara Hills', city: 'Hyderabad', price: 45000000, bedrooms: 4, bathrooms: 4.5, areaSqft: 5200, description: 'Top-floor residence with 360° city views and a wraparound terrace.' },
  { mlsNumber: 'HYD-2026-0002', title: 'Duplex penthouse near the lake', propertyType: 'PENTHOUSE', address: 'Kokapet, Financial District', city: 'Hyderabad', price: 38500000, bedrooms: 4, bathrooms: 4, areaSqft: 4800 },
  { mlsNumber: 'HYD-2026-0003', title: 'Garden villa in a gated community', propertyType: 'VILLA', address: 'Jubilee Hills', city: 'Hyderabad', price: 62000000, bedrooms: 5, bathrooms: 5.5, areaSqft: 7400, status: 'PENDING' },
  { mlsNumber: 'BLR-2026-0001', title: 'Sky villa with home office', propertyType: 'PENTHOUSE', address: 'Indiranagar', city: 'Bengaluru', price: 41000000, bedrooms: 3, bathrooms: 3.5, areaSqft: 4100 },
  { mlsNumber: 'MUM-2026-0001', title: 'Sea-facing penthouse', propertyType: 'PENTHOUSE', address: 'Worli Sea Face', city: 'Mumbai', price: 185000000, bedrooms: 5, bathrooms: 6, areaSqft: 6800, status: 'SOLD' },
  { mlsNumber: 'HYD-2026-0004', title: 'Corner apartment with city views', propertyType: 'APARTMENT', address: 'Gachibowli', city: 'Hyderabad', price: 16500000, bedrooms: 3, bathrooms: 3, areaSqft: 2300 },
];

async function main() {
  for (const listing of listings) {
    await prisma.listing.upsert({ where: { mlsNumber: listing.mlsNumber }, update: listing, create: listing });
  }

  const user = await prisma.user.upsert({
    where: { email: 'priya.sharma@example.com' },
    update: {},
    create: { email: 'priya.sharma@example.com', fullName: 'Priya Sharma', phone: '+91 98765 43210' },
  });
  await prisma.user.upsert({
    where: { email: 'arjun.agent@example.com' },
    update: {},
    create: { email: 'arjun.agent@example.com', fullName: 'Arjun Reddy', role: 'AGENT' },
  });

  const first = await prisma.listing.findUniqueOrThrow({ where: { mlsNumber: 'HYD-2026-0001' } });
  await prisma.favorite.upsert({
    where: { userId_listingId: { userId: user.id, listingId: first.id } },
    update: {},
    create: { userId: user.id, listingId: first.id },
  });

  const hasInquiry = await prisma.inquiry.findFirst({ where: { userId: user.id, listingId: first.id } });
  if (!hasInquiry) {
    await prisma.inquiry.create({
      data: {
        listingId: first.id,
        userId: user.id,
        name: user.fullName,
        email: user.email,
        message: 'Is the terrace private? I would like to schedule a viewing this weekend.',
      },
    });
  }

  console.log(`Seeded ${listings.length} listings, 2 users, 1 favorite, 1 inquiry.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
