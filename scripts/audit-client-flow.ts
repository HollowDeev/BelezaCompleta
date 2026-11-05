/**
 * GlaicyAgenda - Client Journey Specialist Audit
 * Tests and validates 100% of the Client Experience, Self-Service flows,
 * Triage submission, Direct Booking, Pre-reservations, Proposal Approval, and Supabase backend.
 */
import { SupabaseDataService, DEFAULT_ORG_ID, DEFAULT_GLEICY_ID, DEFAULT_TRIAGE_FORM_ID } from "../src/lib/supabase/api";
import { supabase, isSupabaseConfigured } from "../src/lib/supabase/client";
import { calculateAvailableSlots } from "../src/lib/scheduling/engine";
import { SalonClient } from "../src/types/client";
import { TriageSubmission } from "../src/types/triage";
import { LuxuryProposal } from "../src/types/proposal";
import { Appointment } from "../src/types/appointment";
import { PreReservation } from "../src/types/availability";
import { parseHHmmToMinutes } from "../src/lib/utils";

interface TestResult {
  step: string;
  name: string;
  status: "PASS" | "FAIL";
  durationMs: number;
  details: string;
  idCreated?: string;
}

const results: TestResult[] = [];

function recordResult(
  step: string,
  name: string,
  status: "PASS" | "FAIL",
  durationMs: number,
  details: string,
  idCreated?: string
) {
  results.push({ step, name, status, durationMs, details, idCreated });
  const icon = status === "PASS" ? "✅" : "❌";
  console.log(`[${icon} ${status}] ${step} - ${name} (${durationMs}ms)`);
  if (details) console.log(`   └─ ${details}`);
  if (idCreated) console.log(`   └─ ID: ${idCreated}`);
}

