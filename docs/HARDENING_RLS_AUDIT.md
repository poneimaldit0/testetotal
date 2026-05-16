# Hardening RLS Audit — Sprint 1 / Worktree A

Auditoria de Row Level Security nas tabelas críticas do Reforma100.
Levantamento feito a partir de `supabase/migrations/*.sql` (414 migrations).
NÃO altera nada em produção — é relatório apenas.

Legenda:
- ✅ RLS habilitada + policies cobrindo SELECT/INSERT/UPDATE/DELETE adequadamente
- ⚠️ RLS habilitada mas cobertura PARCIAL (falta uma ou mais operações ou
  depende de service_role enquanto o frontend faz a operação direto)
- ❌ Sem RLS habilitada / sem policies encontradas

---

## Tabelas críticas (briefing)

### ✅ `orcamentos`
- `ENABLE RLS`: mig `20250623183356`
- SELECT: ✅ múltiplas (fornecedores em orçamentos abertos, fornecedores
  inscritos, gestores, admins, consulta histórica)
- INSERT: ✅ gestores de conta (`20250715221750`)
- UPDATE: ✅ via `Admins podem ver todos os orçamentos` (`FOR ALL`,
  `20250618213051`)
- DELETE: ✅ `Admins can delete orcamentos` (`20250623183356`)

### ✅ `candidaturas_fornecedores`
- `ENABLE RLS`: mig `20250618210828`
- SELECT/INSERT/UPDATE: ✅ por `fornecedor_id = auth.uid()`
- SELECT (admins): ✅ `FOR ALL` admins
- SELECT (gestores): ✅ `20250715221750`
- SELECT público (token de comparação): ✅ `20250814010330` /
  `20250814011103`

### ✅ `propostas_analises_ia`
- `ENABLE RLS`: mig `20260411130343`
- SELECT: ✅ fornecedor próprio + admins + gestores (mig `20260429204827`,
  `20260430000000`)
- INSERT: ✅ service_role
- UPDATE: ✅ service_role + admins (`20260430100000`)
- DELETE: ✅ admins (`20260430100000`)

### ⚠️ `compatibilizacoes_analises_ia` — **PARCIAL — CRÍTICO**
- `ENABLE RLS`: mig `20260426000000`
- SELECT: ✅ `anon, authenticated` (policy `anon_read_by_orcamento`,
  `USING (true)` — leitura totalmente aberta!)
- INSERT/UPDATE/DELETE: apenas `service_role` (`service_role_all`)
- **Problema 1 (vazamento)**: SELECT é `USING (true)` para anon, ou seja,
  qualquer cliente anônimo consegue ler TODAS as análises de
  compatibilização do sistema. Isso vaza ranking de fornecedores,
  recomendações e valores.
- **Problema 2 (UPDATE via frontend)**: O hook `useCompatibilizacaoIA.ts`
  faz UPDATEs diretos (`salvarAjusteRanking`, `salvarNotaConsultor`,
  `aprovarCompatibilizacao`, `marcarEnviado`, `salvarApresentacao`) sob
  role `authenticated`. Como só existe policy `service_role_all` para
  ALL, esses UPDATEs deveriam estar falhando silenciosamente — checar
  se há algum bypass via JWT claim de admin, ou se eles realmente
  estão sendo aplicados (suspeita: pode estar funcionando porque
  `compatibilizacoes_analises_ia` pode estar herdando RLS desabilitada
  em alguma migration posterior, ou o frontend está usando uma chave
  de serviço — VERIFICAR).
- **Nenhuma migration posterior reabilita ou ajusta** essas policies
  (apenas `20260511000002_bloco2_compat_state_machine.sql` e
  `20260515000001_compat_apresentacao_agendada.sql` mexem no schema,
  sem tocar RLS).

### ✅ `propostas_arquivos`
- `ENABLE RLS`: mig `20251229010147`
- SELECT: ✅ fornecedor próprio + admins + gestores + CS
- INSERT: ✅ fornecedor próprio
- DELETE: ✅ fornecedor próprio + admins (`20260430100000`)
- UPDATE: não tem policy, mas tabela é imutável por design (uploads).

### ✅ `orcamentos_crm_tracking`
- `ENABLE RLS`: mig `20251022000135`
- SELECT: ✅ admin/gestor/CS/Master/fornecedores inscritos
  (`20251125181329`, `20251229004722`)
- INSERT/UPDATE/DELETE: ✅ admin + gestores (`20251125181329`)

