import { db } from "./index";
import { emissionFactors } from "./schema";
import { MOCK_EMISSION_FACTORS } from "@/mocks/fixtures";
import { sql } from "drizzle-orm";

export async function seed() {
  const existing = await db.select({ count: sql<number>`count(*)::int` }).from(emissionFactors);
  if ((existing[0]?.count ?? 0) === 0) {
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
    console.log(`Seeded ${MOCK_EMISSION_FACTORS.length} reference emission factors.`);
  } else {
    console.log("Emission factors already seeded.");
  }

  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seed().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
}