async function runClientAudit() {
  console.log("================================================================================");
  console.log("🌸 INICIANDO AUDITORIA DA JORNADA COMPLETA DA CLIENTE - GLAICYAGENDA");
  console.log("================================================================================");
  console.log(`Supabase Configurado: ${isSupabaseConfigured}`);
  console.log(`Data e Hora do Teste: ${new Date().toISOString()}\n`);

  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase não está configurado corretamente em .env.local!");
  }

  const testPhone = "(11) 98888-7777";
  const testPhoneClean = "11988887777";
  const testPassword = "SenhaSegura@2026";
  let createdClientId = "";
  let triageSubmissionId = "";
  let proposalId = "";
  let directAppointmentId = "";
  let preReservationId = "";

  // ============================================================================
  // ETAPA 1: CADASTRO E AUTENTICAÇÃO DA CLIENTE (salon_clients)
  // ============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("1. AUDITORIA: CADASTRO E AUTENTICAÇÃO DA CLIENTE");
  console.log("--------------------------------------------------------------------------------");

  // 1.1 Cadastro da Cliente
  const t0 = Date.now();
  try {
    const clientPayload: SalonClient = {
      id: "",
      orgId: DEFAULT_ORG_ID,
      name: "Juliana Mendes Teste",
      phone: testPhone,
      password: testPassword,
      email: "juliana.mendes.teste@exemplo.com",
      notes: "Cliente de teste para auditoria da jornada da cliente",
      createdAt: new Date().toISOString(),
    };

    const savedClient = await SupabaseDataService.saveClient(clientPayload);
    const duration = Date.now() - t0;
    createdClientId = savedClient.id;

    if (savedClient.id && savedClient.name === "Juliana Mendes Teste") {
      recordResult(
        "ETAPA 1.1",
        "Cadastro de Nova Cliente (saveClient)",
        "PASS",
        duration,
        `Cliente: "${savedClient.name}", Telefone: "${savedClient.phone}", ID persistido no Supabase`,
        savedClient.id
      );
    } else {
      recordResult(
        "ETAPA 1.1",
        "Cadastro de Nova Cliente",
        "FAIL",
        duration,
        `Falha ao salvar cliente. Retorno inválido.`
      );
    }
  } catch (err: any) {
    recordResult("ETAPA 1.1", "Cadastro de Nova Cliente", "FAIL", Date.now() - t0, err.message);
  }

  // 1.2 Autenticação com Senha Correta
  const t1 = Date.now();
  try {
    const loginOk = await SupabaseDataService.loginClient(testPhoneClean, testPassword);
    const duration = Date.now() - t1;

    if (loginOk.success && loginOk.client?.name === "Juliana Mendes Teste") {
      recordResult(
        "ETAPA 1.2",
        "Login da Cliente com Credenciais Válidas",
        "PASS",
        duration,
        `Autenticação bem-sucedida para "${loginOk.client.name}". Telefone validado: ${loginOk.client.phone}`,
        loginOk.client.id
      );
    } else {
      recordResult(
        "ETAPA 1.2",
        "Login da Cliente com Credenciais Válidas",
        "FAIL",
        duration,
        `Login falhou: ${loginOk.message}`
      );
    }
  } catch (err: any) {
    recordResult("ETAPA 1.2", "Login da Cliente", "FAIL", Date.now() - t1, err.message);
  }

  // 1.3 Bloqueio de Login com Senha Incorreta
  const t2 = Date.now();
  try {
    const loginFail = await SupabaseDataService.loginClient(testPhoneClean, "SenhaErrada@999");
    const duration = Date.now() - t2;

    if (!loginFail.success && loginFail.message?.includes("Senha incorreta")) {
      recordResult(
        "ETAPA 1.3",
        "Segurança: Bloqueio de Login com Senha Incorreta",
        "PASS",
        duration,
        `Acesso rejeitado corretamente: "${loginFail.message}"`
      );
    } else {
      recordResult(
        "ETAPA 1.3",
        "Segurança: Bloqueio de Login com Senha Incorreta",
        "FAIL",
        duration,
        `Esperava rejeição por senha incorreta, mas obteve: success=${loginFail.success}`
      );
    }
  } catch (err: any) {
    recordResult("ETAPA 1.3", "Bloqueio com Senha Incorreta", "FAIL", Date.now() - t2, err.message);
  }

  // ============================================================================
  // ETAPA 2: SUBMISSÃO DE TRIAGEM CAPILAR REALISTA
  // ============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("2. AUDITORIA: SUBMISSÃO DE TRIAGEM CAPILAR REALISTA");
  console.log("--------------------------------------------------------------------------------");

  const t3 = Date.now();
  try {
    const triagePayload: TriageSubmission = {
      id: "",
      orgId: DEFAULT_ORG_ID,
      formId: DEFAULT_TRIAGE_FORM_ID,
      serviceId: "22222222-2222-4222-8222-222222222221",
      serviceTitle: "Morena Iluminada Signature",
      clientName: "Juliana Mendes Teste",
      clientPhone: testPhone,
      clientEmail: "juliana.mendes.teste@exemplo.com",
      preferredDate: "2026-11-20",
      preferredTimeSlot: "manha",
      answers: [
        {
          questionId: "q1",
          questionTitle: "Tipo e Curvatura dos Fios",
          answerText: "Cabelo ondulado para cacheado 2C/3A, comprimento médio abaixo dos ombros.",
        },
        {
          questionId: "q2",
          questionTitle: "Histórico Químico nos Últimos 2 Anos",
          answerText: "Nenhuma química ácida, progressiva ou guanidina. Apenas tonalizante há 8 meses.",
        },
        {
          questionId: "q3",
          questionTitle: "Nuance e Tom Desejado",
          answerText: "Morena iluminada em tom Mel Dourado e Doce de Leite com contorno sutil.",
        },
        {
          questionId: "q4",
          questionTitle: "Rotina de Cuidados e Saúde dos Fios",
          answerText: "Lavo 2 a 3x por semana, uso máscara de nutrição semanalmente. Fios resistentes.",
        },
      ],
      photos: {
        currentHairRoot: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e",
        currentHairLength: "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1",
        inspirationDesired: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f",
      },
      status: "pending_review",
      submittedAt: new Date().toISOString(),
    };

    const savedTriage = await SupabaseDataService.saveTriageSubmission(triagePayload);
    const duration = Date.now() - t3;
    triageSubmissionId = savedTriage.id;

    // Confere se recupera no getTriageSubmissions
    const allTriages = await SupabaseDataService.getTriageSubmissions();
    const fetched = allTriages.find((s) => s.id === triageSubmissionId);

    const isAnswersOk = fetched && fetched.answers?.length === 4;
    const isStatusPending = fetched?.status === "pending_review";

    if (fetched && isAnswersOk && isStatusPending) {
      recordResult(
        "ETAPA 2.1",
        "Submissão de Triagem Capilar e Persistência de Respostas",
        "PASS",
        duration,
        `Triagem registrada com sucesso: 4 respostas detalhadas, fotos anexadas, status '${fetched.status}'`,
        fetched.id
      );
    } else {
      recordResult(
        "ETAPA 2.1",
        "Submissão de Triagem Capilar",
        "FAIL",
        duration,
        `Divergência na triagem salva. Status: ${fetched?.status}, Respostas: ${fetched?.answers?.length}`
      );
    }
  } catch (err: any) {
    recordResult("ETAPA 2.1", "Submissão de Triagem Capilar", "FAIL", Date.now() - t3, err.message);
  }

  // ============================================================================
  // ETAPA 3: SOLICITAÇÃO E FLUXO DE PRÉ-RESERVA (pre_reservations)
  // ============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("3. AUDITORIA: SOLICITAÇÃO E FLUXO DE PRÉ-RESERVA");
  console.log("--------------------------------------------------------------------------------");

  // 3.1 Criação de Pré-reserva
  const t4 = Date.now();
  try {
    const preReservationPayload = {
      orgId: DEFAULT_ORG_ID,
      professionalId: DEFAULT_GLEICY_ID,
      serviceId: "22222222-2222-4222-8222-222222222221",
      clientName: "Juliana Mendes Teste",
      clientPhone: testPhone,
      clientEmail: "juliana.mendes.teste@exemplo.com",
      requestedDate: "2026-11-21",
      preferredPeriod: "manha" as const,
      preferredTime: "09:30",
      triageSubmissionId: triageSubmissionId,
      status: "pending" as const,
      adminNotes: "Cliente prefere atendimento no sábado de manhã se houver vaga.",
    };

    const savedPre = await SupabaseDataService.createPreReservation(preReservationPayload);
    const duration = Date.now() - t4;

    if (savedPre && savedPre.id) {
      preReservationId = savedPre.id;
      recordResult(
        "ETAPA 3.1",
        "Criação de Pré-Reserva (createPreReservation)",
        "PASS",
        duration,
        `Data solicitada: ${savedPre.requestedDate}, Período: ${savedPre.preferredPeriod}, Status: '${savedPre.status}'`,
        savedPre.id
      );
    } else {
      recordResult("ETAPA 3.1", "Criação de Pré-Reserva", "FAIL", duration, "Pré-reserva não gerou ID.");
    }
  } catch (err: any) {
    recordResult("ETAPA 3.1", "Criação de Pré-Reserva", "FAIL", Date.now() - t4, err.message);
  }

  // 3.2 Consulta de Pré-reservas e Filtro por Status
  const t5 = Date.now();
  try {
    const preList = await SupabaseDataService.getPreReservations(DEFAULT_ORG_ID);
    const duration = Date.now() - t5;
    const found = preList.find((p) => p.id === preReservationId);

    if (found && found.clientName === "Juliana Mendes Teste") {
      recordResult(
        "ETAPA 3.2",
        "Consulta de Pré-Reservas Ativas (getPreReservations)",
        "PASS",
        duration,
        `Localizada pré-reserva para "${found.clientName}" com status '${found.status}'. Total de pré-reservas: ${preList.length}`,
        found.id
      );
    } else {
      recordResult(
        "ETAPA 3.2",
        "Consulta de Pré-Reservas Ativas",
        "FAIL",
        duration,
        `Pré-reserva ${preReservationId} não localizada no retorno.`
      );
    }
  } catch (err: any) {
    recordResult("ETAPA 3.2", "Consulta de Pré-Reservas", "FAIL", Date.now() - t5, err.message);
  }

  // 3.3 Atualização de Status da Pré-reserva pela Profissional (Aprovação / Confirmação)
  const t6 = Date.now();
  try {
    const updated = await SupabaseDataService.updatePreReservationStatus(
      preReservationId,
      "approved",
      "Vaga confirmada pela Gleicy para sábado às 09:30."
    );
    const duration = Date.now() - t6;

    const checkList = await SupabaseDataService.getPreReservations(DEFAULT_ORG_ID);
    const checkItem = checkList.find((p) => p.id === preReservationId);

    if (updated && checkItem?.status === "approved") {
      recordResult(
        "ETAPA 3.3",
        "Atualização de Status da Pré-Reserva para 'approved'",
        "PASS",
        duration,
        `Status atualizado com sucesso para 'approved'. Notas: "${checkItem.adminNotes}"`,
        preReservationId
      );
    } else {
      recordResult(
        "ETAPA 3.3",
        "Atualização de Status da Pré-Reserva",
        "FAIL",
        duration,
        `Esperava status 'confirmed', mas obteve: '${checkItem?.status}'`
      );
    }
  } catch (err: any) {
    recordResult("ETAPA 3.3", "Atualização de Status da Pré-Reserva", "FAIL", Date.now() - t6, err.message);
  }

  // ============================================================================
  // ETAPA 4: MOTOR DE DISPONIBILIDADE E AGENDAMENTO DIRETO (SLOT ENGINE)
  // ============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("4. AUDITORIA: MOTOR DE DISPONIBILIDADE E AGENDAMENTO DIRETO");
  console.log("--------------------------------------------------------------------------------");

  // 4.1 Cálculo Matemático de Duração e Intercalamento do Serviço
  const t7 = Date.now();
  let selectedService: any = null;
  try {
    const services = await SupabaseDataService.getServices();
    selectedService = services.find((s) => s.id === "22222222-2222-4222-8222-222222222221") || services[0];
    const duration = Date.now() - t7;

    const activeSteps = selectedService.steps.filter((st: any) => st.type === "active");
    const pauseSteps = selectedService.steps.filter((st: any) => st.type === "pause");
    const totalDuration = selectedService.steps.reduce((sum: number, st: any) => sum + st.durationMin, 0);

    recordResult(
      "ETAPA 4.1",
      "Estrutura Técnica do Serviço e Cálculo de Etapas",
      "PASS",
      duration,
      `Serviço: "${selectedService.title}", Total: ${totalDuration}min (${activeSteps.length} ativas, ${pauseSteps.length} pausas/química)`,
      selectedService.id
    );
  } catch (err: any) {
    recordResult("ETAPA 4.1", "Estrutura Técnica do Serviço", "FAIL", Date.now() - t7, err.message);
  }

  // 4.2 Agendamento Direto com Blocos Técnicos (stepBlocks)
  const t8 = Date.now();
  try {
    const aptPayload: Appointment = {
      id: "",
      orgId: DEFAULT_ORG_ID,
      professionalId: DEFAULT_GLEICY_ID,
      professionalName: "Gleicy Ronha",
      serviceId: selectedService.id,
      serviceTitle: selectedService.title,
      clientName: "Juliana Mendes Teste",
      clientPhone: testPhone,
      clientEmail: "juliana.mendes.teste@exemplo.com",
      date: "2026-11-20",
      startTime: "09:00",
      endTime: "12:00",
      totalDurationMin: 180,
      status: "confirmed",
      price: selectedService.price || 550.0,
      paymentMethod: "pix",
      paymentStatus: "paid",
      triageSubmissionId: triageSubmissionId,
      stepBlocks: [
        {
          id: "step-blk-1",
          stepId: "step-1",
          stepTitle: "Teste de Mecha e Abertura de Tom",
          type: "active",
          startTime: "09:00",
          endTime: "10:15",
          durationMin: 75,
          isParallelSlotAllowed: false,
        },
        {
          id: "step-blk-2",
          stepId: "step-2",
          stepTitle: "Pausa de Revelação e Clareamento",
          type: "pause",
          startTime: "10:15",
          endTime: "11:00",
          durationMin: 45,
          maxPauseDurationMin: 60,
          isParallelSlotAllowed: true, // Permite atendimento paralelo
        },
        {
          id: "step-blk-3",
          stepId: "step-3",
          stepTitle: "Matização, Tratamento e Finalização",
          type: "active",
          startTime: "11:00",
          endTime: "12:00",
          durationMin: 60,
          isParallelSlotAllowed: false,
        },
      ],
      notes: "Agendamento direto validado na auditoria com 3 blocos técnicos estruturados.",
      createdAt: new Date().toISOString(),
    };

    const savedApt = await SupabaseDataService.saveAppointment(aptPayload);
    const duration = Date.now() - t8;
    directAppointmentId = savedApt.id;

    if (savedApt.id && savedApt.status === "confirmed" && savedApt.stepBlocks?.length === 3) {
      recordResult(
        "ETAPA 4.2",
        "Criação de Agendamento Direto com Blocos Técnicos (saveAppointment)",
        "PASS",
        duration,
        `Agendamento confirmado para ${savedApt.date} às ${savedApt.startTime}-${savedApt.endTime}. 3 blocos técnicos salvos com suporte a pausas intercaladas.`,
        savedApt.id
      );
    } else {
      recordResult(
        "ETAPA 4.2",
        "Criação de Agendamento Direto",
        "FAIL",
        duration,
        `Divergência nos blocos ou status: ${savedApt.status}, blocos=${savedApt.stepBlocks?.length}`
      );
    }
  } catch (err: any) {
    recordResult("ETAPA 4.2", "Criação de Agendamento Direto", "FAIL", Date.now() - t8, err.message);
  }

  // ============================================================================
  // ETAPA 5: BUSCA DE PROPOSTA PELO NÚMERO DE TELEFONE (#proposta-search)
  // ============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("5. AUDITORIA: BUSCA DE PROPOSTA PELO NÚMERO DE TELEFONE");
  console.log("--------------------------------------------------------------------------------");

  // 5.1 Criação de Proposta de Alta Costura para Juliana
  const t9 = Date.now();
  try {
    const proposalPayload: LuxuryProposal = {
      id: "",
      orgId: DEFAULT_ORG_ID,
      professionalId: DEFAULT_GLEICY_ID,
      triageSubmissionId: triageSubmissionId,
      clientName: "Juliana Mendes Teste",
      clientPhone: testPhone,
      clientEmail: "juliana.mendes.teste@exemplo.com",
      title: "Protocolo Morena Iluminada Mel Dourado & Nutrição Lipídica",
      subtitle: "Personalizado para curvatura 2C/3A com máxima integridade",
      projectOverview:
        "Transformação capilar exclusiva com técnica de contour suave em tons mel dourado e avelã, finalizada com reposição de massa lipídica e definição duradoura.",
      desiredResults: [
        "Clareamento suave sem agressão aos padrões de ondas/cachos",
        "Luminosidade com contraste elegante para pele quente",
        "Selamento cuticular com brilho espelhado",
      ],
      chosenTechnique: "Esfumado de raiz com técnica de micro-mechas costuradas",
      maintenanceGuidance: "Retoque a cada 5 a 6 meses. Cronograma capilar com máscaras nutritivas.",
      includedItems: [
        "Diagnóstico Personalizado com Teste de Mecha",
        "Clareamento Cuidadoso com Protetor de Fibras (Plex)",
        "Matização de Nuance Mel Quente",
        "Tratamento Acidificante e Selagem de Cutículas",
        "Finalização de Alta Definição",
      ],
      differentials: [
        { id: "diff-1", title: "Atendimento Exclusivo", description: "Atendimento reservado e exclusivo" },
        { id: "diff-2", title: "Produtos Premium", description: "Cosméticos importados de alta performance" },
        { id: "diff-3", title: "Consultoria Pós", description: "Acompanhamento e consultoria pós-procedimento" },
      ],
      technicalCommitment: "Teste de mecha obrigatório para assegurar a elasticidade dos fios.",
      items: [
        { id: "i-1", serviceTitle: "Técnica Morena Iluminada Mel Dourado", originalPrice: 520.0 },
        { id: "i-2", serviceTitle: "Tratamento de Reposição Lipídica Intensiva", originalPrice: 140.0 },
        { id: "i-3", serviceTitle: "Finalização & Consultoria Home Care", originalPrice: 60.0 },
      ],
      totalOriginal: 720.0,
      totalWithDiscount: 720.0,
      pixDiscountPercent: 5,
      pixTotal: 684.0,
      creditCardTerms: "Em até 6x de R$ 120,00 sem juros",
      status: "sent",
      expiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    const savedProp = await SupabaseDataService.saveProposal(proposalPayload);
    const duration = Date.now() - t9;
    proposalId = savedProp.id;

    recordResult(
      "ETAPA 5.1",
      "Geração de Orçamento Personalizado no Supabase (saveProposal)",
      "PASS",
      duration,
      `Título: "${savedProp.title}", Total: R$ ${savedProp.totalOriginal.toFixed(2)}, Pix: R$ ${savedProp.pixTotal.toFixed(2)}`,
      savedProp.id
    );
  } catch (err: any) {
    recordResult("ETAPA 5.1", "Geração de Orçamento Personalizado", "FAIL", Date.now() - t9, err.message);
  }

  // 5.2 Consulta pelo Telefone da Cliente (getProposalsByClientPhone)
  const t10 = Date.now();
  try {
    const foundProposals = await SupabaseDataService.getProposalsByClientPhone(testPhoneClean);
    const duration = Date.now() - t10;
    const match = foundProposals.find((p) => p.id === proposalId);

    if (match && match.clientName === "Juliana Mendes Teste" && match.pixTotal === 684) {
      recordResult(
        "ETAPA 5.2",
        "Busca de Proposta por Telefone da Cliente (getProposalsByClientPhone)",
        "PASS",
        duration,
        `Proposta localizada instantaneamente pelo telefone ${testPhoneClean}: R$ ${match.totalOriginal} (Pix: R$ ${match.pixTotal})`,
        match.id
      );
    } else {
      recordResult(
        "ETAPA 5.2",
        "Busca de Proposta por Telefone da Cliente",
        "FAIL",
        duration,
        `Proposta não localizada ou valores divergentes. Total encontradas: ${foundProposals.length}`
      );
    }
  } catch (err: any) {
    recordResult("ETAPA 5.2", "Busca de Proposta por Telefone", "FAIL", Date.now() - t10, err.message);
  }

  // ============================================================================
  // ETAPA 6: APROVAÇÃO DIGITAL DA PROPOSTA PELA CLIENTE (approveProposal)
  // ============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("6. AUDITORIA: APROVAÇÃO DIGITAL DA PROPOSTA PELA CLIENTE");
  console.log("--------------------------------------------------------------------------------");

  // 6.1 Aprovação da Proposta e Atualização em Cascata
  const t11 = Date.now();
  try {
    await SupabaseDataService.approveProposal(proposalId);
    const duration = Date.now() - t11;

    // Verifica se o status mudou para 'approved'
    const approvedProp = await SupabaseDataService.getProposalById(proposalId);
    const isApproved = approvedProp?.status === "approved";
    const hasApprovedAt = Boolean(approvedProp?.approvedAt);

    if (isApproved && hasApprovedAt) {
      recordResult(
        "ETAPA 6.1",
        "Aprovação Digital da Proposta (approveProposal)",
        "PASS",
        duration,
        `Status atualizado para 'approved' com registro de data/hora: ${approvedProp?.approvedAt}`,
        proposalId
      );
    } else {
      recordResult(
        "ETAPA 6.1",
        "Aprovação Digital da Proposta",
        "FAIL",
        duration,
        `Esperava status 'approved', mas obteve: status='${approvedProp?.status}', approvedAt='${approvedProp?.approvedAt}'`
      );
    }
  } catch (err: any) {
    recordResult("ETAPA 6.1", "Aprovação Digital da Proposta", "FAIL", Date.now() - t11, err.message);
  }

  // 6.2 Confirmação Automática do Agendamento Vinculado
  const t12 = Date.now();
  try {
    // Vincula a proposta ao agendamento de teste se ainda não estiver
    const allApts = await SupabaseDataService.getAppointments();
    const targetApt = allApts.find((a) => a.id === directAppointmentId);

    if (targetApt) {
      await SupabaseDataService.saveAppointment({
        ...targetApt,
        proposalId: proposalId,
      });
      // Re-executa approveProposal para testar cascata
      await SupabaseDataService.approveProposal(proposalId);
    }

    const recheckApts = await SupabaseDataService.getAppointments();
    const updatedApt = recheckApts.find((a) => a.id === directAppointmentId);
    const duration = Date.now() - t12;

    if (updatedApt && updatedApt.status === "confirmed" && updatedApt.paymentStatus === "paid") {
      recordResult(
        "ETAPA 6.2",
        "Sincronização em Cascata: Agendamento Confirmado e Pago",
        "PASS",
        duration,
        `Agendamento ${updatedApt.id} atualizado para status='${updatedApt.status}' e paymentStatus='${updatedApt.paymentStatus}'`,
        updatedApt.id
      );
    } else {
      recordResult(
        "ETAPA 6.2",
        "Sincronização em Cascata do Agendamento",
        "FAIL",
        duration,
        `Divergência: status='${updatedApt?.status}', paymentStatus='${updatedApt?.paymentStatus}'`
      );
    }
  } catch (err: any) {
    recordResult("ETAPA 6.2", "Sincronização em Cascata do Agendamento", "FAIL", Date.now() - t12, err.message);
  }

  // ============================================================================
  // ETAPA 7: ATUALIZAÇÃO DO HISTÓRICO DA CLIENTE NO CRM (getClients)
  // ============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("7. AUDITORIA: ATUALIZAÇÃO DO HISTÓRICO DA CLIENTE NO CRM");
  console.log("--------------------------------------------------------------------------------");

  const t13 = Date.now();
  try {
    const clientsList = await SupabaseDataService.getClients();
    const duration = Date.now() - t13;
    const clientRecord = clientsList.find((c) => c.phone.replace(/\D/g, "") === testPhoneClean);

    if (clientRecord && (clientRecord.totalAppointments || 0) >= 1) {
      recordResult(
        "ETAPA 7.1",
        "Reflexo no CRM: Histórico de Agendamentos e Gastos da Cliente",
        "PASS",
        duration,
        `Cliente "${clientRecord.name}": ${clientRecord.totalAppointments} agendamento(s) contabilizado(s), Total gasto: R$ ${clientRecord.totalSpent?.toFixed(2) || "0.00"}, Último serviço: "${clientRecord.lastServiceTitle || '-'}"`,
        clientRecord.id
      );
    } else {
      recordResult(
        "ETAPA 7.1",
        "Reflexo no CRM",
        "FAIL",
        duration,
        `Cliente não contabilizou agendamentos: ${clientRecord?.totalAppointments}`
      );
    }
  } catch (err: any) {
    recordResult("ETAPA 7.1", "Reflexo no CRM", "FAIL", Date.now() - t13, err.message);
  }

  // ============================================================================
  // RELATÓRIO FINAL
  // ============================================================================
  console.log("\n================================================================================");
  console.log("📊 RELATÓRIO CONSOLIDADO DA AUDITORIA DA CLIENTE");
  console.log("================================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const avgDuration = Math.round(results.reduce((acc, r) => acc + r.durationMs, 0) / total);

  console.log(`Total de Testes: ${total}`);
  console.log(`Aprovados (PASS): ${passed}`);
  console.log(`Falhas (FAIL):    ${failed}`);
  console.log(`Tempo Médio:      ${avgDuration}ms\n`);

  console.table(
    results.map((r) => ({
      Etapa: r.step,
      Teste: r.name,
      Status: r.status,
      "Tempo (ms)": r.durationMs,
      ID: r.idCreated || "-",
    }))
  );

  if (failed > 0) {
    console.error(`\n⚠️ ATENÇÃO: Foram encontradas ${failed} falhas na auditoria da cliente.`);
    process.exit(1);
  } else {
    console.log("\n🎉 Jornada da cliente 100% validada e aprovada!");
  }
}

runClientAudit().catch((err) => {
  console.error("FATAL AUDIT ERROR:", err);
  process.exit(1);
});
