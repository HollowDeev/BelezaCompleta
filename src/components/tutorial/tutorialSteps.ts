import { TutorialStep, ModuleGuide, UpdateReleaseFeature } from "@/types/tutorial";

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    category: "BEM_VINDO",
    categoryLabel: "Boas-Vindas",
    title: "Bem-vinda ao Espaço Executivo Gleicy Ronha! ✨",
    description:
      "Este é o seu centro de comando inteligente. Desenvolvido sob medida para maximizar seu faturamento, organizar seus horários com segurança e gerenciar o intercalamento de clientes durante pausas químicas com total precisão.",
    goldenTip:
      "Você pode rever este tutorial ou consultar o manual completo a qualquer momento clicando no botão '🎓 Tutorial' no topo da tela.",
    position: "center",
  },
  {
    id: "header-profile",
    category: "BEM_VINDO",
    categoryLabel: "Identificação",
    title: "Perfil da Profissional & Privilégios",
    description:
      "Aqui você identifica o perfil ativo ('Dona do Salão' ou 'Super Admin') e a especialidade configurada. Todas as ações realizadas na agenda, orçamentos e financeiro são registradas sob sua titularidade oficial.",
    targetSelector: '[data-tutorial="header-profile"]',
    position: "bottom",
  },
  {
    id: "header-status",
    category: "BEM_VINDO",
    categoryLabel: "Conectividade",
    title: "Sincronização em Tempo Real (Supabase Realtime) ⚡",
    description:
      "Indica que seu sistema está conectado em nuvem ao banco de dados Supabase via WebSockets. Quando uma cliente envia uma triagem ou aprova uma proposta pelo WhatsApp, os dados surgem na sua tela instantaneamente, sem precisar dar F5!",
    goldenTip:
      "O ponto verde pulsante confirma que todas as atualizações de clientes no site chegam em tempo real para você.",
    targetSelector: '[data-tutorial="header-status"]',
    position: "bottom",
  },
  {
    id: "header-actions",
    category: "BEM_VINDO",
    categoryLabel: "Ações do Topo",
    title: "Atualização Rápida & Central de Ajuda",
    description:
      "O botão de sincronização recarrega todos os dados do banco com segurança. Ao lado, você tem acesso à Central de Treinamento com manuais ilustrados, perguntas frequentes e atalhos de produtividade.",
    targetSelector: '[data-tutorial="header-actions"]',
    position: "bottom",
  },
  {
    id: "sidebar-operacao",
    category: "OPERACAO",
    categoryLabel: "Operação do Dia",
    title: "Aba 1: Operação do Dia (Hoje)",
    description:
      "É a sua tela principal de trabalho diário. Nela você acompanha os atendimentos do dia em curso, o status de cada cliente (Confirmado, Em Atendimento, Finalizado) e a linha do tempo de ocupação das suas bancadas.",
    targetSelector: '[data-tutorial="sidebar-operacao"]',
    targetTab: "operacao",
    position: "right",
  },
  {
    id: "timeline-day",
    category: "OPERACAO",
    categoryLabel: "Linha do Tempo",
    title: "Linha do Tempo Linear Minuto a Minuto",
    description:
      "A linha do tempo divide seu dia em blocos precisos de 15 minutos (08:30 às 19:00). Cada atendimento é visualizado com o nome da cliente, procedimento e duração exata de cada etapa técnica.",
    goldenTip:
      "Passe o mouse sobre os blocos para inspecionar os detalhes técnicos e observações de cada procedimento.",
    targetSelector: '[data-tutorial="timeline-container"]',
    targetTab: "operacao",
    position: "bottom",
  },
  {
    id: "timeline-chemical",
    category: "OPERACAO",
    categoryLabel: "Intercalamento Químico",
    title: "Motor de Encaixe Otimizado em Pausas Químicas 🧪",
    description:
      "O grande diferencial do seu método: durante o tempo de ação química (coloração, descoloração ou mechas), o sistema identifica o intervalo livre e permite encaixar cortes, escovas ou finalizações de outra cliente, dobrando sua produtividade sem sobrecarregar sua atenção exclusiva.",
    goldenTip:
      "A ilha flutuante no canto inferior da tela sinaliza quando há uma cliente em pausa química ativa no salão.",
    targetSelector: '[data-tutorial="timeline-container"]',
    targetTab: "operacao",
    position: "bottom",
  },
  {
    id: "sidebar-agenda",
    category: "AGENDA",
    categoryLabel: "Agenda & Calendário",
    title: "Aba 2: Agenda & Calendário Master",
    description:
      "Visão ampla do seu calendário para planejamento de curto, médio e longo prazo. Permite navegar entre semanas e meses para visualizar a densidade de clientes agendadas em cada período.",
    targetSelector: '[data-tutorial="sidebar-agenda"]',
    targetTab: "agenda",
    position: "right",
  },
  {
    id: "calendar-views",
    category: "AGENDA",
    categoryLabel: "Visões do Calendário",
    title: "Visão Dia, Semana e Mês Dinâmica",
    description:
      "Alterne entre visualização por dia, semana ou mês completo. O dia atual (Hoje) fica sempre destacado com um anel dourado de alta visibilidade. Use os botões 'Hoje', 'Anterior' e 'Próximo' para navegar suavemente.",
    targetSelector: '[data-tutorial="calendar-controls"]',
    targetTab: "agenda",
    position: "bottom",
  },
  {
    id: "sidebar-abertura",
    category: "ABERTURA_AGENDA",
    categoryLabel: "Abertura de Agenda",
    title: "Aba 3: Abertura Dinâmica de Agenda 🗓️",
    description:
      "Aqui você comanda quando o salão está aberto para receber clientes. Todos os dias iniciam FECHADOS por padrão, garantindo que ninguém agende datas ou horários sem sua prévia autorização.",
    targetSelector: '[data-tutorial="sidebar-abertura-agenda"]',
    targetTab: "abertura-agenda",
    position: "right",
  },
  {
    id: "abertura-selection",
    category: "ABERTURA_AGENDA",
    categoryLabel: "Seleção de Dias",
    title: "Seleção Avulsa ou em Lote",
    description:
      "Basta clicar nos dias do calendário que você quer abrir para a cliente. O sistema permite selecionar vários dias de uma só vez (ex: Terça a Sábado) para abri-los em um único clique.",
    goldenTip:
      "Clique no atalho 'Terça a Sábado' para selecionar instantaneamente todos os dias úteis do mês!",
    targetSelector: '[data-tutorial="abertura-batch-actions"], [data-tutorial="abertura-calendar-grid"]',
    targetTab: "abertura-agenda",
    position: "bottom",
  },
  {
    id: "abertura-hours",
    category: "ABERTURA_AGENDA",
    categoryLabel: "Configuração de Horários",
    title: "Jornada de Atendimento & Intervalo de Almoço",
    description:
      "Defina o horário de início (ex: 08:30), encerramento (ex: 18:30) e, se desejar, ative a pausa de almoço (ex: 12:00 às 13:00). Ao clicar em 'Abrir X dia(s)', as vagas ficam disponíveis imediatamente no portal da cliente.",
    targetSelector: '[data-tutorial="abertura-time-config"], [data-tutorial="abertura-batch-actions"], [data-tutorial="abertura-calendar-grid"]',
    targetTab: "abertura-agenda",
    position: "bottom",
  },
  {
    id: "pre-reservas-queue",
    category: "PRE_RESERVA",
    categoryLabel: "Pré-Reservas & Encaixes",
    title: "Fila de Pré-Reservas: Duas Opções de Resposta 🎯",
    description:
      "Quando uma cliente deseja agendar em um dia ainda FECHADO ou fora da sua agenda aberta, ela envia uma solicitação de pré-reserva. Você tem total flexibilidade para responder:\n\n1. 'Abrir Dia & Confirmar': abre o dia imediatamente na agenda com 1 clique.\n2. 'Montar Proposta': abre o construtor inteligente de proposta comercial para você aceitar ou contrapropor o horário com orçamento formal!",
    goldenTip:
      "O botão 'Montar Proposta' funciona mesmo para clientes que escolheram procedimentos sem triagem prévia, permitindo formalizar o orçamento e as datas.",
    targetSelector: '[data-tutorial="pre-reservation-queue"]',
    targetTab: "abertura-agenda",
    position: "bottom",
  },
  {
    id: "sidebar-triagens",
    category: "TRIAGEM",
    categoryLabel: "Fila de Triagens",
    title: "Aba 4: Fila de Triagens em Accordion Inteligente 📋",
    description:
      "Onde você recebe os diagnósticos e anamneses capilares preenchidos pelas clientes no site. A tela organiza tudo em cards sanfonados (accordions), ocupando pouquíssimo espaço e permitindo focar apenas no que você precisa ver.",
    targetSelector: '[data-tutorial="sidebar-triagens"]',
    targetTab: "triagens",
    position: "right",
  },
  {
    id: "triagem-accordion-controls",
    category: "TRIAGEM",
    categoryLabel: "Filtros & Controles",
    title: "Controle Rápido: Expandir Todos, Recolher & Filtros",
    description:
      "No topo da lista de triagens, você encontra os botões 'Expandir Todos' e 'Recolher Todos' para navegar rapidamente. O filtro inicia por padrão em 'Aguardando Resposta' com contadores em tempo real para não acumular avaliações pendentes.",
    goldenTip:
      "Clique no filtro '⚡ Solicitações de Encaixe' para ver apenas as clientes que pediram datas especiais fora da sua agenda normal.",
    targetSelector: '[data-tutorial="triage-review-queue"]',
    targetTab: "triagens",
    position: "bottom",
  },
  {
    id: "triagem-card-encaixe",
    category: "TRIAGEM",
    categoryLabel: "Destaque Visual",
    title: "Destaque Dourado para Encaixes Especiais",
    description:
      "Triagens com solicitação de pré-reserva ganham uma moldura em degradê âmbar/dourado e o selo '⚡ Solicitação de Encaixe Especial'. Assim você bate o olho e já sabe que aquela cliente necessita de alinhamento prévio de data.",
    targetSelector: '[data-tutorial="triage-review-queue"]',
    targetTab: "triagens",
    position: "bottom",
  },
  {
    id: "triagem-review",
    category: "TRIAGEM",
    categoryLabel: "Diagnóstico Capilar",
    title: "Fotos da Cliente & Alerta de Histórico Químico 🔬",
    description:
      "Ao expandir o card, você visualiza as respostas completas da cliente e as fotos enviadas (Raiz, Comprimento e Inspiração Desejada). O sistema analisa as respostas e exibe um alerta automático caso o cabelo tenha química anterior (descoloração, progressiva, etc.).",
    goldenTip:
      "Clique em qualquer foto para abrir o modal de zoom em tela cheia e inspecionar a saúde da fibra capilar mecha a mecha.",
    targetSelector: '[data-tutorial="triage-review-queue"]',
    targetTab: "triagens",
    position: "bottom",
  },
  {
    id: "proposta-modal-intro",
    category: "PROPOSTA",
    categoryLabel: "Formulação de Proposta",
    title: "Novo Construtor de Proposta em Duas Etapas 💎",
    description:
      "Ao clicar em 'Montar Proposta', surge o novo construtor inteligente dividido em 2 passos essenciais:\n\n• Passo 1: Agenda, Encaixe & Etapas Técnicas (onde você aceita ou contrapropõe a data e valida o tempo e ordem das etapas);\n• Passo 2: Diagnóstico, Etapas & Valores (onde as etapas do Passo 1 entram no cálculo financeiro, com valores individuais ou status 'Incluso no Pacote', fotos em tela cheia e desconto Pix).",
    targetSelector: '[data-tutorial="triage-proposal-btn"], [data-tutorial="triage-review-queue"]',
    targetTab: "triagens",
    position: "bottom",
  },
  {
    id: "proposta-encaixe-decisao",
    category: "PROPOSTA",
    categoryLabel: "Decisão do Encaixe",
    title: "Passo 1: Aceitar ou Recusar/Contrapropor o Encaixe",
    description:
      "Se a solicitação for um encaixe, o sistema exige primeiro a sua decisão técnica:\n\n• Aceitar Encaixe: Você define o horário exato de início no dia solicitado pela cliente;\n• Recusar e Contrapropor: Você informa outra opção viável com uma justificativa amigável (outro horário no mesmo dia, outra data específica ou um período flexível de datas).",
    goldenTip:
      "Na contraproposta por período flexível, a própria cliente escolhe o dia ideal dentro do intervalo ao abrir o link da proposta!",
    position: "center",
  },
  {
    id: "proposta-engine-conflitos",
    category: "PROPOSTA",
    categoryLabel: "Motor de Agenda",
    title: "Etapas Técnicas & Validação de Conflito em Tempo Real ⏱️",
    description:
      "Você pode ajustar a duração de cada fase do procedimento (Avaliação, Aplicação, Pausa Química, Tratamento, Finalização). Enquanto você digita os minutos, o motor de agendamento testa instantaneamente colisões com outros clientes marcados no mesmo dia e verifica se ultrapassa o horário de fechamento do salão.",
    goldenTip:
      "Se houver colisão de horário, um banner vermelho avisa na hora o motivo exato e oferece um botão para propor uma nova data para a cliente com a justificativa pré-preenchida!",
    position: "center",
  },
  {
    id: "proposta-etapa2-modulos",
    category: "PROPOSTA",
    categoryLabel: "Etapas & Valores",
    title: "Passo 2: Etapas Financeiras, Preço Incluso & Desconto Pix",
    description:
      "No segundo passo, as etapas técnicas do cronograma já aparecem integradas financeiramente. A etapa principal recebe o valor do serviço e as demais podem ser marcadas como 'Incluso no Pacote' ou ter cobrança individual. Você também pode adicionar produtos/etapas adicionais, conferir as fotos em tela cheia e calcular o valor final com desconto Pix e parcelamento.",
    goldenTip:
      "Ao clicar em qualquer foto da cliente, uma galeria em tela cheia permite navegar com setas pelo teclado ou toque entre a raiz, comprimento e inspiração desejada!",
    position: "center",
  },
  {
    id: "sidebar-propostas",
    category: "PROPOSTA",
    categoryLabel: "Propostas Comerciais",
    title: "Aba 5: Gestão de Propostas Comerciais 💎",
    description:
      "Gerencie todos os orçamentos emitidos. Propostas elegantes e personalizadas elevam a percepção de exclusividade e justificam o valor dos seus serviços de alta performance.",
    targetSelector: '[data-tutorial="sidebar-propostas"]',
    targetTab: "propostas",
    position: "right",
  },
  {
    id: "propostas-link-aprovacao",
    category: "PROPOSTA",
    categoryLabel: "Aprovação pela Cliente",
    title: "Link Dedicado (/proposta/[id]) & Aprovação Automática 📱",
    description:
      "Envie o link da proposta pelo WhatsApp. A cliente visualiza o diagnóstico, a técnica escolhida, o cronograma e os valores. Ao clicar em 'Aprovar Proposta', o agendamento é registrado como 'Confirmado' e 'Pago' no seu painel em tempo real!",
    goldenTip:
      "Se você sugeriu um período flexível, a cliente seleciona o dia e horário preferidos dentro da proposta antes de confirmar.",
    targetSelector: '[data-tutorial="proposals-manager"]',
    targetTab: "propostas",
    position: "bottom",
  },
  {
    id: "sidebar-clientes",
    category: "CLIENTES",
    categoryLabel: "CRM de Clientes",
    title: "Aba 6: Gestão de Clientes (CRM) 👤",
    description:
      "Caderno digital inteligente de todas as suas clientes. Centraliza histórico de visitas, faturamento acumulado, último procedimento realizado e campo para anotações técnicas confidenciais (ex: fórmula de cor, marcas utilizadas e teste de mecha).",
    targetSelector: '[data-tutorial="sidebar-clientes"]',
    targetTab: "clientes",
    position: "right",
  },
  {
    id: "sidebar-financeiro",
    category: "FINANCEIRO",
    categoryLabel: "Painel Financeiro",
    title: "Aba 7: Painel Financeiro & Métricas 💰",
    description:
      "Acompanhe o faturamento bruto, ticket médio por atendimento, volume recebido via Pix versus Cartão de Crédito e faturamento previsto para os próximos dias.",
    targetSelector: '[data-tutorial="sidebar-financeiro"]',
    targetTab: "financeiro",
    position: "right",
  },
  {
    id: "sidebar-servicos",
    category: "SERVICOS",
    categoryLabel: "Serviços & Etapas",
    title: "Aba 8: Serviços & Procedimentos ✂️",
    description:
      "Cadastre e edite seus serviços, preços e a arquitetura de etapas de cada um. É aqui que você informa quais etapas exigem sua atenção exclusiva e quais são pausas químicas que liberam sua bancada.",
    targetSelector: '[data-tutorial="sidebar-servicos"]',
    targetTab: "servicos",
    position: "right",
  },
  {
    id: "sidebar-modelos",
    category: "MODELOS_TRIAGEM",
    categoryLabel: "Modelos de Triagem",
    title: "Aba 9: Modelos de Anamnese & Triagem 📝",
    description:
      "Crie ou edite as perguntas feitas para a cliente no site antes do agendamento (ex: tipo de curvatura do cacho, histórico de alisamento, fotos obrigatórias).",
    targetSelector: '[data-tutorial="sidebar-modelos-triagem"]',
    targetTab: "modelos-triagem",
    position: "right",
  },
  {
    id: "sidebar-configuracoes",
    category: "CONFIGURACOES",
    categoryLabel: "Configurações do Salão",
    title: "Aba 10: Configurações & Sincronização Geral ⚙️",
    description:
      "Centralize as informações estratégicas do seu negócio: altere sua senha de acesso, configure sua meta diária de faturamento, atualize telefone de WhatsApp, endereço e horário de atendimento. Todas as alterações refletem instantaneamente no site principal!",
    targetSelector: '[data-tutorial="sidebar-configuracoes"]',
    targetTab: "configuracoes",
    position: "right",
  },
  {
    id: "keyboard-shortcuts",
    category: "ATALHOS",
    categoryLabel: "Produtividade",
    title: "Atalhos Rápidos de Teclado ⌨️",
    description:
      "Agilize seu dia a dia sem usar o mouse:\n• Pressione 'N': Abre o modal de Novo Agendamento\n• Pressione 'T': Vai direto para o dia de Hoje\n• Setas Esquerda/Direita: Avança ou retrocede dias na agenda\n• 'Esc': Fecha qualquer modal ou janela aberta.",
    position: "center",
  },
  {
    id: "tutorial-finish",
    category: "BEM_VINDO",
    categoryLabel: "Conclusão",
    title: "Tudo Pronto para Arrasar! 🚀",
    description:
      "Você agora conhece todas as engrenagens do seu sistema executivo. Use a central de ajuda sempre que precisar revisar procedimentos ou regras de negócio.",
    goldenTip:
      "Comece abrindo os dias desta semana na aba 'Abertura de Agenda' e confira as triagens pendentes para enviar propostas de luxo!",
    position: "center",
  },
];

