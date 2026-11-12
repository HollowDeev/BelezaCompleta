export type QuestionType =
  | "single_choice"
  | "multiple_choice"
  | "text"
  | "photo_upload"
  | "curl_pattern"
  | "scale";

export interface QuestionOption {
  id: string;
  label: string;
  description?: string;
  imageUrl?: string;
  isRiskFactor?: boolean; // Ex: química incompatível (henê, tioglicolato)
}

export interface TriageQuestion {
  id: string;
  order: number;
  title: string;
  subtitle?: string;
  educationalTip: string; // "Por que saber isso? Porque..."
  type: QuestionType;
  options?: QuestionOption[];
  allowMultiple?: boolean;
  required: boolean;
  placeholder?: string;
  maxPhotos?: number;
}

export interface TriageForm {
  id: string;
  orgId: string;
  title: string;
  description: string;
  targetServiceId?: string;
  estimatedMinutes: number;
  questions: TriageQuestion[];
  isTemplate: boolean;
  createdAt: string;
}

export interface TriageAnswer {
  questionId: string;
  questionTitle: string;
  answerText?: string;
  selectedOptionIds?: string[];
  selectedOptionLabels?: string[];
  photoUrls?: string[];
}

export interface TriageSubmission {
  id: string;
  orgId: string;
  formId: string;
  serviceId: string;
  serviceTitle: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  preferredDate?: string;
  preferredTimeSlot?: string;
  answers: TriageAnswer[];
  photos: {
    currentHairRoot?: string;
    currentHairLength?: string;
    inspirationDesired?: string;
  };
  status: "pending_review" | "proposal_sent" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt?: string;
  proposalId?: string;
  preReservationId?: string;
}
