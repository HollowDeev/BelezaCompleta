import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/supabase/authContext";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://espacogleicyronha.vercel.app";

export const viewport: Viewport = {
  themeColor: "#1D3D3C",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Espaço da Beleza Gleicy Ronha | Especialista em Mechas, Loiros e Cachos em Salto - SP",
    template: "%s | Espaço da Beleza Gleicy Ronha",
  },
  description:
    "Salão de beleza de alto padrão em Salto - SP. Especialista em Mechas, Loiros Saudáveis, Cachos e Tratamentos Capilares Personalizados. Nota 5.0 no Google com teste de mecha prévio obrigatório.",
  keywords: [
    "Salão de beleza Salto SP",
    "Gleicy Ronha",
    "Mechas Salto SP",
    "Loiro saudável Salto",
    "Morena Iluminada Salto",
    "Cachos Salto SP",
    "Tratamento capilar Salto",
    "Espaço da Beleza Gleicy Ronha",
    "Salão especialista em mechas Salto",
    "Teste de mecha Salto SP",
  ],
  authors: [{ name: "Gleicy Ronha", url: siteUrl }],
  creator: "Gleicy Ronha",
  publisher: "Espaço da Beleza Gleicy Ronha",
  formatDetection: {
    email: false,
    address: true,
    telephone: true,
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/icon.svg",
    apple: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/apple-touch-icon.svg", type: "image/svg+xml" },
    ],
  },
  openGraph: {
    title: "Espaço da Beleza Gleicy Ronha | Mechas, Loiros e Cachos em Salto - SP",
    description:
      "A beleza que você deseja com a saúde capilar que você merece. 12+ anos de experiência, nota 5.0 no Google, teste de mecha prévio e atendimento exclusivo.",
    url: siteUrl,
    siteName: "Espaço da Beleza Gleicy Ronha",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: `${siteUrl}/og-image.jpg?v=2`,
        secureUrl: `${siteUrl}/og-image.jpg?v=2`,
        width: 1200,
        height: 630,
        type: "image/jpeg",
        alt: "Espaço da Beleza Gleicy Ronha - Mechas, Loiros e Saúde Capilar",
      },
      {
        url: `${siteUrl}/og-image-square.jpg?v=2`,
        secureUrl: `${siteUrl}/og-image-square.jpg?v=2`,
        width: 400,
        height: 400,
        type: "image/jpeg",
        alt: "Espaço da Beleza Gleicy Ronha",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Espaço da Beleza Gleicy Ronha | Especialista em Mechas e Cachos em Salto - SP",
    description:
      "Salão de beleza de alto padrão em Salto - SP. Mechas seguras, saúde da fibra 100% preservada e atendimento individualizado.",
    images: [`${siteUrl}/og-image.jpg?v=2`],
  },
  alternates: {
    canonical: siteUrl,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLdData = {
  "@context": "https://schema.org",
  "@type": "BeautySalon",
  name: "Espaço da Beleza Gleicy Ronha",
  image: `${siteUrl}/brand/logo/logo-horizontal-verde.svg`,
  logo: `${siteUrl}/icon.svg`,
  url: siteUrl,
  telephone: "+5511995975725",
  priceRange: "$$",
  description:
    "Salão de beleza de alto padrão em Salto - SP, especialista em mechas, loiros saudáveis, cachos e tratamentos capilares personalizados com teste de mecha prévio.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Av. Brasília, 996",
    addressLocality: "Salto",
    addressRegion: "SP",
    postalCode: "13327-100",
    addressCountry: "BR",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: -23.201,
    longitude: -47.288,
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "09:00",
      closes: "19:00",
    },
  ],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "5.0",
    reviewCount: "50",
    bestRating: "5",
    worstRating: "1",
  },
  sameAs: ["https://www.instagram.com/gleicyronha"],
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
        {/* Meta tags dedicadas para rastreadores de WhatsApp, Telegram e Facebook */}
        <meta property="og:image" content={`${siteUrl}/og-image.jpg?v=2`} />
        <meta property="og:image:secure_url" content={`${siteUrl}/og-image.jpg?v=2`} />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Espaço da Beleza Gleicy Ronha - Mechas, Loiros e Cachos em Salto - SP" />
        <meta name="twitter:image" content={`${siteUrl}/og-image.jpg?v=2`} />

        {/* Schema.org Dados Estruturados para Ranqueamento Google Local */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
        />
      </head>
      <body className="min-h-screen bg-[#FCF5EB] text-[#1D3D3C] font-sans antialiased selection:bg-[#C7A03A]/25 selection:text-[#1D3D3C]">
        <AuthProvider>{children}</AuthProvider>
        {/* Métricas Gratuitas em Tempo Real da Vercel */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
