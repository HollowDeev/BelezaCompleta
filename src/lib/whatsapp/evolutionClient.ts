/**
 * Cliente de Integração com a Evolution API v2 (Docker local ou VPS)
 */

const getApiUrl = () => (process.env.EVOLUTION_API_URL || "http://localhost:8080").replace(/\/+$/, "");
const getApiKey = () => process.env.EVOLUTION_API_KEY || "GleicySalonSecureApiKey2026";
const getInstanceName = () => process.env.EVOLUTION_INSTANCE_NAME || "gleicy-salon";

export interface EvolutionInstanceStatus {
  instanceName: string;
  state: "open" | "connecting" | "close" | "refused";
  qrcode?: string; // Base64 do QR Code para exibição no frontend
}

export class EvolutionWhatsAppService {
  /**
   * Cabeçalhos de autenticação padrão para a Evolution API
   */
  private static getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      apikey: getApiKey(),
    };
  }

  /**
   * Garante que o telefone esteja no formato internacional para envio (ex: 5511999998888)
   */
  public static sanitizePhone(phone: string): string {
    let clean = (phone || "").replace(/\D/g, "");
    if (!clean) return "";
    // Se for Brasil e não começar com 55, adiciona
    if (clean.length === 10 || clean.length === 11) {
      clean = "55" + clean;
    }
    return clean;
  }

  /**
   * Obtém o status da conexão da instância
   */
  public static async getConnectionState(): Promise<EvolutionInstanceStatus> {
    const url = `${getApiUrl()}/instance/connectionState/${getInstanceName()}`;
    try {
      const res = await fetch(url, { headers: this.getHeaders() });
      if (!res.ok) {
        return { instanceName: getInstanceName(), state: "close" };
      }
      const data = await res.json();
      return {
        instanceName: getInstanceName(),
        state: data?.instance?.state || "close",
      };
    } catch (err) {
      console.warn("Evolution API connectionState error:", err);
      return { instanceName: getInstanceName(), state: "close" };
    }
  }

  /**
   * Cria ou conecta à instância do salão e retorna o QR Code se desconectado
   */
  public static async getOrConnectInstance(): Promise<{ success: boolean; state: string; qrcode?: string }> {
    const instanceName = getInstanceName();

    try {
      // 1. Tenta buscar o QR code direto da instância existente
      const connectUrl = `${getApiUrl()}/instance/connect/${instanceName}`;
      const connectRes = await fetch(connectUrl, { headers: this.getHeaders() });

      if (connectRes.ok) {
        const connectData = await connectRes.json();
        const base64 = connectData?.base64 || connectData?.qrcode?.base64;
        if (base64) {
          return {
            success: true,
            state: "connecting",
            qrcode: base64,
          };
        }
      }

      // 2. Se a instância não existe ainda, cria a instância com as configs do salão
      const createUrl = `${getApiUrl()}/instance/create`;
      const createRes = await fetch(createUrl, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          instanceName,
          token: getApiKey(),
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
          webhook: {
            url: "http://host.docker.internal:3000/api/whatsapp/webhook",
            byEvents: false,
            base64: false,
            events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
          },
        }),
      });

      if (createRes.ok) {
        const createData = await createRes.json();
        const qrcode = createData?.base64 || createData?.qrcode?.base64 || createData?.hash?.base64;
        if (qrcode) {
          return {
            success: true,
            state: "connecting",
            qrcode,
          };
        }
      }

      // 3. Tenta uma nova chamada de connect caso a criação tenha inicializado a sessão
      const retryRes = await fetch(connectUrl, { headers: this.getHeaders() });
      if (retryRes.ok) {
        const retryData = await retryRes.json();
        return {
          success: true,
          state: retryData?.state || "connecting",
          qrcode: retryData?.base64 || retryData?.qrcode?.base64,
        };
      }

      return { success: false, state: "close" };
    } catch (err: any) {
      console.error("Evolution API getOrConnectInstance error:", err);
      return { success: false, state: "close" };
    }
  }

  /**
   * Desconecta e faz logout da instância para permitir reconexão limpa
   */
  public static async disconnectInstance(): Promise<{ success: boolean; message?: string }> {
    const instanceName = getInstanceName();
    try {
      const url = `${getApiUrl()}/instance/logout/${instanceName}`;
      const res = await fetch(url, {
        method: "DELETE",
        headers: this.getHeaders(),
      });

      if (res.ok) {
        return { success: true, message: "WhatsApp desconectado com sucesso." };
      }

      // Se logout falhar por sessão já fechada, força deleção da instância
      const deleteUrl = `${getApiUrl()}/instance/delete/${instanceName}`;
      await fetch(deleteUrl, { method: "DELETE", headers: this.getHeaders() });
      return { success: true, message: "Instância resetada com sucesso." };
    } catch (err: any) {
      console.error("Evolution API disconnectInstance error:", err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Envia uma mensagem de texto simples para um número
   */
  public static async sendTextMessage(phone: string, text: string): Promise<{ success: boolean; messageId?: string }> {
    const target = this.sanitizePhone(phone);
    if (!target || !text.trim()) {
      return { success: false };
    }

    const url = `${getApiUrl()}/message/sendText/${getInstanceName()}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          number: target,
          text: text.trim(),
          delay: 1200, // Simula digitação humana natural
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        console.warn("Falha ao enviar mensagem via Evolution API:", res.status, errJson);
        return { success: false };
      }

      const data = await res.json();
      return { success: true, messageId: data?.key?.id };
    } catch (err) {
      console.error("Erro em sendTextMessage Evolution API:", err);
      return { success: false };
    }
  }
}
