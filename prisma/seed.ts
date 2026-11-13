import { prisma } from "../lib/db";

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
          role: "DONOR",
          area: "Downtown"
        }
      });
      const hostelMess = await tx.organization.create({
        data: {
          name: "Sunrise Hostel Mess (sample)",
          role: "DONOR",
          area: "North Campus"
        }
      });
      const caterer = await tx.organization.create({
        data: {
          name: "Festive Table Catering (sample)",
          role: "DONOR",
          area: "Riverside"
        }
      });
      const foodLink = await tx.organization.create({
        data: {
          name: "Community Food Link (sample)",
          role: "NGO",
          area: "Downtown"
        }
      });
      const hopePantry = await tx.organization.create({
        data: {
          name: "Hope Pantry Network (sample)",
          role: "NGO",
          area: "North Campus"
        }
      });

      const openRice = await tx.listing.create({
        data: {
          donorId: canteen.id,
          title: "Rice and lentil curry (sample)",
          foodType: "Cooked meals",
          quantityKg: 18.5,
          pickupStart: hoursFromNow(2),
          pickupEnd: hoursFromNow(4),
          locationText: "Greenfield Canteen, Main Street",
          status: "OPEN"
        }
      });
      const openBiryani = await tx.listing.create({
        data: {
          donorId: hostelMess.id,
          title: "Vegetable biryani (sample)",
          foodType: "Cooked meals",
          quantityKg: 12,
          pickupStart: hoursFromNow(5),
          pickupEnd: hoursFromNow(7),
          locationText: "Sunrise Hostel Mess, North Campus",
          status: "OPEN"
        }
      });
      const openBakery = await tx.listing.create({
        data: {
          donorId: caterer.id,
          title: "Assorted bakery bread (sample)",
          foodType: "Bakery",
          quantityKg: 8,
          pickupStart: hoursFromNow(24),
          pickupEnd: hoursFromNow(26),
          locationText: "Festive Table Kitchen, Riverside Road",
          status: "OPEN"
        }
      });
      const claimedTrays = await tx.listing.create({
        data: {
          donorId: caterer.id,
          title: "Vegetarian lunch trays (sample)",
          foodType: "Cooked meals",
          quantityKg: 24,
          pickupStart: hoursFromNow(1),
          pickupEnd: hoursFromNow(3),
          locationText: "Festive Table Kitchen, Riverside Road",
          status: "CLAIMED"
        }
      });
      const pickedUpPasta = await tx.listing.create({
        data: {
          donorId: canteen.id,
          title: "Tomato pasta (sample)",
          foodType: "Cooked meals",
          quantityKg: 15.5,
          pickupStart: hoursFromNow(-5),
          pickupEnd: hoursFromNow(-3),
          locationText: "Greenfield Canteen, Main Street",
          status: "PICKED_UP"
        }
      });
      const pickedUpProduce = await tx.listing.create({
        data: {
          donorId: hostelMess.id,
          title: "Seasonal vegetables and rice (sample)",
          foodType: "Cooked meals",
          quantityKg: 30,
          pickupStart: hoursFromNow(-7),
          pickupEnd: hoursFromNow(-5),
          locationText: "Sunrise Hostel Mess, North Campus",
          status: "PICKED_UP"
        }
      });
      await tx.listing.create({
        data: {
          donorId: caterer.id,
          title: "Fresh fruit boxes (sample)",
          foodType: "Produce",
          quantityKg: 22,
          pickupStart: hoursFromNow(-48),
          pickupEnd: hoursFromNow(-46),
          locationText: "Festive Table Kitchen, Riverside Road",
          status: "EXPIRED"
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

  console.log(
    `Seeded ${[canteen, hostelMess, caterer, foodLink, hopePantry].length} sample organizations and 7 sample listings.`
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
