/**
 * Bot de Pré-Triagem Determinístico para WhatsApp (Sem IA)
 * Fornece respostas imediatas para dúvidas frequentes, links de agendamento/triagem,
 * endereço/horários ou transfere para o atendimento manual da Gleicy.
 */

export interface ChatSession {
  lastInteraction: number;
  stage: "MENU" | "WAITING_GLEICY" | "INFO";
}

// Mapa em memória para gerenciar a sessão dos clientes (limpa após 4 horas de inatividade)
const sessions = new Map<string, ChatSession>();

const SESSION_TIMEOUT_MS = 4 * 60 * 60 * 1000; // 4 horas
const HUMAN_TAKEOVER_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 horas para Gleicy falar sem o bot interromper

export class WhatsAppTriageBot {
  /**
   * Limpa sessões expiradas
   */
  private static cleanupSessions() {
    const now = Date.now();
    for (const [phone, session] of sessions.entries()) {
      if (now - session.lastInteraction > SESSION_TIMEOUT_MS) {
        sessions.delete(phone);
      }
    }
  }

  /**
   * Reseta ou coloca um contato no modo manual (ex: quando a Gleicy assume a conversa)
   */
  public static setHumanTakeover(phone: string) {
    sessions.set(phone, {
      lastInteraction: Date.now(),
      stage: "WAITING_GLEICY",
    });
  }

  /**
   * Processa a mensagem recebida e retorna a resposta apropriada (se houver)
   */
  public static processIncomingMessage(
    senderPhone: string,
    messageText: string
  ): { reply?: string; shouldNotifyGleicy?: boolean } {
    this.cleanupSessions();

    const normalizedText = (messageText || "").trim().toLowerCase();
    const now = Date.now();
    const session = sessions.get(senderPhone);

    // Se o cliente digitar explicitamente comando de reinício, sempre volta para o menu
    if (["menu", "inicio", "início", "voltar"].includes(normalizedText)) {
      sessions.set(senderPhone, { lastInteraction: now, stage: "MENU" });
      return { reply: this.getMainMenuMessage() };
    }

    // Se o cliente estiver aguardando a Gleicy mas enviou saudação após 2h, reabre o menu
    if (["oi", "olá", "ola", "bom dia", "boa tarde", "boa noite"].includes(normalizedText) && session?.stage === "WAITING_GLEICY") {
      if (now - session.lastInteraction > 2 * 60 * 60 * 1000) {
        sessions.set(senderPhone, { lastInteraction: now, stage: "MENU" });
        return { reply: this.getMainMenuMessage() };
      }
    }

    // Se a Gleicy foi acionada e o cliente ainda está no período de espera manual, o bot fica em silêncio
    if (session && session.stage === "WAITING_GLEICY") {
      if (now - session.lastInteraction < HUMAN_TAKEOVER_TIMEOUT_MS) {
        session.lastInteraction = now;
        return {};
      }
    }

    // Se for um novo contato ou sessão expirada, envia o menu de boas-vindas
    if (!session || now - session.lastInteraction > SESSION_TIMEOUT_MS) {
      sessions.set(senderPhone, { lastInteraction: now, stage: "MENU" });
      return { reply: this.getMainMenuMessage() };
    }

    // Atualiza timestamp
    session.lastInteraction = now;

    // Se o cliente digitar "menu", sempre exibe o menu principal
    if (["menu", "inicio", "início", "voltar"].includes(normalizedText)) {
      session.stage = "MENU";
      return { reply: this.getMainMenuMessage() };
    }

    // Processamento de opções do menu principal
    if (session.stage === "MENU" || session.stage === "INFO") {
      switch (normalizedText) {
        case "1":
          session.stage = "INFO";
          return {
            reply:
              `✨ *Agendamento & Avaliação Capilar* ✨\n\n` +
              `Para agendar seu horário ou fazer sua *Triagem Capilar Online* personalizada com fotos do seu cabelo, acesse nosso site oficial:\n\n` +
              `👉 https://gleicyronha.com.br\n\n` +
              `Lá você pode preencher o formulário em menos de 2 minutos e a Gleicy monta uma proposta sob medida para você!\n\n` +
              `_Digite *menu* para voltar às opções._`,
          };

        case "2":
          session.stage = "INFO";
          return {
            reply:
              `💆‍♀️ *Mechas, Cachos e Tratamentos Especializados* 🌿\n\n` +
              `• *Cachos & Transição:* Corte a seco, finalização e tratamentos de alta performance para curvaturas 2A a 4C.\n` +
              `• *Mechas & Iluminação:* Procedimentos com foco total na saúde capilar. Obrigatório teste de mecha prévio para garantir a integridade dos fios.\n` +
              `• *Cronograma e Reconstrução:* Tratamentos personalizados conforme a necessidade do seu cabelo.\n\n` +
              `Valores exatos e tempo de procedimento são passados após avaliação pela nossa Triagem Online ou presencial!\n\n` +
              `_Digite *menu* para voltar às opções ou *4* para falar com a Gleicy._`,
          };

        case "3":
          session.stage = "INFO";
          return {
            reply:
              `📍 *Localização & Horários de Funcionamento* ⏰\n\n` +
              `• *Atendimento:* Terça a Sábado, das 09h às 18h (com horário marcado).\n` +
              `• *Cidade:* Salto - SP\n` +
              `• *Espaço Gleicy Ronha Studio*\n\n` +
              `Para agendamentos presenciais, consulte as datas disponíveis em nosso site ou envie uma mensagem selecionando a opção 4.\n\n` +
              `_Digite *menu* para voltar às opções._`,
          };

        case "4":
          session.stage = "WAITING_GLEICY";
          return {
            reply:
              `👩‍🦱 *Atendimento Direto com a Gleicy*\n\n` +
              `Perfeito! Registrei seu contato e avisei a Gleicy.\n` +
              `Como ela pode estar em atendimento na bancada, assim que ela fizer uma pausa responderá você por aqui pessoalmente com todo carinho! 🥰\n\n` +
              `Se quiser adiantar sua dúvida ou fotos do seu cabelo, pode enviar por aqui!`,
            shouldNotifyGleicy: true,
          };

        default:
          return {
            reply:
              `Desculpe, não entendi essa opção. 🤔\n\n` +
              this.getMainMenuMessage(),
          };
      }
    }

    return {};
  }

  /**
   * Mensagem padrão do menu inicial
   */
  public static getMainMenuMessage(): string {
    return (
      `Olá! Seja muito bem-vinda ao *Espaço Gleicy Ronha* ✨🌿\n` +
      `Especialista em Cachos, Tratamentos e Transformações Capilares.\n\n` +
      `Como posso te ajudar hoje? Digite o *número* da opção desejada:\n\n` +
      `1️⃣ *Agendar Horário ou Fazer Triagem Online*\n` +
      `2️⃣ *Informações sobre Mechas, Cachos e Serviços*\n` +
      `3️⃣ *Localização e Horários de Atendimento*\n` +
      `4️⃣ *Falar diretamente com a Gleicy*\n\n` +
      `_Digite o número correspondente à sua dúvida._`
    );
  }
}
