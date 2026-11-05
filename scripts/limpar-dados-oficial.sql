-- ==============================================================================
-- SCRIPT DE LIMPEZA E PREPARAÇÃO PARA USO OFICIAL - GLAICY AGENDA
-- ==============================================================================
-- Este script limpa com segurança todos os dados operacionais de teste:
--   ✓ Remove todos os agendamentos (appointments)
--   ✓ Remove todas as pré-reservas (pre_reservations)
--   ✓ Remove todas as propostas enviadas/geradas (proposals)
--   ✓ Remove todas as respostas de triagem de clientes (triage_submissions)
--   ✓ Remove todos os clientes cadastrados (salon_clients)
--   ✓ Remove todas as etapas técnicas de serviços (service_steps)
--   ✓ Remove todos os serviços de teste (services)
--   ✓ Remove todas as aberturas de agenda de teste (available_days)
--
-- O QUE É MANTIDO 100% INTACTO:
--   ★ Usuários cadastrados (auth.users e public.profiles: Gleicy e Thauan)
--   ★ Dados do Salão Oficial (public.organizations: Espaço da Beleza Gleicy Ronha)
--   ★ Formulário de Anamnese Capilar Oficial (public.triage_forms e triage_questions)
--   ★ Modelos de Proposta de Luxo (public.proposal_templates)
-- ==============================================================================

BEGIN;

-- 1. Desconecta referências para evitar bloqueios de chave estrangeira
UPDATE public.triage_forms SET target_service_id = NULL;

-- 2. Limpeza das tabelas operacionais e de teste com CASCADE
TRUNCATE TABLE 
    public.appointments,
    public.pre_reservations,
    public.proposals,
    public.triage_submissions,
    public.salon_clients,
    public.service_steps,
    public.services,
    public.available_days
CASCADE;

COMMIT;

-- ==============================================================================
-- VERIFICAÇÃO PÓS-LIMPEZA (CONSULTA DE CONFERÊNCIA)
-- ==============================================================================
SELECT 'profiles' AS tabela, COUNT(*) AS total FROM public.profiles
UNION ALL
SELECT 'organizations', COUNT(*) FROM public.organizations
UNION ALL
SELECT 'services', COUNT(*) FROM public.services
UNION ALL
SELECT 'appointments', COUNT(*) FROM public.appointments
UNION ALL
SELECT 'pre_reservations', COUNT(*) FROM public.pre_reservations
UNION ALL
SELECT 'salon_clients', COUNT(*) FROM public.salon_clients
UNION ALL
SELECT 'triage_submissions', COUNT(*) FROM public.triage_submissions
UNION ALL
SELECT 'proposals', COUNT(*) FROM public.proposals
UNION ALL
SELECT 'available_days', COUNT(*) FROM public.available_days;
