export const DEFAULT_CONFIRMATION_MESSAGE = `Seu horário está confirmado.

Caso precise remarcar ou cancelar, solicitamos que nos avise com, no mínimo, 24 horas de antecedência. Esse prazo é importante para que possamos reorganizar nossa agenda e disponibilizar o horário para outra cliente.

Em caso de cancelamento sem aviso prévio de 24 horas ou cancelamento próximo ao horário agendado, será cobrado o equivalente a 50% do valor do procedimento reservado.

Esse valor não é perdido: ele ficará como crédito e será abatido do próximo atendimento, desde que o novo agendamento seja realizado e utilizado em até 15 dias após o horário originalmente reservado.

Agradecemos pela compreensão e pelo compromisso com o nosso atendimento.`;

/**
 * Interpola tokens {cliente}, {servico}, {data}, {horario}, {valor} em templates de mensagens.
 */
export function interpolateMessageTokens(
  template: string,
  data: Record<string, string>
): string {
  if (!template) return "";
  return template.replace(/\{(\w+)\}/g, (match, key) => data[key] ?? match);
}
