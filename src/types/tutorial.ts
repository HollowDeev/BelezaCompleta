export type TutorialCategory =
  | "BEM_VINDO"
  | "OPERACAO"
  | "AGENDA"
  | "ABERTURA_AGENDA"
  | "TRIAGEM"
  | "PRE_RESERVA"
  | "PROPOSTA"
  | "CLIENTES"
  | "FINANCEIRO"
  | "SERVICOS"
  | "MODELOS_TRIAGEM"
  | "CONFIGURACOES"
  | "ATALHOS"
  | "NOVIDADES";

export interface TutorialStep {
  id: string;
  category: TutorialCategory;
  categoryLabel: string;
  title: string;
  description: string;
  goldenTip?: string;
  targetSelector?: string; // seletor DOM ou data-tutorial
  targetTab?: string; // Se precisar mudar para uma aba específica no dashboard
  position?: "top" | "bottom" | "left" | "right" | "center";
}

export interface ModuleGuide {
  id: string;
  title: string;
  iconName: string;
  summary: string;
  keyPoints: { label: string; text: string }[];
  stepByStep: string[];
  rulesOfThumb: string[];
}

export interface UpdateReleaseFeature {
  id: string;
  number: number;
  tag: string;
  title: string;
  shortSummary: string;
  iconName: string;
  targetTab?: string;
  whatChanged: string;
  howToUse: string[];
  goldenTip: string;
}
