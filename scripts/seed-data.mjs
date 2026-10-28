import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

// Read .env.local
const envConfig = fs.readFileSync('.env.local', 'utf-8');
const env = {};
for (const line of envConfig.split('\n')) {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const dbUrl = env.DATABASE_URL;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const defaultPassword = 'Glaicy@2026!';

// 1. Setup Auth Users
async function getOrCreateUser(email, name, role) {
  const { data: listData, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) throw listErr;
  
  const existing = listData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    console.log(`User ${email} already exists with ID: ${existing.id}`);
    return existing.id;
  }

  const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password: defaultPassword,
    email_confirm: true,
    user_metadata: { name, role }
  });

  if (createErr) throw createErr;
  console.log(`Created Auth User ${email} with ID: ${createData.user.id}`);
  return createData.user.id;
}

async function runSeed() {
  console.log('--- STEP 1: Creating / Fetching Auth Users ---');
  const thauaId = await getOrCreateUser('thaua@admin.com', 'Thaua (Super Admin)', 'super_admin');
  const gleicyId = await getOrCreateUser('gleicy@salao.com', 'Gleicy Ronha', 'salon_owner');
  const deboraId = await getOrCreateUser('debora@salao.com', 'Débora Santos', 'professional');

  console.log('--- STEP 2: Connecting to Database via PG ---');
  const pgClient = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });
  await pgClient.connect();

  console.log('--- STEP 3: Inserting Organization & Profiles ---');
  const orgId = '11111111-1111-4111-8111-111111111111';

  // Organization
  await pgClient.query(`
    INSERT INTO public.organizations (id, name, slug, tagline, phone, address, city, state, theme, settings)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      slug = EXCLUDED.slug,
      tagline = EXCLUDED.tagline,
      settings = EXCLUDED.settings;
  `, [
    orgId,
    'Espaço da Beleza Gleicy Ronha',
    'gleicyronha',
    'Exclusividade & Alta Performance em Cachos e Iluminados',
    '(11) 98765-4321',
    'Av. Paulista, 1000 - Jardins',
    'São Paulo',
    'SP',
    JSON.stringify({ primaryColor: '#54352a', accentColor: '#c59b27' }),
    JSON.stringify({
      isSharedMode: true,
      allowSelfRegistration: false,
      requireTriageApprovalHours: 48,
      pixDiscountPercent: 5,
      maxParallelInPause: 1,
    })
  ]);

  // Profiles
  const profiles = [
    {
      id: thauaId,
      org_id: orgId,
      role: 'super_admin',
      name: 'Thaua (Super Admin)',
      email: 'thaua@admin.com',
      phone: '(11) 99999-0000',
      dashboard_mode: 'advanced',
      commission_rate: 0
    },
    {
      id: gleicyId,
      org_id: orgId,
      role: 'salon_owner',
      name: 'Gleicy Ronha',
      email: 'gleicy@salao.com',
      phone: '(11) 98765-4321',
      specialty: 'Master em Cachos, Crespos e Iluminados Saudáveis',
      bio: 'Transformando curvaturas e valorizando identidades com técnica de alta performance sem danos aos fios.',
      dashboard_mode: 'intermediary',
      commission_rate: 100
    },
    {
      id: deboraId,
      org_id: orgId,
      role: 'professional',
      name: 'Débora Santos',
      email: 'debora@salao.com',
      phone: '(11) 92105-1540',
      specialty: 'Especialista em Cortes Texturizados e Shag Hair',
      bio: 'Cortes modernos pensados para realçar o movimento natural da fibra capilar.',
      dashboard_mode: 'intermediary',
      commission_rate: 60
    }
  ];

  for (const p of profiles) {
    await pgClient.query(`
      INSERT INTO public.profiles (id, org_id, role, name, email, phone, specialty, bio, dashboard_mode, commission_rate, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
      ON CONFLICT (id) DO UPDATE SET
        org_id = EXCLUDED.org_id,
        role = EXCLUDED.role,
        name = EXCLUDED.name,
        specialty = EXCLUDED.specialty,
        commission_rate = EXCLUDED.commission_rate,
        dashboard_mode = EXCLUDED.dashboard_mode;
    `, [p.id, p.org_id, p.role, p.name, p.email, p.phone, p.specialty || null, p.bio || null, p.dashboard_mode, p.commission_rate]);
  }

  console.log('--- STEP 4: Inserting Triage Forms & Questions ---');
  const triageFormId = '33333333-3333-4333-8333-333333333331';
  await pgClient.query(`
    INSERT INTO public.triage_forms (id, org_id, title, description, estimated_minutes, is_template)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;
  `, [
    triageFormId,
    orgId,
    'Triagem Técnica para Iluminado & Mechas',
    'Diagnóstico capilar preliminar para avaliar a integridade dos fios antes da transformação.',
    3,
    true
  ]);

  const questions = [
    {
      id: '33333333-3333-4333-8333-000000000001',
      order: 1,
      title: 'Qual é o padrão predominante da sua curvatura?',
      subtitle: 'Selecione o tipo que mais se aproxima do seu cabelo natural.',
      tip: 'Cabelos com curvaturas mais fechadas necessitam de técnicas que preservem a umidade natural.',
      type: 'single_choice',
      options: [
        { id: 'curv-2', label: 'Ondulado (2A, 2B ou 2C)', description: 'Ondas suaves em formato de S com raiz mais lisa.' },
        { id: 'curv-3', label: 'Cacheado (3A, 3B ou 3C)', description: 'Cachos bem definidos em espiral desde a raiz ou meio.' },
        { id: 'curv-4', label: 'Crespo (4A, 4B ou 4C)', description: 'Padrão em Z ou espirais bem compactas e delicadas.' },
        { id: 'curv-trans', label: 'Em Transição Capilar', description: 'Partes com química antiga e raiz natural crescendo.' },
      ]
    },
    {
      id: '33333333-3333-4333-8333-000000000002',
      order: 2,
      title: 'Você realizou alguma química nos últimos 12 meses?',
      subtitle: 'Progressiva, botox, relaxamento, coloração ou descoloração.',
      tip: 'Atenção: Químicas alisantes e descolorações anteriores criam barreiras ou fragilidade na fibra.',
      type: 'multiple_choice',
      allowMultiple: true,
      options: [
        { id: 'chem-none', label: 'Nenhuma (Cabelo 100% natural)', description: 'Fios sem nenhuma intervenção química recente.' },
        { id: 'chem-prog', label: 'Progressiva ou Botox Ácido', description: 'Alisamentos, selagens ou botox com formol/ácidos.' },
        { id: 'chem-tint', label: 'Tintura / Tonalizante Escuro', description: 'Pigmentos pretos, castanhos ou vermelhos.' },
        { id: 'chem-mecha', label: 'Mechas ou Luzes anteriores', description: 'Clareamento prévio nas pontas ou comprimento.' },
      ]
    },
    {
      id: '33333333-3333-4333-8333-000000000003',
      order: 3,
      title: 'Como você sente a saúde atual do seu fio?',
      subtitle: 'Avalie o nível de ressecamento ou quebra que você nota no dia a dia.',
      tip: 'Se o cabelo estiver desidratado, associamos protocolo lipídico protetor.',
      type: 'single_choice',
      options: [
        { id: 'health-good', label: 'Fios resistentes e saudáveis', description: 'Brilho natural, pouca quebra ao pentear.' },
        { id: 'health-dry', label: 'Levemente ressecado nas pontas', description: 'Precisa de hidratação frequente.' },
        { id: 'health-porous', label: 'Muito poroso e embaraça com facilidade', description: 'Sensação de aspereza ao toque.' },
        { id: 'health-brittle', label: 'Quebradiço / Elástico', description: 'Fio estica ou quebra facilmente quando molhado.' },
      ]
    },
    {
      id: '33333333-3333-4333-8333-000000000004',
      order: 4,
      title: 'Envio de Fotos para Diagnóstico Técnico',
      subtitle: 'Envie fotos tiradas sob iluminação natural para Gleicy analisar seu tom e textura.',
      tip: 'A iluminação natural permite identificar reflexos quentes e fundo de clareamento real.',
      type: 'photo_upload',
      options: []
    },
    {
      id: '33333333-3333-4333-8333-000000000005',
      order: 5,
      title: 'Qual é o resultado dos seus sonhos?',
      subtitle: 'Conte em poucas palavras ou mencione tons que você ama (ex: chocolate, mel, dourado suave).',
      tip: 'Alinhamos expectativas para criar uma proposta coerente.',
      type: 'text',
      options: []
    }
  ];

  for (const q of questions) {
    await pgClient.query(`
      INSERT INTO public.triage_questions (id, form_id, question_order, title, subtitle, educational_tip, question_type, options_json, allow_multiple, required)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
      ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, options_json = EXCLUDED.options_json;
    `, [q.id, triageFormId, q.order, q.title, q.subtitle, q.tip, q.type, JSON.stringify(q.options), q.allowMultiple || false]);
  }

  console.log('--- STEP 5: Inserting Services & Steps ---');
  const services = [
    {
      id: '22222222-2222-4222-8222-222222222221',
      professionalId: gleicyId,
      title: 'Iluminado Chocolate & Saúde dos Fios',
      slug: 'iluminado-chocolate',
      category: 'transformacao',
      description: 'Iluminação nobre em tons de chocolate para valorizar a curvatura natural com técnica superclareadora sem agressão.',
      price: 710,
      promotionalPrice: 674.5,
      imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
      requiresTriage: true,
      triageFormId: triageFormId,
      steps: [
        { order: 1, title: 'Aplicação e Desenho das Mechas', type: 'active', durationMin: 50, exclusive: true },
        { order: 2, title: 'Tempo de Ação da Química / Clareamento', type: 'pause', durationMin: 35, maxPause: 55, exclusive: false },
        { order: 3, title: 'Estabilização, Lavatório & Finalização', type: 'active', durationMin: 45, exclusive: true },
      ]
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      professionalId: gleicyId,
      title: 'Transformação Shag Hair & Mecha Tom de Mel',
      slug: 'shag-hair-mecha-mel',
      category: 'transformacao',
      description: 'Corte Shag com camadas que preservam o comprimento combinado com mecha lateral estratégica para iluminar o rosto.',
      price: 380,
      promotionalPrice: 380,
      imageUrl: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=800&auto=format&fit=crop&q=80',
      requiresTriage: true,
      triageFormId: triageFormId,
      steps: [
        { order: 1, title: 'Aplicação da Mecha Estratégica tom Mel', type: 'active', durationMin: 35, exclusive: true },
        { order: 2, title: 'Ação da Mecha (Pausa Química)', type: 'pause', durationMin: 30, maxPause: 45, exclusive: false },
        { order: 3, title: 'Corte Shag Hair em Camadas & Finalização', type: 'active', durationMin: 45, exclusive: true },
      ]
    },
    {
      id: '22222222-2222-4222-8222-222222222223',
      professionalId: deboraId,
      title: 'Corte Shag Hair & Definição de Curvatura',
      slug: 'corte-definicao-cachos',
      category: 'corte',
      description: 'Corte especializado em camadas leves para movimento e volume equilibrado com fitagem profissional.',
      price: 190,
      promotionalPrice: 150,
      imageUrl: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=800&auto=format&fit=crop&q=80',
      requiresTriage: false,
      triageFormId: null,
      steps: [
        { order: 1, title: 'Corte Estruturado a Seco', type: 'active', durationMin: 35, exclusive: true },
        { order: 2, title: 'Lavagem Terapêutica & Fitagem', type: 'active', durationMin: 30, exclusive: true },
      ]
    },
    {
      id: '22222222-2222-4222-8222-222222222224',
      professionalId: deboraId,
      title: 'Protocolo de Nutrição & Reposição Lipídica',
      slug: 'nutricao-reposicao-lipidica',
      category: 'tratamento',
      description: 'Tratamento de alto impacto para fios desidratados, restaurando maciez, brilho e elasticidade natural.',
      price: 220,
      promotionalPrice: 200,
      imageUrl: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=800&auto=format&fit=crop&q=80',
      requiresTriage: false,
      triageFormId: null,
      steps: [
        { order: 1, title: 'Higienização e Aplicação da Máscara Ativa', type: 'active', durationMin: 20, exclusive: true },
        { order: 2, title: 'Ação Térmica / Touca de Vapor (Pausa)', type: 'pause', durationMin: 20, maxPause: 30, exclusive: false },
        { order: 3, title: 'Enxágue Acidificante & Finalização', type: 'active', durationMin: 25, exclusive: true },
      ]
    }
  ];

  for (const s of services) {
    await pgClient.query(`
      INSERT INTO public.services (id, org_id, professional_id, title, slug, category, description, price, promotional_price, image_url, requires_triage, triage_form_id, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        price = EXCLUDED.price,
        promotional_price = EXCLUDED.promotional_price,
        requires_triage = EXCLUDED.requires_triage;
    `, [s.id, orgId, s.professionalId, s.title, s.slug, s.category, s.description, s.price, s.promotionalPrice, s.imageUrl, s.requiresTriage, s.triageFormId]);

    // Steps
    await pgClient.query('DELETE FROM public.service_steps WHERE service_id = $1', [s.id]);
    for (const st of s.steps) {
      await pgClient.query(`
        INSERT INTO public.service_steps (service_id, step_order, title, step_type, duration_min, max_pause_duration_min, requires_exclusive_attention)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [s.id, st.order, st.title, st.type, st.durationMin, st.maxPause || null, st.exclusive]);
    }
  }

  console.log('--- STEP 6: Inserting Triage Submissions ---');
  const subIsaId = '44444444-4444-4444-8444-444444444441';
  const propIsaId = '55555555-5555-4555-8555-555555555551';
  const propDeboraId = '55555555-5555-4555-8555-555555555552';

  await pgClient.query(`
    INSERT INTO public.triage_submissions (id, org_id, form_id, service_id, client_name, client_phone, client_email, preferred_date, preferred_time_slot, answers, photos, proposal_id, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
  `, [
    subIsaId,
    orgId,
    triageFormId,
    '22222222-2222-4222-8222-222222222221',
    'Isa Franca',
    '(11) 93342-9586',
    'isa.franca@email.com',
    '2026-10-17',
    '09:00',
    JSON.stringify([
      { questionId: 'q-curvatura', questionTitle: 'Padrão de Curvatura', selectedOptionIds: ['curv-3'], selectedOptionLabels: ['Cacheado (3A, 3B ou 3C)'] },
      { questionId: 'q-quimica', questionTitle: 'Histórico Químico (12 meses)', selectedOptionIds: ['chem-none'], selectedOptionLabels: ['Nenhuma (Cabelo 100% natural)'] },
      { questionId: 'q-sensibilidade', questionTitle: 'Saúde Atual', selectedOptionIds: ['health-dry'], selectedOptionLabels: ['Levemente ressecado nas pontas'] },
      { questionId: 'q-desejo', questionTitle: 'Desejo da Cliente', textAnswer: 'Gostaria de mechas tom chocolate quentes que não alterem minha raiz natural e não fiquem alaranjadas.' }
    ]),
    JSON.stringify({
      hairPhoto: 'https://images.unsplash.com/photo-1584297091622-af8e5fd75466?w=600&auto=format&fit=crop&q=80',
      inspirationPhoto: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80'
    }),
    propIsaId,
    'proposal_sent'
  ]);

  console.log('--- STEP 7: Inserting Proposals & Templates ---');
  // Proposal Isa
  await pgClient.query(`
    INSERT INTO public.proposals (
      id, org_id, professional_id, triage_submission_id, client_name, client_phone, client_email,
      title, subtitle, project_overview, desired_results, chosen_technique, maintenance_guidance,
      included_items, differentials, technical_commitment, items, total_original, total_with_discount,
      pix_discount_percent, pix_total, status, expires_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
    ) ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, pix_total = EXCLUDED.pix_total;
  `, [
    propIsaId,
    orgId,
    gleicyId,
    subIsaId,
    'Isa Franca',
    '(11) 93342-9586',
    'isa.franca@email.com',
    'PROPOSTA PERSONALIZADA',
    'Iluminado Chocolate & Saúde dos Fios',
    'Isa, a proposta para o seu cabelo é criar um iluminado em tom chocolate, respeitando sua curvatura natural e criando uma transição suave entre a cor natural da raiz e as partes iluminadas.',
    JSON.stringify([
      'Iluminação natural, mas visível.',
      'Tom chocolate elegante e harmonioso.',
      'Transição suave entre a raiz natural e o iluminado.',
      'Ausência de marcações fortes no crescimento.',
      'Mais profundidade e dimensão para os cachos.'
    ]),
    'Para alcançar o tom desejado, o procedimento será realizado com coloração superclareadora, sem a utilização de pó descolorante.',
    'A proposta é criar um cabelo que continue bonito mesmo com o crescimento natural da raiz. Manutenção baixa.',
    JSON.stringify([
      'Avaliação técnica do cabelo e planejamento personalizado.',
      'Aplicação da técnica com superclareadora tom chocolate.',
      'Tratamento profissional completo de proteção.',
      'Finalização profissional valorizando a curvatura natural.'
    ]),
    JSON.stringify([
      { id: 'diff-1', title: 'Atendimento Personalizado', description: 'Dedicação e análise anatômica de cada mecha.' },
      { id: 'diff-2', title: 'Técnicas Adaptadas', description: 'Foco exclusivo em cabelos ondulados e cacheados.' },
      { id: 'diff-3', title: 'Preservação da Saúde', description: 'Proteção da barreira lipídica durante a cor.' }
    ]),
    'O resultado do iluminado será construído respeitando a base natural, a estrutura e a resistência do seu cabelo.',
    JSON.stringify([{ id: 'item-1', serviceTitle: 'Iluminado Chocolate & Saúde dos Fios', originalPrice: 710, specialPrice: 710 }]),
    710, 710, 5, 674.50, 'sent', '2026-10-25T18:00:00Z'
  ]);

  // Proposal Débora
  await pgClient.query(`
    INSERT INTO public.proposals (
      id, org_id, professional_id, client_name, client_phone, client_email,
      title, subtitle, project_overview, desired_results, chosen_technique, maintenance_guidance,
      included_items, differentials, technical_commitment, items, total_original, total_with_discount,
      pix_discount_percent, pix_total, status, approved_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
    ) ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
  `, [
    propDeboraId,
    orgId,
    gleicyId,
    'Débora Santos',
    '(11) 92105-1540',
    'debora@cliente.com',
    'PROPOSTA DE TRANSFORMAÇÃO',
    'Exclusividade & Alta Performance em Corte e Cor',
    'Transformação com leveza, mecha lateral tom mel e corte Shag Hair com movimento.',
    JSON.stringify(['Iluminação facial estratégica tom mel.', 'Corte Shag com caimento leve.']),
    'Aplicação localizada de mecha lateral tom mel seguida de corte a seco mecha a mecha.',
    'Retoque sutil e manutenção espaçada.',
    JSON.stringify(['Corte Shag Hair', 'Mecha lateral tom de mel', 'Tratamento pós-coloração']),
    JSON.stringify([{ id: 'diff-d1', title: 'Atendimento Personalizado', description: 'Design de corte sob medida.' }]),
    'Corte personalizado respeitando densidade e curvatura.',
    JSON.stringify([
      { id: 'item-deb-1', serviceTitle: 'Corte Shag Hair', originalPrice: 190, specialPrice: 150 },
      { id: 'item-deb-2', serviceTitle: 'Mecha lateral tom mel', originalPrice: 230, specialPrice: 230 }
    ]),
    420, 380, 5, 361.00, 'approved', '2026-10-15T16:45:00Z'
  ]);

  // Proposal Template
  await pgClient.query(`
    INSERT INTO public.proposal_templates (id, org_id, title, category, data)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;
  `, [
    '66666666-6666-4666-8666-666666666661',
    orgId,
    'Template Padrão: Iluminado & Mechas Criativas',
    'mechas',
    JSON.stringify({
      subtitle: 'Técnica Superclareadora sem Danos aos Cachos',
      projectOverview: 'Construção de mechas sem pó descolorante preservando a hidratação natural.',
      pixDiscountPercent: 5
    })
  ]);

  console.log('--- STEP 8: Inserting Appointments ---');
  // Appointment Isa Franca
  await pgClient.query(`
    INSERT INTO public.appointments (
      id, org_id, professional_id, service_id, client_name, client_phone, client_email,
      date, start_time, end_time, total_duration_min, status, price, payment_status, proposal_id, step_blocks, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    ON CONFLICT (id) DO UPDATE SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time;
  `, [
    '77777777-7777-4777-8777-777777777771',
    orgId,
    gleicyId,
    '22222222-2222-4222-8222-222222222221',
    'Isa Franca',
    '(11) 93342-9586',
    'isa.franca@email.com',
    '2026-10-17',
    '14:00',
    '15:45',
    105,
    'confirmed',
    710,
    'paid',
    propIsaId,
    JSON.stringify([
      { id: 'blk-1', stepId: 'step-1-aplicacao', stepTitle: 'Aplicação das Mechas', type: 'active', startTime: '14:00', endTime: '14:30', durationMin: 30, isParallelSlotAllowed: false },
      { id: 'blk-2', stepId: 'step-2-pausa-quimica', stepTitle: 'Pausa da Química (Livre p/ Encaixe)', type: 'pause', startTime: '14:30', endTime: '15:15', durationMin: 45, maxPauseDurationMin: 55, isParallelSlotAllowed: true },
      { id: 'blk-3', stepId: 'step-3-lavatorio-finalizacao', stepTitle: 'Lavatório e Finalização dos Cachos', type: 'active', startTime: '15:15', endTime: '15:45', durationMin: 30, isParallelSlotAllowed: false }
    ]),
    'Procedimento com pausa química permitindo atendimento paralelo na cadeira.'
  ]);

  // Appointment Débora (Encaixe VIP na pausa da Isa)
  await pgClient.query(`
    INSERT INTO public.appointments (
      id, org_id, professional_id, service_id, client_name, client_phone, client_email,
      date, start_time, end_time, total_duration_min, status, price, payment_status, payment_method, proposal_id, step_blocks, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    ON CONFLICT (id) DO UPDATE SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time;
  `, [
    '77777777-7777-4777-8777-777777777772',
    orgId,
    gleicyId,
    '22222222-2222-4222-8222-222222222222',
    'Débora Santos',
    '(11) 92105-1540',
    'debora@cliente.com',
    '2026-10-17',
    '14:30',
    '15:40',
    70,
    'confirmed',
    380,
    'paid',
    'pix',
    propDeboraId,
    JSON.stringify([
      { id: 'blk-d1', stepId: 'step-shag-1', stepTitle: 'Corte Shag Hair em Camadas', type: 'active', startTime: '14:30', endTime: '15:05', durationMin: 35, isParallelSlotAllowed: false },
      { id: 'blk-d2', stepId: 'step-shag-2', stepTitle: 'Lavagem Terapêutica & Fitagem', type: 'active', startTime: '15:05', endTime: '15:40', durationMin: 35, isParallelSlotAllowed: false }
    ]),
    'Proposta aprovada pela cliente via link! Encaixe VIP realizado durante a pausa química.'
  ]);

  await pgClient.end();
  console.log('=== SEED COMPLETED SUCCESSFULLY! ===');
  console.log('Test credentials:');
  console.log('Super Admin: thaua@admin.com | Pass: Glaicy@2026!');
  console.log('Salon Owner: gleicy@salao.com | Pass: Glaicy@2026!');
  console.log('Professional: debora@salao.com | Pass: Glaicy@2026!');
}

runSeed().catch(err => {
  console.error('Seed Error:', err);
  process.exit(1);
});