export const MODULE_GUIDES: ModuleGuide[] = [
  {
    id: "abertura-agenda",
    title: "Como Abrir, Fechar e Comandar a Agenda do Salão",
    iconName: "CalendarCheck",
    summary:
      "Controle total dos dias e horários em que suas clientes podem agendar procedimentos.",
    keyPoints: [
      {
        label: "Estado Inicial Fechado",
        text: "Todos os dias iniciam como 'Fechado' por segurança. A cliente não consegue agendar sem sua liberação.",
      },
      {
        label: "Seleção em Lote",
        text: "Clique nos dias desejados ou use o atalho 'Terça a Sábado' para selecionar a semana inteira de uma só vez.",
      },
      {
        label: "Horário de Almoço",
        text: "Configure intervalos de pausa para bloquear agendamentos no seu horário de descanso.",
      },
    ],
    stepByStep: [
      "Acesse a aba 'Abertura de Agenda' no menu lateral do painel.",
      "Selecione o mês desejado no cabeçalho do calendário.",
      "Clique nos dias que deseja abrir (ficarão contornados com borda dourada).",
      "Defina o horário de início (ex: 08:30) e término (ex: 18:30).",
      "Se desejar intervalo de almoço, ative a opção e defina os horários (ex: 12:00 às 13:00).",
      "Clique no botão verde 'Abrir X dia(s)' para salvar. Os horários ficam disponíveis imediatamente no portal da cliente.",
      "Para fechar um dia previamente aberto, clique no card do dia e selecione 'Fechar Dia'.",
    ],
    rulesOfThumb: [
      "Abra a agenda com 15 a 30 dias de antecedência para manter a exclusividade e a fila aquecida.",
      "Mantenha domingos e segundas fechados para folga técnica e descanso.",
    ],
  },
  {
    id: "pre-reservas-encaixes",
    title: "Como Gerenciar Pré-Reservas e Solicitações de Encaixe Especial",
    iconName: "Calendar",
    summary:
      "Capte clientes mesmo quando a agenda oficial estiver lotada ou ainda não aberta.",
    keyPoints: [
      {
        label: "Captura Inteligente de Demanda",
        text: "Se um dia estiver fechado, a cliente não vai para o concorrente: o site permite enviar uma pré-reserva com o período preferido.",
      },
      {
        label: "Opção 1: Abrir Dia & Confirmar",
        text: "Abre o turno do dia solicitado automaticamente na sua agenda sem necessidade de formular proposta.",
      },
      {
        label: "Opção 2: Montar Proposta",
        text: "Permite elaborar uma proposta comercial completa para o encaixe, definindo horário, valores e contrapropostas mesmo em serviços sem triagem.",
      },
    ],
    stepByStep: [
      "Acesse a aba 'Abertura de Agenda' (seção inferior de Pré-Reservas) ou a aba 'Fila de Triagens'.",
      "Identifique o card da cliente com o selo dourado '⚡ Solicitação de Encaixe Especial'.",
      "Se desejar apenas liberar o dia rapidamente, clique em 'Abrir Dia & Confirmar'.",
      "Se quiser formalizar o orçamento e definir o horário com precisão, clique no botão 'Montar Proposta'.",
      "O modal abrirá permitindo aceitar o encaixe com o horário exato OU contrapropor outra data com justificativa.",
    ],
    rulesOfThumb: [
      "Responda as pré-reservas rapidamente para converter a cliente enquanto o interesse está alto.",
      "Use 'Montar Proposta' sempre que o procedimento for de alto valor (como mechas ou pacotes de transformação).",
    ],
  },
  {
    id: "triagens-accordion",
    title: "Como Analisar Triagens, Fotos e Histórico Químico em Accordion",
    iconName: "ClipboardList",
    summary:
      "Avalie os diagnósticos capilares em uma interface sanfonada limpa e sem poluição visual.",
    keyPoints: [
      {
        label: "Interface em Accordion",
        text: "Cada triagem é um card retrátil. Você expande apenas o atendimento que deseja analisar no momento.",
      },
      {
        label: "Controles Rápidos",
        text: "Use os botões 'Expandir Todos' e 'Recolher Todos' para alternar a visualização de todos os cards com 1 clique.",
      },
      {
        label: "Filtro Padrão 'Aguardando Resposta'",
        text: "A tela abre focando apenas nas triagens pendentes, evitando distrações com atendimentos já resolvidos.",
      },
      {
        label: "Zoom de Fotos & Alerta de Química",
        text: "Inspecione fotos da raiz, comprimento e inspiração em tela cheia com alertas automáticos de químicas anteriores.",
      },
    ],
    stepByStep: [
      "Acesse a aba 'Fila de Triagens' no menu lateral.",
      "Os cards iniciam recolhidos para economizar espaço e manter a tela organizada.",
      "Clique sobre o card da cliente desejada para expandir todos os detalhes da anamnese.",
      "Verifique as respostas sobre tipo de curvatura, rotina capilar e procedimentos anteriores.",
      "Clique nas fotos enviadas para abrir o visualizador de alta resolução em tela cheia.",
      "Observe se há alerta em âmbar sobre histórico de química recente (essencial para planejar o teste de mecha).",
      "Clique em 'Montar Proposta' para iniciar a formulação do orçamento personalizado.",
    ],
    rulesOfThumb: [
      "Sempre inspecione a foto da raiz para avaliar o crescimento real e a densidade dos fios.",
      "Cabelos com histórico de química exigem módulo de reposição lipídica prévia na proposta.",
    ],
  },
  {
    id: "proposta-inteligente",
    title: "Como Formular Propostas de Luxo, Aceitar Encaixes e Contrapropor Datas",
    iconName: "Sparkles",
    summary:
      "O fluxo moderno de propostas consultivas com decisões claras de agenda e alto poder de conversão.",
    keyPoints: [
      {
        label: "Passo 1: Decisão Obrigatória de Agenda",
        text: "Em solicitações de encaixe, você primeiro decide se aceita o horário solicitado ou se envia uma contraproposta.",
      },
      {
        label: "Três Tipos de Contraproposta",
        text: "Você pode sugerir: 1) Outro horário no mesmo dia; 2) Outra data específica; ou 3) Um período flexível de datas.",
      },
      {
        label: "Justificativa Técnica Amigável",
        text: "A proposta inclui um texto explicando à cliente o motivo do ajuste, transmitindo profissionalismo e zelo.",
      },
      {
        label: "Passo 2: Módulos de Serviço & Descontos",
        text: "Definição dos procedimentos, valor com desconto de pacote e cálculo automático do Pix com 5% OFF.",
      },
    ],
    stepByStep: [
      "No card da triagem ou da pré-reserva, clique no botão 'Montar Proposta'.",
      "No Passo 1 ('Agenda, Encaixe & Etapas'), visualize a data e o horário solicitados pela cliente.",
      "Se for um encaixe, escolha 'Aceitar Encaixe' e fixe o horário de início (ex: 09:00 ou 13:30).",
      "Se não puder atender naquele momento, escolha 'Recusar e Propor Nova Data/Horário' e selecione o tipo de sugestão.",
      "Escreva a justificativa para a cliente (ou use o botão 'Usar sugestão padrão').",
      "Clique em 'Continuar para Proposta Técnica & Valores'.",
      "Revise os módulos de serviço (o sistema inclui automaticamente o preparatório se houver química anterior).",
      "Defina o valor final da proposta e confira o valor com 5% de desconto no Pix.",
      "Clique em 'Salvar e Gerar Link Web / PDF'. O link é gerado e pronto para envio pelo WhatsApp!",
    ],
    rulesOfThumb: [
      "Ao contrapropor datas, seja acolhedora: enfatize que a mudança visa entregar um resultado perfeito com dedicação exclusiva.",
      "Mantenha o desconto Pix entre 5% e 10% para estimular o pagamento à vista imediato.",
    ],
  },
  {
    id: "motor-etapas-conflito",
    title: "Como Funciona o Motor de Etapas Técnicas e Validação de Conflito de Horário",
    iconName: "Zap",
    summary:
      "Entenda o cálculo inteligente minuto a minuto que impede agendamentos inviáveis ou sobreposições de horários.",
    keyPoints: [
      {
        label: "Etapas Ativas vs Pausas Químicas",
        text: "Etapas ativas exigem sua atenção exclusiva. Pausas químicas são tempos de ação que liberam sua bancada.",
      },
      {
        label: "Cálculo em Tempo Real",
        text: "Conforme você altera a duração em minutos de qualquer fase, o sistema recalcula a duração total e o horário final.",
      },
      {
        label: "Detecção Automática de Conflito",
        text: "O motor cruza os horários da proposta com todos os outros agendamentos existentes no salão para aquele mesmo dia.",
      },
      {
        label: "Ação Rápida de Reagendamento",
        text: "Em caso de conflito, um clique no alerta vermelho muda automaticamente a proposta para reagendamento.",
      },
    ],
    stepByStep: [
      "No Passo 1 do modal de proposta, localize a seção 'Etapas Técnicas do Procedimento & Duração'.",
      "Veja as etapas padrões carregadas (Avaliação, Aplicação, Pausa Química, Lavatório, Tratamento, Finalização).",
      "Ajuste os minutos de cada etapa conforme a realidade do cabelo daquela cliente.",
      "Se necessário, adicione novas etapas clicando em 'Adicionar Etapa' ou remova etapas desnecessárias.",
      "Observe o banner de validação: se estiver verde ('✅ Horário 100% Viável'), o procedimento cabe perfeitamente na grade.",
      "Se o banner estiver vermelho ('⚠️ Conflito Técnico Detectado'), leia o motivo (ex: atendimento de outra cliente naquele horário).",
      "Clique em '👉 Propor Nova Data / Horário para a Cliente' para resolver o conflito sem dor de cabeça.",
    ],
    rulesOfThumb: [
      "Nunca reduza artificialmente o tempo de pausa química do produto para forçar um encaixe.",
      "Considere sempre 30 a 40 minutos para a finalização com estilização em cabelos cacheados.",
    ],
  },
  {
    id: "aprovacao-cliente-realtime",
    title: "Como a Cliente Aprova a Proposta e a Mágica da Sincronização em Tempo Real",
    iconName: "CheckCircle2",
    summary:
      "Acompanhe o momento exato em que a cliente fecha o procedimento e como o sistema atualiza tudo sozinho.",
    keyPoints: [
      {
        label: "Página Exclusiva da Cliente",
        text: "A cliente recebe um link elegante (/proposta/[id]) com visual de revista Vogue e identidade oficial da Gleicy.",
      },
      {
        label: "Escolha de Data Flexível",
        text: "Se você sugeriu um intervalo de datas, a cliente escolhe o dia e horário que prefere diretamente na tela da proposta.",
      },
      {
        label: "Confirmação Automática de Agendamento",
        text: "Ao clicar em 'Aprovar Proposta', o agendamento é gerado como confirmado e a pré-reserva é convertida.",
      },
      {
        label: "Sincronização Realtime (Sem F5)",
        text: "Seu dashboard recebe a notificação em tempo real via WebSocket, atualizando a fila e o calendário na hora.",
      },
    ],
    stepByStep: [
      "Após salvar a proposta, copie o link público ou clique em 'Enviar WhatsApp'.",
      "A cliente abre o link no celular ou computador e visualiza toda a proposta diagramada.",
      "Ela confere o projeto, a técnica, os diferenciais e a data reservada ou sugerida.",
      "Se você sugeriu período flexível, ela escolhe o dia ideal no seletor de data antes de aprovar.",
      "Ela clica no botão dourado 'Aprovar Proposta e Confirmar Agendamento'. Uma chuva de confetes confirma o aceite!",
      "No seu painel executivo, o agendamento surge automaticamente confirmado e pronto na sua agenda.",
    ],
    rulesOfThumb: [
      "Oriente a cliente a aprovar dentro das 48h para segurar a data e o valor do Pix.",
      "Envie uma mensagem carinhosa de boas-vindas logo após a aprovação para reforçar a experiência VIP.",
    ],
  },
  {
    id: "intercalamento-quimico",
    title: "O Segredo do Intercalamento Produtivo em Pausas Químicas",
    iconName: "Zap",
    summary:
      "Aumente seu faturamento atendendo até duas clientes simultâneas sem perder o padrão de luxo.",
    keyPoints: [
      {
        label: "Etapas Ativas (Atenção Exclusiva)",
        text: "Diagnóstico, mechas e estilização. Nenhuma outra cliente é encaixada nestes minutos.",
      },
      {
        label: "Etapas de Pausa (Tempo de Ação)",
        text: "Tempo em que o produto age nos fios. O sistema abre vaga automática apenas para procedimentos rápidos.",
      },
      {
        label: "Tolerância Máxima",
        text: "O motor nunca permite um encaixe que ultrapasse o tempo de ação do produto nos fios da cliente principal.",
      },
    ],
    stepByStep: [
      "No cadastro do serviço (aba 'Serviços'), defina as etapas e marque 'Pausa' no tempo de ação química.",
      "Quando uma cliente agenda um serviço com pausa química (ex: Iluminado), a timeline reserva a pausa.",
      "O portal da cliente passa a exibir horários de 'Encaixe Otimizado' apenas para serviços rápidos (ex: Corte ou Escova).",
      "A timeline na 'Operação do Dia' posiciona o atendimento secundário exatamente dentro da janela livre.",
    ],
    rulesOfThumb: [
      "Nunca ultrapasse 1 cliente em paralelo para garantir conforto e tranquilidade no salão.",
      "Avise a cliente principal que enquanto o produto age você fará uma finalização rápida.",
    ],
  },
  {
    id: "configuracoes-sincronizacao",
    title: "Configurações da Conta, Metas de Faturamento e Sincronização com o Site",
    iconName: "Settings",
    summary:
      "Mantenha os dados do salão, meta diária e contatos sempre atualizados e sincronizados em toda a plataforma.",
    keyPoints: [
      {
        label: "Aba 10: Configurações",
        text: "Acesse a aba 'Configurações' no menu lateral para gerenciar dados da conta, salão e preferências operacionais.",
      },
      {
        label: "Alteração Segura de Senha",
        text: "Permite à Gleicy atualizar a senha de acesso a qualquer momento diretamente no Supabase Auth.",
      },
      {
        label: "Meta Diária de Faturamento",
        text: "Defina sua meta diária em reais (R$) para acompanhar o progresso de faturamento na tela de Operação do Dia.",
      },
      {
        label: "Sincronização com o Site Principal",
        text: "WhatsApp, endereço e horários alterados aqui são atualizados automaticamente na página inicial dos clientes.",
      },
    ],
    stepByStep: [
      "Clique na aba 'Configurações' no menu lateral do dashboard.",
      "Para alterar a senha, digite a nova senha desejada e clique em 'Atualizar Senha'.",
      "Para ajustar sua meta de vendas, informe o valor da Meta Diária (ex: R$ 1.500) na seção financeira.",
      "Atualize o telefone de WhatsApp, endereço e horários de funcionamento do salão nos campos correspondentes.",
      "Clique em 'Salvar Configurações'. Todas as telas e o site do cliente sincronizam imediatamente!",
    ],
    rulesOfThumb: [
      "Mantenha o telefone de WhatsApp sempre atualizado para receber os alertas e mensagens de clientes.",
      "Revise sua meta diária todo início de mês para acompanhar o crescimento do salão.",
    ],
  },
];

