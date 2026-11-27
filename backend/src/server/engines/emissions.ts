import type {
  CommuteSimRequest,
  CommuteSimResponse,
  EmissionFactor,
  TransportMode,
} from "@/contracts";

export function computeCommuteEmissions(
  input: CommuteSimRequest,
  factors: EmissionFactor[]
): CommuteSimResponse {
  const factorMap = new Map<TransportMode, EmissionFactor>();
  for (const f of factors) {
    factorMap.set(f.mode, f);
  }

  const modesToEval = [
    input.baselineMode,
    ...input.alternativeModes.filter((m) => m !== input.baselineMode),
  ];

  const usedAssumptions: EmissionFactor[] = [];
  const perMode: CommuteSimResponse["perMode"] = [];

  for (const mode of modesToEval) {
    const isZeroTailpipe = mode === "walking" || mode === "cycling";
    const factor = factorMap.get(mode);

    if (!factor && !isZeroTailpipe) {
      throw new Error(`Missing emission factor for mode: ${mode}`);
    }

    const kgPerKm = isZeroTailpipe ? 0 : factor!.kgCo2ePerPkm;
    const weekly = Number(
      (input.distanceKm * kgPerKm * input.tripsPerWeek).toFixed(2)
    );
    const yearly = Number((weekly * 52).toFixed(2));

    if (factor) {
      usedAssumptions.push(factor);
    }

    perMode.push({
      mode,
      kgPerWeek: weekly,
      kgPerYear: yearly,
      isBaseline: mode === input.baselineMode,
      label: isZeroTailpipe ? "Zero tailpipe" : undefined,
    });
  }

  const baseline = perMode[0];
  const alternatives = perMode.slice(1);
  const bestAlt =
    alternatives.sort((a, b) => a.kgPerWeek - b.kgPerWeek)[0] ?? baseline;

  const avoidedPerWeek = Math.max(
    0,
    Number((baseline.kgPerWeek - bestAlt.kgPerWeek).toFixed(2))
  );
  const avoidedPerYear = Math.max(
    0,
    Number((avoidedPerWeek * 52).toFixed(2))
  );

  const baselineFactor =
    baseline.mode === "walking" || baseline.mode === "cycling"
      ? 0
      : (factorMap.get(baseline.mode)?.kgCo2ePerPkm ?? 0);

  return {
    perMode,
    avoidedPerWeek,
    avoidedPerYear,
    best: bestAlt.mode,
    formula: `E = ${input.distanceKm} km × ${baselineFactor} kg CO₂e/pkm × ${input.tripsPerWeek} trips = ${baseline.kgPerWeek} kg CO₂e/week`,
    assumptions: usedAssumptions,
    factorVersion: usedAssumptions[0]?.version ?? "v1.0",
  };
}
