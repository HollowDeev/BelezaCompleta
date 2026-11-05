import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/supabase/authContext";

export const metadata: Metadata = {
  title: "Espaço da Beleza Gleicy Ronha | Cuidado que acolhe, beleza que encanta",
  description:
    "Cuidado capilar especializado em mechas, tratamentos e saúde dos fios. Sofisticação acolhedora e agendamento transparente.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Gwendolyn:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#FCF5EB] text-[#1D3D3C] font-sans antialiased selection:bg-[#C7A03A]/25 selection:text-[#1D3D3C]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
