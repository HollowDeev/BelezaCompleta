export interface ProposalItem {
  id: string;
  serviceTitle: string;
  originalPrice: number;
  specialPrice?: number;
  explanation?: string;
  moduleType?: "preparatory" | "final";
}

export interface ProposalDifferential {
  id: string;
  title: string;
  description: string;
}

export interface ProposalTemplate {
  id: string;
  title: string; // Ex: "Modelo Iluminado Chocolate"
  targetCategory: string;
  subtitle: string;
  projectOverviewTemplate: string;
  desiredResults: string[];
  chosenTechnique: string;
  maintenanceGuidance: string;
  includedItems: string[];
  differentials: ProposalDifferential[];
  technicalCommitment: string;
  basePrice: number;
  pixDiscountPercent: number;
  createdAt: string;
}

export interface LuxuryProposal {
  id: string;
  orgId: string;
  professionalId: string;
  appointmentId?: string;
  triageSubmissionId?: string;
  templateId?: string;
  
  // Dados da Cliente
  clientName: string;
  clientPhone: string;
  clientEmail?: string;

  // Cabeçalho da Proposta
  title: string; // Ex: "PROPOSTA DE TRANSFORMAÇÃO" ou "PROPOSTA PERSONALIZADA"
  subtitle: string; // Ex: "Iluminado Chocolate & Saúde dos Fios" ou "Exclusividade & Alta Performance"
  
  // Conteúdo Personalizado (Gleicy)
  projectOverview: string; // "Isa, a proposta para o seu cabelo é..."
  desiredResults: string[]; // ["Iluminação natural, mas visível", "Tom chocolate elegante...", ...]
  chosenTechnique: string; // "Para alcançar o tom desejado, o procedimento será realizado com coloração superclareadora..."
  maintenanceGuidance: string; // "A proposta é criar um cabelo que continue bonito mesmo com o crescimento..."
  
  // Itens Fixos/Parametrizados
  includedItems: string[]; // ["Avaliação técnica completa", "Tratamento pós-coloração...", "Finalização com curvatura..."]
  differentials: ProposalDifferential[]; // Atendimento personalizado, Técnicas adaptadas para cachos, etc.
  technicalCommitment: string; // "O resultado do iluminado será construído respeitando a base natural..."

  // Investimento e Pagamento
  items: ProposalItem[];
  totalOriginal: number;
  totalWithDiscount: number;
  pixDiscountPercent: number; // Ex: 5%
  pixTotal: number;
  creditCardTerms: string; // "Valor integral, sujeito às condições de parcelamento e juros da maquininha."
  
  // Status e Datas
  status: "draft" | "sent" | "approved" | "rejected";
  expiresAt: string;
  createdAt: string;
  approvedAt?: string;
}
