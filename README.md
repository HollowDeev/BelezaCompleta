<div align="center">

  <img src="https://raw.githubusercontent.com/HollowDeev/BelezaCompleta/master/public/og-image.jpg" alt="Beleza Completa — SaaS para Salões de Beleza" width="100%" style="border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.4);" />

  <br /><br />

  <h1>✦ Beleza Completa</h1>
  <p><strong>Ecosistema SaaS de Gestão de Alto Padrão para Salões de Beleza e Clínicas Estéticas</strong></p>

  <p>
    <a href="https://espacogleicyronha.vercel.app/" target="_blank">
      <img src="https://img.shields.io/badge/Demonstração_Online-espacogleicyronha.vercel.app-1D3D3C?style=for-the-badge&logo=vercel&logoColor=C7A03A" alt="Deploy Vercel" />
    </a>
    <img src="https://img.shields.io/badge/Next.js_16-Turbopack-black?style=for-the-badge&logo=next.js" alt="Next.js 16" />
    <img src="https://img.shields.io/badge/React_19-Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=react" alt="React 19" />
    <img src="https://img.shields.io/badge/Supabase-PostgreSQL_%26_Realtime-3ECF8E?style=for-the-badge&logo=supabase" alt="Supabase" />
  </p>

  <p>
    <i>Desenvolvido sob medida inicialmente para o prestigiado <strong>Espaço da Beleza Gleicy Ronha</strong> (Salto - SP) e expandido para uma solução completa de gestão operacional, inteligência de agenda e vendas para profissionais da beleza.</i>
  </p>

</div>

---

## 📖 Visão Geral

O **Beleza Completa** nasceu para solucionar um problema crítico vivido por salões de alto padrão: a incompatibilidade entre o agendamento impulsivo e a complexidade técnica dos serviços capilares (como mechas, morena iluminada, descolorações e terapias capilares que demandam teste de mecha prévio e diagnóstico personalizado).

A plataforma une uma **Vitrine Pública Editorial de Alta Conversão** (com estética *quiet luxury*, prova social verificada no Google e catálogo transparente) a um **Painel de Controle Operacional em Tempo Real**, com triagem técnica com envio de fotos, gerador dinâmico de propostas de luxo com PDF, gestão financeira e controle inteligente de intervalos químicos.

---

## ✨ Principais Diferenciais & Funcionalidades

### 🌸 1. Vitrine Pública de Conversão (Front-End Cliente)
- **Identidade Visual Nobre**: Paleta sofisticada (*Verde Profundo `#1D3D3C`*, *Dourado Nobre `#C7A03A`*, *Creme Acolhedor `#FCF5EB`*) e tipografia editorial (`DM Sans` e `Gwendolyn`).
- **Prova Social Google 5.0**: Integração em destaque com a avaliação máxima verificada do Google Meu Negócio.
- **Carrossel 3D de Transformações Reais**: Demonstração interativa de resultados antes/depois de mechas, loiros e cachos.
- **Catálogo Transparente & Seguro**: Preços claros, duração estimada e explicações detalhadas sobre teste de mecha e personalização.
- **Portal da Cliente**: Acompanhamento de pré-reservas e aprovação de propostas personalizadas sem necessidade de cadastro burocrático.

### 📋 2. Triagem Técnica & Pré-Reservas sem Conflito de Horário
- **Triagem Prévia Obrigatória**: Formulários inteligentes onde a cliente envia histórico químico do cabelo, fotos atuais e objetivo de cor.
- **Prevenção Ativa de Conflitos**: A pré-reserva entra na fila de análise da especialista e **não bloqueia a agenda automaticamente** antes da aprovação mútua da proposta.
- **Notificações Instantâneas via WhatsApp**: Botões dedicados com templates automáticos para envio de propostas e confirmações.

### 📜 3. Gerador Dinâmico de Propostas de Luxo
- **Orçamentos sob Medida**: Montagem de propostas com valor total, desconto de Pix configurável, tempo estimado de procedimento e orientações pré-serviço.
- **Exportação em PDF Impecável**: Geração de propostas em PDF com padrão de alta costura para download ou compartilhamento direto com a cliente.
- **Aceite em 1-Clique**: A cliente visualiza a proposta em link dedicado (`/proposta/[id]`), escolhe a data e horário preferido e confirma instantaneamente.

### 🗓️ 4. Agenda Operacional com Gestão de Pausas Químicas
- **Timeline Linear do Dia**: Visualização minuto a minuto dos atendimentos com status de execução (*Em andamento*, *Concluído*, *Em pausa química*).
- **Encaixes Inteligentes**: Permite configurar e visualizar intervalos químicos (tempo de ação de descoloração/tratamento), possibilitando o atendimento paralelo seguro sem sobrecarga.
- **Sincronização em Tempo Real (Supabase Realtime + SyncBus)**: Atualizações instantâneas (0ms de latência entre abas e dispositivos) para novos agendamentos e status.

### 💼 5. Gestão Financeira & Comissões de Especialistas
- **DRE Simplificado & Faturamento**: Acompanhamento de receita diária, meta de faturamento, faturamento por forma de pagamento (Pix, Cartão, Dinheiro).
- **Cálculo de Comissões**: Repasse automatizado entre a proprietária e profissionais parceiras.
- **Cadastro Centralizado de Clientes**: Histórico de procedimentos, preferências químicas e valor acumulado por cliente.

