import { ServiceItem } from "@/types/service";

/**
 * Constrói ServiceItem composto a partir de múltiplos procedimentos selecionados.
 */
export function buildCompositeService(
  selectedServices: ServiceItem[]
): ServiceItem | null {
  if (!selectedServices || selectedServices.length === 0) return null;
  if (selectedServices.length === 1) return selectedServices[0];

  const compositeTitle = selectedServices.map((s) => s.title).join(" + ");
  const combinedPrice = selectedServices.reduce(
    (sum, s) =>
      sum +
      (s.promotionalPrice !== undefined && s.promotionalPrice !== null
        ? s.promotionalPrice
        : s.price),
    0
  );

  const anyRequiresTriage = selectedServices.some((s) => s.requiresTriage);
  const triageService = selectedServices.find((s) => s.requiresTriage && s.triageFormId);
  const triageFormId =
    triageService?.triageFormId ||
    (anyRequiresTriage ? selectedServices.find((s) => s.requiresTriage)?.id : undefined);

  let stepOrderCounter = 1;
  const combinedSteps = selectedServices.flatMap((s, sIdx) => {
    const serviceSteps =
      s.steps && s.steps.length > 0
        ? s.steps
        : [
            {
              id: `step-${s.id}-default`,
              order: 1,
              title: s.title,
              type: "active" as const,
              durationMin: 45,
              requiresExclusiveAttention: true,
            },
          ];

    return serviceSteps.map((st) => ({
      ...st,
      id: `composite-step-${sIdx}-${st.id || stepOrderCounter}`,
      order: stepOrderCounter++,
      title: `${s.title}: ${st.title}`,
    }));
  });

  const anyStartingAt = selectedServices.some((s) => s.priceType === "starting_at");
  const timestamp = Date.now();

  const compositeService: ServiceItem = {
    id: `composite-${timestamp}`,
    orgId: selectedServices[0]?.orgId || "11111111-1111-4111-8111-111111111111",
    professionalId:
      selectedServices[0]?.professionalId || "58f26242-1e53-432e-b924-dea25ee2068a",
    title: compositeTitle,
    slug: `composite-${timestamp}`,
    category: "outros",
    description: `Atendimento montado com ${selectedServices.length} procedimentos: ${selectedServices
      .map((s) => s.title)
      .join(", ")}.`,
    price: combinedPrice,
    priceType: anyStartingAt ? "starting_at" : "fixed",
    requiresTriage: anyRequiresTriage,
    triageFormId: triageFormId,
    steps: combinedSteps,
    isActive: true,
    procedures: selectedServices.map((s) => ({
      id: s.id,
      title: s.title,
      durationMin:
        s.steps && s.steps.length > 0
          ? s.steps.reduce((sum, st) => sum + (Number(st.durationMin) || 0), 0)
          : 60,
      price:
        s.promotionalPrice !== undefined && s.promotionalPrice !== null
          ? s.promotionalPrice
          : s.price,
      isIncluded: false,
    })),
  };

  return compositeService;
}
