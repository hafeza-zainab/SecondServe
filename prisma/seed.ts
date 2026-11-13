import { prisma } from "../lib/db";
import { CLAIMED, EXPIRED, OPEN, PICKED_UP, ROLES } from "../lib/constants";

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

function istDayAt(now: Date, daysAgo: number, hour: number) {
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  return new Date(Date.UTC(
    istNow.getUTCFullYear(),
    istNow.getUTCMonth(),
    istNow.getUTCDate() - daysAgo,
    hour
  ) - IST_OFFSET_MS);
}

async function main() {
  const existingOrganizations = await prisma.organization.count();
  if (existingOrganizations > 0) {
    console.log(
      `Seed skipped: found ${existingOrganizations} existing organization(s).`
    );
    return;
  }

  const now = new Date();
  const hoursFromNow = (hours: number) =>
    new Date(now.getTime() + hours * 60 * 60 * 1000);

  const [canteen, hostelMess, caterer, foodLink, hopePantry] =
    await prisma.$transaction(async (tx) => {
      const canteen = await tx.organization.create({
        data: {
          name: "Greenfield Canteen (sample)",
          role: ROLES.DONOR,
          area: "Downtown"
        }
      });
      const hostelMess = await tx.organization.create({
        data: {
          name: "Sunrise Hostel Mess (sample)",
          role: ROLES.DONOR,
          area: "North Campus"
        }
      });
      const caterer = await tx.organization.create({
        data: {
          name: "Festive Table Catering (sample)",
          role: ROLES.DONOR,
          area: "Riverside"
        }
      });
      const foodLink = await tx.organization.create({
        data: {
          name: "Community Food Link (sample)",
          role: ROLES.NGO,
          area: "Downtown"
        }
      });
      const hopePantry = await tx.organization.create({
        data: {
          name: "Hope Pantry Network (sample)",
          role: ROLES.NGO,
          area: "North Campus"
        }
      });

      const openRice = await tx.listing.create({
        data: {
          donorId: canteen.id,
          createdAt: hoursFromNow(-24),
          title: "Rice and lentil curry (sample)",
          foodType: "Cooked meals",
          quantityKg: 18.5,
          pickupStart: hoursFromNow(2),
          pickupEnd: hoursFromNow(4),
          locationText: "Greenfield Canteen, Main Street",
          status: OPEN
        }
      });
      const openBiryani = await tx.listing.create({
        data: {
          donorId: hostelMess.id,
          createdAt: hoursFromNow(-24),
          title: "Vegetable biryani (sample)",
          foodType: "Cooked meals",
          quantityKg: 12,
          pickupStart: hoursFromNow(5),
          pickupEnd: hoursFromNow(7),
          locationText: "Sunrise Hostel Mess, North Campus",
          status: OPEN
        }
      });
      const openBakery = await tx.listing.create({
        data: {
          donorId: caterer.id,
          createdAt: hoursFromNow(-24),
          title: "Assorted bakery bread (sample)",
          foodType: "Bakery",
          quantityKg: 8,
          pickupStart: hoursFromNow(24),
          pickupEnd: hoursFromNow(26),
          locationText: "Festive Table Kitchen, Riverside Road",
          status: OPEN
        }
      });
      const claimedTrays = await tx.listing.create({
        data: {
          donorId: caterer.id,
          createdAt: hoursFromNow(-24),
          title: "Vegetarian lunch trays (sample)",
          foodType: "Cooked meals",
          quantityKg: 24,
          pickupStart: hoursFromNow(1),
          pickupEnd: hoursFromNow(3),
          locationText: "Festive Table Kitchen, Riverside Road",
          status: CLAIMED
        }
      });
      const pickedUpPasta = await tx.listing.create({
        data: {
          donorId: canteen.id,
          createdAt: hoursFromNow(-24),
          title: "Tomato pasta (sample)",
          foodType: "Cooked meals",
          quantityKg: 15.5,
          pickupStart: hoursFromNow(-5),
          pickupEnd: hoursFromNow(-3),
          locationText: "Greenfield Canteen, Main Street",
          status: PICKED_UP
        }
      });
      const pickedUpProduce = await tx.listing.create({
        data: {
          donorId: hostelMess.id,
          createdAt: hoursFromNow(-24),
          title: "Seasonal vegetables and rice (sample)",
          foodType: "Cooked meals",
          quantityKg: 30,
          pickupStart: hoursFromNow(-7),
          pickupEnd: hoursFromNow(-5),
          locationText: "Sunrise Hostel Mess, North Campus",
          status: PICKED_UP
        }
      });

      const pickedUpSamples = [
        { daysAgo: 1, hour: 12, donor: canteen, ngo: foodLink, title: "Lentil rice bowls", foodType: "Cooked meals", quantityKg: 8 },
        { daysAgo: 1, hour: 16, donor: hostelMess, ngo: hopePantry, title: "Vegetable curry trays", foodType: "Cooked meals", quantityKg: 12 },
        { daysAgo: 2, hour: 12, donor: caterer, ngo: foodLink, title: "Fresh bread baskets", foodType: "Bakery", quantityKg: 6 },
        { daysAgo: 2, hour: 16, donor: canteen, ngo: hopePantry, title: "Paneer rice meals", foodType: "Cooked meals", quantityKg: 14 },
        { daysAgo: 4, hour: 12, donor: hostelMess, ngo: foodLink, title: "Seasonal vegetable packs", foodType: "Produce", quantityKg: 9 },
        { daysAgo: 4, hour: 16, donor: caterer, ngo: hopePantry, title: "Pasta lunch portions", foodType: "Cooked meals", quantityKg: 11 },
        { daysAgo: 5, hour: 12, donor: canteen, ngo: foodLink, title: "Banana bread loaves", foodType: "Bakery", quantityKg: 7 },
        { daysAgo: 5, hour: 16, donor: hostelMess, ngo: hopePantry, title: "Chickpea meal portions", foodType: "Cooked meals", quantityKg: 13 }
      ] as const;

      for (const sample of pickedUpSamples) {
        const pickedUpAt = istDayAt(now, sample.daysAgo, sample.hour);
        const claimedAt = new Date(pickedUpAt.getTime() - 4 * 60 * 60 * 1000);
        const listing = await tx.listing.create({
          data: {
            donorId: sample.donor.id,
            createdAt: new Date(pickedUpAt.getTime() - 16 * 60 * 60 * 1000),
            title: `${sample.title} (sample)`,
            foodType: sample.foodType,
            quantityKg: sample.quantityKg,
            pickupStart: new Date(pickedUpAt.getTime() - 6 * 60 * 60 * 1000),
            pickupEnd: new Date(pickedUpAt.getTime() - 2 * 60 * 60 * 1000),
            locationText: `${sample.donor.area} sample pickup point`,
            status: PICKED_UP
          }
        });
        await tx.claim.create({
          data: { listingId: listing.id, ngoId: sample.ngo.id, claimedAt, pickedUpAt }
        });
      }

      const claimedSamples = [
        { donor: canteen, ngo: hopePantry, title: "Vegetable pulao portions", foodType: "Cooked meals", quantityKg: 18 },
        { donor: hostelMess, ngo: foodLink, title: "Assorted breakfast bread", foodType: "Bakery", quantityKg: 20 }
      ] as const;

      for (const sample of claimedSamples) {
        const listing = await tx.listing.create({
          data: {
            donorId: sample.donor.id,
            createdAt: hoursFromNow(-48),
            title: `${sample.title} (sample)`,
            foodType: sample.foodType,
            quantityKg: sample.quantityKg,
            pickupStart: hoursFromNow(6),
            pickupEnd: hoursFromNow(8),
            locationText: `${sample.donor.area} sample pickup point`,
            status: CLAIMED
          }
        });
        await tx.claim.create({
          data: {
            listingId: listing.id,
            ngoId: sample.ngo.id,
            claimedAt: hoursFromNow(-2)
          }
        });
      }

      await tx.listing.create({
        data: {
          donorId: caterer.id,
          createdAt: hoursFromNow(-72),
          title: "Fresh fruit boxes (sample)",
          foodType: "Produce",
          quantityKg: 22,
          pickupStart: hoursFromNow(-48),
          pickupEnd: hoursFromNow(-46),
          locationText: "Festive Table Kitchen, Riverside Road",
          status: EXPIRED
        }
      });
      await tx.listing.create({
        data: {
          donorId: caterer.id,
          createdAt: hoursFromNow(-72),
          title: "Surplus apple crates (sample)",
          foodType: "Produce",
          quantityKg: 10,
          pickupStart: hoursFromNow(-50),
          pickupEnd: hoursFromNow(-48),
          locationText: "Riverside sample pickup point",
          status: EXPIRED
        }
      });

      await tx.claim.create({
        data: {
          listingId: claimedTrays.id,
          ngoId: hopePantry.id,
          claimedAt: hoursFromNow(-0.5)
        }
      });
      await tx.claim.create({
        data: {
          listingId: pickedUpPasta.id,
          ngoId: foodLink.id,
          claimedAt: hoursFromNow(-5),
          pickedUpAt: hoursFromNow(-4)
        }
      });
      await tx.claim.create({
        data: {
          listingId: pickedUpProduce.id,
          ngoId: hopePantry.id,
          claimedAt: hoursFromNow(-7),
          pickedUpAt: hoursFromNow(-6)
        }
      });

      return [canteen, hostelMess, caterer, foodLink, hopePantry] as const;
    });

  const [listingCount, claimCount] = await Promise.all([
    prisma.listing.count(),
    prisma.claim.count()
  ]);
  console.log(
    `Seeded ${[canteen, hostelMess, caterer, foodLink, hopePantry].length} sample organizations, ${listingCount} sample listings, and ${claimCount} sample claims.`
  );
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
