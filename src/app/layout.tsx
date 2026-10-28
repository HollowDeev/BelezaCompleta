import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/supabase/authContext";

export const metadata: Metadata = {
  title: "Espaço da Beleza Gleicy Ronha | Dashboard de Gestão & Agendamento",
  description:
    "Sistema inteligente de agendamento com pausas químicas, triagem gamificada e propostas comerciais personalizadas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[#FAF7F2] text-[#22201E] font-sans antialiased selection:bg-[#E5C158]/30 selection:text-[#2D1914]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
