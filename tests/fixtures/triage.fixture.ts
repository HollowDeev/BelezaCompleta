import { TriageSubmission } from "@/types/triage";

export const mockTriageSubmission: TriageSubmission = {
  id: "triage-sub-01",
  orgId: "org-default-01",
  formId: "form-mechas-01",
  serviceId: "srv-starting-mechas",
  serviceTitle: "Mechas Criativas Iluminadas",
  clientName: "Larissa Fernandes",
  clientPhone: "11955554444",
  clientEmail: "larissa@example.com",
  preferredDate: "2026-11-27",
  preferredTimeSlot: "13:00",
  answers: [
    {
      questionId: "q1",
      questionTitle: "Histórico de químicas nos últimos 2 anos",
      answerText: "Nenhuma química, apenas coloração vegetal há 1 ano.",
    },
    {
      questionId: "q2",
      questionTitle: "Padrão de curvatura principal",
      answerText: "3B / 3C",
    },
  ],
  photos: {
    currentHairRoot: "https://example.com/photos/root.jpg",
    currentHairLength: "https://example.com/photos/length.jpg",
    inspirationDesired: "https://example.com/photos/inspiration.jpg",
  },
  status: "pending_review",
  submittedAt: "2026-11-11T11:00:00Z",
};

export const mockMultiServiceTriageSubmission: TriageSubmission = {
  id: "triage-sub-combo-01",
  orgId: "org-default-01",
  formId: "form-combo-01",
  serviceId: "srv-combo-mechas-tratamento",
  serviceTitle: "Montar Atendimento: Mechas Criativas Iluminadas + Nutrição Lipídica Intensiva",
  clientName: "Tatiane Alves",
  clientPhone: "11944443333",
  clientEmail: "tatiane@example.com",
  preferredDate: "2026-11-29",
  preferredTimeSlot: "09:30",
  answers: [
    {
      questionId: "q-curvatura",
      questionTitle: "Tipo de cacho",
      answerText: "Tipo 4A",
    },
  ],
  photos: {},
  status: "pending_review",
  submittedAt: "2026-11-11T13:30:00Z",
};
