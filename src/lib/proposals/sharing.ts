import { LuxuryProposal } from "@/types/proposal";
import { formatBRL } from "@/lib/utils";

/**
 * Gera link direto de visualização/acesso da proposta comercial da cliente.
 */
export function generateProposalAccessLink(
  proposalId: string,
  baseUrl: string = "http://localhost:3000"
): string {
  const cleanBase = (baseUrl || "http://localhost:3000").replace(/\/+$/, "");
  return `${cleanBase}/proposta/${proposalId}`;
}

/**
 * Gera mensagem rica e personalizada para compartilhamento da proposta via WhatsApp,
 * incluindo valores (total e Pix), link direto da proposta e instruções do portal da cliente.
 */
export function generateProposalWhatsAppMessage(
  prop: LuxuryProposal,
  origin: string = "http://localhost:3000"
): string {
  const cleanOrigin = (origin || "http://localhost:3000").replace(/\/+$/, "");
  const proposalUrl = `${cleanOrigin}/proposta/${prop.id}`;
  const portalUrl = `${cleanOrigin}/meus-agendamentos`;
  const formattedTotal = formatBRL(prop.totalWithDiscount);
  const formattedPix = formatBRL(prop.pixTotal);
  const pixDiscount = prop.pixDiscountPercent ?? 5;

  return (
    `Olá, ${prop.clientName}! ✨\n\n` +
    `Sua proposta comercial personalizada *"${prop.title}"* do Espaço da Beleza Gleicy Ronha já está pronta com todo carinho!\n\n` +
    `💎 *Valor Especial:* ${formattedTotal}\n` +
    `⚡ *À vista no Pix:* ${formattedPix} (${pixDiscount}% de desconto)\n\n` +
    `Você pode conferir todos os detalhes, cronograma e confirmar seu horário no link:\n` +
    `🔗 ${proposalUrl}\n\n` +
    `📲 Você também pode acompanhar todas as suas propostas e agendamentos pelo seu portal com seu número de WhatsApp:\n` +
    `👉 ${portalUrl}\n\n` +
    `Qualquer dúvida estou à disposição!`
  );
}