### 🛡️ 6. Segurança, Governança & Arquitetura SaaS
- **Controle Estrito de Acesso (RBAC)**: Proteção rigorosa no Dashboard impedindo qualquer vazamento de dados para visitantes não autenticados ou perfis de clientes.
- **Painel SaaS Super Admin (`/saas-admin`)**: Controle de organizações, alternância entre *Modo Compartilhado* e *Modo Isolado* entre profissionais, e limites de atendimentos simultâneos.
- **SEO & Vercel Analytics Integrados**: Schema.org estruturado (`BeautySalon`), meta tags Open Graph de 1200x630px otimizadas para WhatsApp e telemetria gratuita do Vercel Analytics e Speed Insights.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologias Utilizadas |
| :--- | :--- |
| **Framework Web** | [Next.js 16.4.2](https://nextjs.org/) (App Router, Turbopack, Partial Prerendering) |
| **Linguagem & UI** | [TypeScript 5](https://www.typescriptlang.org/), [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/) |
| **Banco de Dados & Auth** | [Supabase](https://supabase.com/) (PostgreSQL, Realtime WebSockets, Row Level Security) |
| **Ícones & Grafismos** | [Lucide React](https://lucide.dev/), [Phosphor Icons](https://phosphoricons.com/) |
| **Observabilidade & Hosting** | [Vercel](https://vercel.com/) (Analytics, Speed Insights, Vercel CLI) |
| **Animações & Efeitos** | Canvas Confetti, CSS 3D Transforms, Shimmer Mesh Gradients |

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js 18+ ou 20+
- Conta no [Supabase](https://supabase.com/) (ou instância local do PostgreSQL)

### 1. Clonar o Repositório
```bash
git clone https://github.com/HollowDeev/BelezaCompleta.git
cd BelezaCompleta
```

### 2. Instalar Dependências
```bash
npm install
```

### 3. Configurar Variáveis de Ambiente
Crie um arquivo `.env.local` na raiz do projeto com as chaves do Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima-supabase
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Executar em Desenvolvimento
```bash
npm run dev
```
Acesse `http://localhost:3000` para a vitrine pública e `http://localhost:3000/login` para o portal restrito.

### 5. Compilar para Produção
```bash
npm run build
npm run start
```

---

## 📁 Estrutura do Projeto

```
BelezaCompleta/
├── public/
│   ├── brand/
│   │   ├── logo/             # Logotipos oficiais em SVG e PNG web-safe
│   │   ├── Grafismos/        # Grafismos de linhas orgânicas e padrões
│   │   └── Carrossel_Fotos/  # Portfólio de transformações reais
│   ├── icon.svg              # Favicon oficial de alta definição
│   └── og-image.jpg          # Card otimizado de compartilhamento para WhatsApp
├── src/
│   ├── app/
│   │   ├── layout.tsx        # SEO global, Schema.org e Vercel Analytics
│   │   ├── page.tsx          # Vitrine pública (Landing Page de conversão)
│   │   ├── login/            # Acesso seguro administrativo
│   │   ├── dashboard/        # Painel Operacional Mestre do Salão
│   │   ├── saas-admin/       # Painel de Controle SaaS (Super Admin)
│   │   ├── proposta/[id]/    # Visualização e aceite de propostas pela cliente
│   │   ├── sitemap.ts        # Gerador dinâmico de sitemap XML
│   │   └── robots.ts         # Diretivas de rastreamento para buscadores
│   ├── components/
│   │   ├── admin/            # Componentes operacionais (Agenda, Triagem, Finanças)
│   │   ├── client/           # Componentes da Vitrine (Hero, Portfólio, Depoimentos)
│   │   ├── layout/           # Sidebar, Navbar e Topbars de navegação
│   │   └── proposal/         # Construtor de propostas e gerador PDF
│   ├── lib/
│   │   ├── supabase/         # Clientes e API de dados do Supabase
│   │   └── sync/             # Barramento de sincronização Realtime (SyncBus)
│   └── types/                # Modelos TypeScript (Agendamentos, Triagens, Salão)
└── package.json
```

---

## 🔒 Segurança & Boas Práticas

- **Proteção Client-Side & Server-Side**: O dashboard valida sessões ativas e papéis autorizados antes de executar qualquer consulta ou renderização na tela.
- **Políticas RLS no Banco de Dados**: Acesso restrito a dados confidenciais por salão/organização.
- **Assets Web-Safe**: Todos os arquivos estáticos e imagens seguem padrões RFC 3986 sem caracteres especiais ou espaços, garantindo 100% de disponibilidade em CDNs Edge da Vercel.

---

## 👨‍💻 Autor & Direitos

Projeto idealizado e desenvolvido por **Thaua** ([@HollowDeev](https://github.com/HollowDeev)).

Para dúvidas, parcerias ou implantação em salões de beleza, entre em contato via GitHub.

<div align="center">
  <br />
  <sub>Feito com paixão pela beleza, design e engenharia de software de ponta. ✦</sub>
</div>