// ========================================================
// GUIA COMPLETO DAS 10 NOVIDADES DA ATUALIZAÇÃO 2.0 (R1–R10)
// ========================================================
export const UPDATE_RELEASE_FEATURES: UpdateReleaseFeature[] = [
  {
    id: "update-services-pricing",
    number: 1,
    tag: "Serviços & Catálogo",
    title: "Preço Fixo ou Faixa ('A partir de...')",
    shortSummary: "Cadastre serviços com valor fixo ou faixa flexível de preço para procedimentos sob medida.",
    iconName: "Tag",
    targetTab: "servicos",
    whatChanged:
      "Agora você pode cadastrar e editar serviços definindo se o preço é Fixo (ex: R$ 180,00) ou uma Faixa ('A partir de R$ 350,00 até R$ 600,00'). Todos os seus serviços cadastrados anteriormente foram mantidos como preço fixo e podem ser alterados a qualquer momento.",
    howToUse: [
      "No menu lateral, clique na aba 'Serviços' e depois em 'Editar' em qualquer serviço ou no botão '+ Novo Serviço'.",
      "No campo 'Modalidade de Preço', alterne entre 'Preço Fixo' e 'A partir de... (Faixa)'.",
      "Informe o valor inicial obrigatório e, se desejar, defina também o valor máximo da faixa.",
      "Salve as alterações. No catálogo público da cliente, o serviço será exibido com 'A partir de R$ X' de forma elegante e transparente.",
    ],
    goldenTip:
      "Para Mechas, Iluminados e Tratamentos Capilares onde a quantidade de produto varia com o comprimento do cabelo, use 'A partir de...'. Isso alinha expectativas antes da avaliação presencial.",
  },
  {
    id: "update-multi-services",
    number: 2,
    tag: "Experiência da Cliente",
    title: "'Montar o meu atendimento' (Múltiplos Procedimentos)",
    shortSummary: "Sua cliente agora pode escolher 2 ou mais procedimentos juntos no site em um único agendamento.",
    iconName: "Sparkles",
    targetTab: "agenda",
    whatChanged:
      "Adicionamos no catálogo público o recurso 'Montar o meu atendimento'. A cliente consegue marcar simultaneamente mechas, corte, tratamento ou escova. O sistema soma os valores, calcula a duração combinada e encadeia as etapas técnicas respeitando as pausas químicas.",
    howToUse: [
      "Ao acessar a página inicial do salão, a cliente visualiza o botão dourado '✨ Montar o meu atendimento'.",
      "Ela seleciona todos os procedimentos desejados com um clique e confere o tempo total e investimento estimado.",
      "Ao avançar, o sistema solicita uma única triagem ou oferece as datas com slots suficientes na sua grade.",
      "No seu painel, o agendamento surge consolidado com todos os procedimentos listados na ficha técnica.",
    ],
    goldenTip:
      "Se a cliente montar Mechas + Corte, o motor do salão aproveita o intervalo de ação da química para o corte ou o posiciona logo após, otimizando sua tarde sem atrasos.",
  },
  {
    id: "update-accordions-view",
    number: 3,
    tag: "Agenda & Calendário",
    title: "Edição em Todas as Visões & Nova Visão em Accordions",
    shortSummary: "Edite agendamentos no Mês, Semana e Dia e veja todos os serviços em accordions ordenados por data.",
    iconName: "Calendar",
    targetTab: "agenda",
    whatChanged:
      "Agora você pode clicar e editar qualquer agendamento existente diretamente nas visões Mensal, Semanal e Diária. Além disso, criamos a 4ª visualização master: 'Accordions', que agrupa todos os seus atendimentos dia a dia em sanfonas expansíveis com resumo de faturamento e clientes.",
    howToUse: [
      "Acesse a aba 'Agenda & Calendário'.",
      "Alterne entre as 4 visualizações no topo: 'Visão Mensal', 'Semanal', 'Diária' e o novo botão 'Accordions'.",
      "Na visão em Accordions, cada data exibe a quantidade de atendimentos e o faturamento total daquele dia no cabeçalho.",
      "Em qualquer visualização, clique no botão de edição (ícone de lápis) sobre qualquer atendimento para alterar horários, procedimentos ou cliente.",
    ],
    goldenTip:
      "Use a visão em Accordions no início da semana para ter um raio-x completo e sequencial de tudo que vai entrar no caixa nos próximos dias.",
  },
  {
    id: "update-untriaged-badge",
    number: 4,
    tag: "Operação & WhatsApp",
    title: "Notificação Persistente de Serviços sem Triagem & WhatsApp",
    shortSummary: "Badge numérico que não sai da tela até você confirmar e abrir a mensagem de WhatsApp da cliente.",
    iconName: "Bell",
    targetTab: "operacao",
    whatChanged:
      "Para serviços que não exigem triagem prévia (como corte ou escova), o sistema agora exibe um badge numérico pulsante e persistente na barra lateral e um card destacado no topo da tela 'Operação do Dia'. O badge não desaparece até que você clique em confirmar.",
    howToUse: [
      "Quando uma cliente agendar direto, um alerta sonoro e um badge âmbar surgirão no menu 'Operação'.",
      "No topo da Operação do Dia, confira o card 'Confirmação Necessária • Agendamento sem Triagem'.",
      "Clique no botão 'Confirmar e Abrir WhatsApp'.",
      "O sistema consolida a vaga na sua grade e abre automaticamente o WhatsApp Web (ou app) com a mensagem oficial pré-formatada para a cliente.",
    ],
    goldenTip:
      "Você não corre mais o risco de esquecer de enviar a confirmação: enquanto você não clicar no botão verde de confirmação, o aviso continuará ativo lembrando você.",
  },
  {
    id: "update-confirmation-template",
    number: 5,
    tag: "Configurações & Diretrizes",
    title: "Mensagens Padrão de Confirmação & Política 24h / 50%",
    shortSummary: "Personalize sua mensagem padrão de confirmação com a política oficial de cancelamento e retenção de crédito.",
    iconName: "MessageCircle",
    targetTab: "configuracoes",
    whatChanged:
      "Criamos uma nova aba em 'Configurações' para você cadastrar e personalizar os templates de mensagem de confirmação do WhatsApp. O sistema já vem carregado com o seu texto oficial de 24h de aviso e 50% retido como crédito para uso em até 15 dias.",
    howToUse: [
      "Acesse a aba 'Configurações' no menu lateral e clique na sub-aba 'Mensagem de Confirmação'.",
      "Veja o Live Preview no celular virtual ao lado mostrando exatamente como a cliente receberá o texto.",
      "Edite o texto livremente utilizando as variáveis dinâmicas como {cliente}, {servico}, {data} e {horario}.",
      "Clique em 'Salvar Mensagem de Confirmação' ou use 'Restaurar Mensagem Padrão' para voltar ao texto oficial a qualquer momento.",
    ],
    goldenTip:
      "A política de 24 horas formalizada protege seu faturamento contra faltas de última hora e garante que o valor retido seja aproveitado em até 15 dias pela cliente.",
  },
  {
    id: "update-realtime-sync",
    number: 6,
    tag: "Alta Tecnologia",
    title: "Sincronização em Tempo Real (Sem F5) & Efetivação do Agendamento",
    shortSummary: "Aprovação de propostas pela cliente agora surge instantaneamente no seu painel com vaga confirmada.",
    iconName: "Zap",
    targetTab: "operacao",
    whatChanged:
      "Solucionamos o atraso na aprovação de propostas: agora, no mesmo milissegundo em que a cliente clica em 'Aprovar Proposta' no link do celular dela, o seu painel executivo atualiza automaticamente sem você precisar apertar F5, e o agendamento é gravado com status 'Confirmado'.",
    howToUse: [
      "Deixe seu painel aberto normalmente durante o dia.",
      "Quando uma cliente aceitar um orçamento ou proposta comercial pelo WhatsApp, você ouvirá uma notificação sonora sutil.",
      "O card da proposta migra para 'Aprovada' e o horário bloqueia na sua timeline imediatamente.",
      "O indicador verde 'Sincronizado' no topo da tela garante que sua conexão Supabase Realtime via WebSockets está saudável.",
    ],
    goldenTip:
      "Mesmo se você estiver com o navegador em outra aba ou no celular, a sincronização instantânea garante que duas pessoas nunca disputem o mesmo horário.",
  },
  {
    id: "update-manual-proposals",
    number: 7,
    tag: "Propostas Comerciais",
    title: "Propostas Manuais, Portal por Telefone & Rastreio de 1º Acesso",
    shortSummary: "Crie propostas avulsas direto pelo painel, envie no WhatsApp e saiba quando a cliente abriu o link pela 1ª vez.",
    iconName: "FileText",
    targetTab: "propostas",
    whatChanged:
      "Você não depende mais de a cliente mandar uma triagem para gerar uma proposta: pode clicar em '+ Nova Proposta Manual' e montar propostas luxuosas do zero. Além disso, criamos o portal /meus-agendamentos (onde a cliente faz login apenas com o telefone) e um badge que mostra a data/hora exata em que ela abriu a proposta.",
    howToUse: [
      "Na aba 'Propostas Comerciais', clique no botão '+ Nova Proposta Manual'.",
      "Informe o nome, WhatsApp da cliente, adicione os procedimentos e escolha a data.",
      "Ao gerar, copie o link e mande para a cliente com as instruções de login por telefone.",
      "Na lista de propostas, observe a etiqueta 'Visualizada em [data/hora]' que surge no instante em que a cliente abrir o link!",
    ],
    goldenTip:
      "O selo de primeiro acesso permite você saber exatamente quando a cliente leu a proposta, ajudando você a puxar conversa no WhatsApp no momento ideal para fechar o atendimento.",
  },
  {
    id: "update-multi-appointment-builder",
    number: 8,
    tag: "Agendamentos Diretos",
    title: "Múltiplos Procedimentos e Valores Personalizados no Painel",
    shortSummary: "Adicione vários procedimentos em um agendamento manual, edite valores e marque itens como avulsos.",
    iconName: "CheckSquare",
    targetTab: "agenda",
    whatChanged:
      "Ao clicar em '+ Novo Agendamento' no painel, você agora encontra o novo construtor de procedimentos: selecione múltiplos serviços, adicione procedimentos avulsos, defina a duração de cada um e alterne entre 'Cobrar no Total' ou '✓ Incluso / Avulso'.",
    howToUse: [
      "Clique em '+ Novo Agendamento' ou pressione a tecla 'N' no seu teclado.",
      "Na seção 'Procedimentos do Atendimento', clique em '+ Adicionar Procedimento'.",
      "Escolha do catálogo ou digite um procedimento personalizado com valor e duração.",
      "Use o botão 'Cobrar no Total' vs '✓ Incluso / Avulso' se quiser bonificar um tratamento ou aplicar desconto manual no valor final.",
    ],
    goldenTip:
      "Ao presentear a cliente com uma hidratação de cortesia, marque-a como '✓ Incluso / Avulso': ela aparecerá na ficha técnica e no histórico dela sem alterar o total a ser cobrado no caixa.",
  },
  {
    id: "update-uncommitted-quotes",
    number: 9,
    tag: "Orçamentos",
    title: "Criação de Orçamentos sem Compromisso (Sem Travar Horário)",
    shortSummary: "Envie e registre orçamentos para clientes indecisas sem ocupar ou bloquear vagas na sua agenda.",
    iconName: "Clock",
    targetTab: "operacao",
    whatChanged:
      "Agora o sistema suporta 'Orçamentos sem Compromisso' (uncommitted_quote). A cliente (ou você) pode enviar uma solicitação com horário desejado para estimativa de preço, mas o motor de agendamento NÃO bloqueia o horário na sua agenda até que a proposta seja aprovada.",
    howToUse: [
      "No fluxo do site da cliente, ela pode optar por 'Solicitar Orçamento sem Bloquear Horário'.",
      "No painel, orçamentos aparecem com tag específica, permitindo você analisar o perfil da cliente com calma.",
      "O horário permanece 100% disponível para outra cliente que quiser agendar e confirmar de imediato.",
      "Quando a cliente aprovar a proposta enviada, o sistema converte o orçamento em agendamento confirmado e bloqueia a grade.",
    ],
    goldenTip:
      "Evita o problema clássico de salão onde uma cliente 'segura' o melhor horário de sábado para tirar dúvidas e depois desiste, tirando a vez de uma cliente pagante.",
  },
  {
    id: "update-direct-triage-approval",
    number: 10,
    tag: "Triagens Rápidas",
    title: "Aprovação Direta de Triagens (Sem Obrigação de Proposta)",
    shortSummary: "Aprove e confirme pré-agendamentos na fila de triagem com um clique rápido quando a proposta não for necessária.",
    iconName: "CheckCircle2",
    targetTab: "triagens",
    whatChanged:
      "Você não é mais obrigada a elaborar uma proposta comercial para cada triagem recebida. Se a cliente já for conhecida ou o procedimento for simples e sem dúvidas, basta clicar no novo botão verde 'Aprovar Diretamente'.",
    howToUse: [
      "Acesse a aba 'Triagens Recebidas' no menu lateral.",
      "Localize a triagem da cliente na lista de pendentes.",
      "Ao lado do botão tradicional 'Montar Proposta', clique no novo botão 'Aprovar Diretamente'.",
      "Confirme a ação: o agendamento é aprovado na hora, a vaga é consolidada na agenda e a pré-reserva é concluída com sucesso.",
    ],
    goldenTip:
      "Economize tempo valioso: use 'Montar Proposta' apenas para grandes transformações e mechas complexas, e 'Aprovar Diretamente' para cortes, manutenções e clientes habituais.",
  },
];