### ⚠️ `revisoes_propostas_clientes` — **parcial mas com mitigação por RPC**
- `ENABLE RLS`: mig `20250916132308`
- SELECT: ✅ cliente via token + admins
- INSERT: ✅ cliente via token + admins
- UPDATE: ❌ direto — sem policy
- DELETE: ✅ admins (via `FOR ALL`)
- **Mitigação**: o hook `useRevisoesWorkflow.ts` chama a RPC
  `finalizar_revisao_fornecedor` (SECURITY DEFINER), que pode atualizar
  contornando RLS. Os UPDATEs diretos em `iniciarRevisao`
  (`status = 'em_andamento'`) podem estar caindo na policy admin
  ou silenciosamente falhando — **revisar**.

---

## TOP 3 tabelas que mais precisam de RLS adicional / revisão

### 1) `compatibilizacoes_analises_ia` (urgente)
- **Por quê**: SELECT é `USING (true)` para `anon` — vazamento aberto
  de toda a análise IA de compatibilização (rankings, valores,
  recomendações, dados estratégicos da consultoria).
- **Ação sugerida**:
  - Substituir policy `anon_read_by_orcamento` por uma que exija
    `auth.uid()` + relacionamento via `orcamento_id` (admin/gestor
    dono / fornecedor inscrito quando o status for `enviado`).
  - Criar policies explícitas `FOR UPDATE` para consultor/admin
    cobrindo `salvarAjusteRanking`, `aprovarCompatibilizacao`,
    `salvarNotaConsultor`, `marcarEnviado`, `salvarApresentacao`.
  - Auditar se hoje os UPDATEs do consultor estão de fato sendo
    aplicados (provavelmente sim via algum bypass, mas a policy
    declarada não autoriza).

### 2) `revisoes_propostas_clientes`
- **Por quê**: UPDATE direto pelo fornecedor (em `iniciarRevisao`) é
  feito sem policy explícita, dependendo de uma policy `FOR ALL`
  de admin que não cobre `fornecedor_id = auth.uid()`.
- **Ação sugerida**: criar policy
  `FOR UPDATE TO authenticated USING (
     EXISTS (SELECT 1 FROM checklist_propostas p
              JOIN candidaturas_fornecedores cf ON cf.id = p.candidatura_id
              WHERE p.id = checklist_proposta_id
                AND cf.fornecedor_id = auth.uid())
   )` ou consolidar todos os updates de fornecedor em RPCs SECURITY
   DEFINER.

### 3) `logs_acesso` / `propostas_arquivos` (UPDATE)
- **Por quê (logs_acesso)**: a query em `useDashboardStats` (que ficou
  intocada no Bloco 2) lê todos os logs do dia para contar acessos
  únicos. Sem RLS apropriada, isso pode vazar `user_id` de todos os
  usuários para qualquer autenticado. Vale auditar se a policy
  permite apenas admins/CS.
- **Por quê (propostas_arquivos UPDATE)**: hoje não há policy para
  UPDATE — assumindo imutabilidade. Caso futuramente seja preciso
  marcar `analisado_em` ou similar, vai precisar de policy. Anotar
  como item de "tomar cuidado se editar".

---

## Resumo executivo

| Tabela                          | RLS | SELECT | INSERT | UPDATE | DELETE |
|---------------------------------|-----|--------|--------|--------|--------|
| orcamentos                      | ✅  | ✅     | ✅     | ✅     | ✅     |
| candidaturas_fornecedores       | ✅  | ✅     | ✅     | ✅     | ✅(ALL)|
| propostas_analises_ia           | ✅  | ✅     | ✅     | ✅     | ✅     |
| compatibilizacoes_analises_ia   | ⚠️  | ⚠️ aberto | service_role | service_role | service_role |
| propostas_arquivos              | ✅  | ✅     | ✅     | n/a    | ✅     |
| orcamentos_crm_tracking         | ✅  | ✅     | ✅     | ✅     | ✅     |
| revisoes_propostas_clientes     | ⚠️  | ✅     | ✅     | ⚠️ via RPC | ✅(ALL) |

**Prioridade absoluta**: corrigir `compatibilizacoes_analises_ia` SELECT
para autenticados+vínculo, e adicionar UPDATE policy adequada.

---

_Arquivo temporário gerado no worktree-agent-abe485cea0d61fd10.
Deve ser removido após o merge — não é código de produção._
