import { ImageResponse } from "next/og";

export const alt = "Espaço da Beleza Gleicy Ronha | Especialista em Mechas, Loiros e Cachos em Salto - SP";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 80px",
          backgroundColor: "#122B2A",
          backgroundImage:
            "radial-gradient(circle at 85% 20%, rgba(199, 160, 58, 0.28) 0%, transparent 50%), radial-gradient(circle at 15% 85%, rgba(29, 61, 60, 0.95) 0%, transparent 60%)",
          color: "#FCF5EB",
          fontFamily: "sans-serif",
        }}
      >
        {/* Barra Superior com Logo e Prova Social Google 5.0 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                backgroundColor: "#1D3D3C",
                border: "2px solid rgba(199, 160, 58, 0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#C7A03A">
                <polygon points="12,2 15,9 22,12 15,15 12,22 9,15 2,12 9,9" />
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  letterSpacing: "3px",
                  textTransform: "uppercase",
                  color: "#FCF5EB",
                }}
              >
                GLEICY RONHA
              </span>
              <span
                style={{
                  fontSize: "14px",
                  letterSpacing: "4px",
                  textTransform: "uppercase",
                  color: "#C7A03A",
                  fontWeight: "600",
                }}
              >
                Espaco da Beleza
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              backgroundColor: "rgba(253, 245, 235, 0.1)",
              border: "1px solid rgba(199, 160, 58, 0.5)",
              borderRadius: "50px",
              padding: "10px 22px",
            }}
          >
            <div style={{ display: "flex", gap: "3px" }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="#F59E0B">
                  <polygon points="12,2 15,8.5 22,9.3 17,14 18.5,21 12,17.3 5.5,21 7,14 2,9.3 9,8.5" />
                </svg>
              ))}
            </div>
            <span style={{ fontSize: "16px", fontWeight: "bold", color: "#FCF5EB" }}>5.0 no Google</span>
            <span style={{ fontSize: "14px", color: "rgba(253, 245, 235, 0.7)" }}>- Salto, SP</span>
          </div>
        </div>

        {/* Conteudo Central */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "960px" }}>
          <span style={{ fontSize: "22px", color: "#C7A03A", fontStyle: "italic", letterSpacing: "1px" }}>
            O cuidado que acolhe. A beleza que encanta.
          </span>
          <h1
            style={{
              fontSize: "52px",
              fontWeight: "bold",
              lineHeight: 1.15,
              color: "#FCF5EB",
              margin: 0,
            }}
          >
            A beleza que voce deseja, com a saude capilar que voce merece.
          </h1>
          <p style={{ fontSize: "22px", color: "#D3D0B5", margin: 0, lineHeight: 1.4 }}>
            Especialista em Mechas, Loiros de Alta Integridade, Cachos e Tratamentos Capilares Personalizados.
          </p>
        </div>

        {/* Rodape com Garantias e Acao */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid rgba(199, 160, 58, 0.35)",
            paddingTop: "24px",
          }}
        >
          <div style={{ display: "flex", gap: "28px", fontSize: "16px", color: "#D3D0B5" }}>
            <span>* Saude da Fibra 100% Preservada</span>
            <span>* Teste de Mecha Previo</span>
            <span>* Precos Claros sem Surpresas</span>
          </div>

          <div
            style={{
              backgroundColor: "#C7A03A",
              color: "#122B2A",
              padding: "12px 28px",
              borderRadius: "14px",
              fontSize: "17px",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            Agendar Online
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