// ========================================================
// TOUR INTERATIVO DAS NOVIDADES (COM HOLOFOTE NO DASHBOARD)
// ========================================================
export const UPDATE_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "update-tour-welcome",
    category: "NOVIDADES",
    categoryLabel: "Tour das Novidades",
    title: "Conheça as Novidades da Atualização 2.0 ✨",
    description:
      "Preparamos um tour rápido e visual para mostrar exatamente onde ficam as 10 novas ferramentas no seu painel. Vamos dar uma olhada juntos?",
    goldenTip: "Você pode avançar passo a passo ou fechar este tour a qualquer momento.",
    position: "center",
  },
  {
    id: "update-tour-untriaged",
    category: "NOVIDADES",
    categoryLabel: "Agendamentos sem Triagem",
    title: "1. Fila de Agendamentos sem Triagem & WhatsApp",
    description:
      "Aqui na tela Operação do Dia, clientes que agendaram serviços sem triagem ficam em destaque permanente até você clicar em 'Confirmar e Abrir WhatsApp'.",
    goldenTip: "O badge numérico no menu lateral permanece ativo para você nunca esquecer de enviar a confirmação.",
    targetSelector: '[data-tutorial="pending-confirmations-box"], [data-tutorial="sidebar-operacao"]',
    targetTab: "operacao",
    position: "bottom",
  },
  {
    id: "update-tour-accordions",
    category: "NOVIDADES",
    categoryLabel: "Agenda & Accordions",
    title: "2. Nova Visão em Accordions & Edição Livre",
    description:
      "Aqui no calendário, o novo botão 'Accordions' agrupa todos os agendamentos por data com faturamento diário. Além disso, agora você pode editar qualquer agendamento em todas as visões!",
    goldenTip: "Clique no ícone de lápis em qualquer card para alterar horários, valores ou procedimentos.",
    targetSelector: '[data-tutorial="calendar-view-accordions"], [data-tutorial="calendar-controls"]',
    targetTab: "agenda",
    position: "bottom",
  },
  {
    id: "update-tour-manual-proposal",
    category: "NOVIDADES",
    categoryLabel: "Propostas Manuais",
    title: "3. Proposta Manual Direta & Rastreio de 1º Acesso",
    description:
      "Agora você pode clicar em '+ Nova Proposta Manual' para gerar propostas mesmo sem pré-agendamento no site, e ver exatamente quando a cliente abriu a proposta pelo badge de visualização.",
    goldenTip: "Sua cliente também pode acessar o novo portal /meus-agendamentos logando apenas com o número de WhatsApp.",
    targetSelector: '[data-tutorial="proposals-new-manual-btn"], [data-tutorial="sidebar-propostas"]',
    targetTab: "propostas",
    position: "bottom",
  },
  {
    id: "update-tour-direct-triage",
    category: "NOVIDADES",
    categoryLabel: "Aprovação de Triagens",
    title: "4. Aprovação Direta de Triagens com 1 Clique",
    description:
      "Na fila de triagens, você não precisa mais montar proposta para tudo: o novo botão 'Aprovar Diretamente' agenda a cliente imediatamente.",
    goldenTip: "Ideal para cortes, retoques e clientes antigas que não precisam de orçamento detalhado.",
    targetSelector: '[data-tutorial="triage-approve-directly-btn"], [data-tutorial="sidebar-triagens"]',
    targetTab: "triagens",
    position: "bottom",
  },
  {
    id: "update-tour-services-pricing",
    category: "NOVIDADES",
    categoryLabel: "Serviços & Preços",
    title: "5. Preço Fixo ou Faixa ('A partir de...')",
    description:
      "No cadastro de serviços, você agora escolhe entre Preço Fixo ou Faixa ('A partir de R$ X até R$ Y'). Todos os serviços antigos continuam fixos e editáveis.",
    goldenTip: "No site, suas clientes também contam com a opção 'Montar o meu atendimento' para escolher múltiplos serviços juntos.",
    targetSelector: '[data-tutorial="sidebar-servicos"]',
    targetTab: "servicos",
    position: "right",
  },
  {
    id: "update-tour-settings-whatsapp",
    category: "NOVIDADES",
    categoryLabel: "Mensagem Padrão 24h",
    title: "6. Mensagem de Confirmação Configurável",
    description:
      "Nas Configurações, você pode personalizar a mensagem do WhatsApp enviada às clientes, já inicializada com a política de 24h e 50% de retenção de crédito.",
    goldenTip: "Veja o Live Preview no celular ao lado para conferir como o texto fica no WhatsApp.",
    targetSelector: '[data-tutorial="settings-whatsapp-template"], [data-tutorial="sidebar-configuracoes"]',
    targetTab: "configuracoes",
    position: "top",
  },
  {
    id: "update-tour-realtime-status",
    category: "NOVIDADES",
    categoryLabel: "Realtime Instantâneo",
    title: "7. Sincronização em Tempo Real (Sem F5)",
    description:
      "Quando uma cliente aprova uma proposta ou envia um agendamento, sua tela atualiza no mesmo instante via WebSocket sem precisar recarregar!",
    goldenTip: "O pontinho verde 'Sincronizado' no topo confirma que sua agenda está conectada e viva em tempo real.",
    targetSelector: '[data-tutorial="header-status"]',
    position: "bottom",
  },
];
