import { db } from "./index";
import { emissionFactors, stations } from "./schema";
import { MOCK_EMISSION_FACTORS } from "@/mocks/fixtures";

export async function seed() {
  await db
    .insert(stations)
    .values([
      {
        provider: "cpcb",
        providerStationId: "cpcb-kol-rabindra-bharati",
        name: "Rabindra Bharati",
        city: "Kolkata",
        state: "West Bengal",
        point: { lat: 22.627, lng: 88.38 },
        active: true,
      },
      {
        provider: "cpcb",
        providerStationId: "cpcb-kol-victoria",
        name: "Victoria",
        city: "Kolkata",
        state: "West Bengal",
        point: { lat: 22.5448, lng: 88.3426 },
        active: true,
      },
      {
        provider: "cpcb",
        providerStationId: "cpcb-kol-ballygunge",
        name: "Ballygunge",
        city: "Kolkata",
        state: "West Bengal",
        point: { lat: 22.528, lng: 88.366 },
        active: true,
      },
    ])
    .onConflictDoNothing();

  for (const f of MOCK_EMISSION_FACTORS) {
    await db.insert(emissionFactors).values({
      mode: f.mode,
      kgCo2ePerPkm: String(f.kgCo2ePerPkm),
      source: f.source,
      publication: f.publication,
      version: f.version,
      geography: f.geography,
      occupancyAssumption: f.occupancyAssumption,
    });
  }

  console.log("Seeded Kolkata CPCB stations and emission factors.");
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seed().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
}
