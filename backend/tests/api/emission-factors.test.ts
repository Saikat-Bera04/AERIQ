import { describe, expect, it } from "vitest";
import { MOCK_EMISSION_FACTORS } from "@/mocks/fixtures";

describe("Emission factors data integrity", () => {
  it("every reference emission factor has non-empty source, publication, version, and geography", () => {
    expect(MOCK_EMISSION_FACTORS.length).toBeGreaterThan(0);
    for (const row of MOCK_EMISSION_FACTORS) {
      expect(row.source.trim().length).toBeGreaterThan(0);
      expect(row.publication.trim().length).toBeGreaterThan(0);
      expect(row.version.trim().length).toBeGreaterThan(0);
      expect(row.geography.trim().length).toBeGreaterThan(0);
    }
  });
});
