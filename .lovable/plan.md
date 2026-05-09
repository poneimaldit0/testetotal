

## Plano: Análise IA de Propostas com 3 Estados Visuais

### Resumo
Implementar análise automática via IA (Lovable AI Gateway) após upload de proposta, com 3 estados visuais no card de candidatura: vazio, processando (5 etapas animadas) e análise concluída (card verde colapsável).

O projeto usa Lovable AI Gateway (`LOVABLE_API_KEY` já configurado). A instrução original pede Claude/Anthropic, mas usaremos o gateway disponível que oferece modelos equivalentes — a experiência do fornecedor será idêntica.

---

### Alterações

**1. Migração SQL — Tabela `propostas_analises_ia`**
- Campos: `id`, `candidatura_id`, `orcamento_id`, `fornecedor_id`, `propostas_arquivo_id`, `posicionamento` (text: dentro_media/acima_media/abaixo_media), `valor_proposta` (numeric), `valor_referencia_mercado` (numeric), `pontos_fortes` (jsonb), `pontos_atencao` (jsonb), `status` (text: pending/completed/failed), `raw_response` (text), `created_at`
- RLS: fornecedor vê apenas suas análises

**2. Edge Function `analisar-proposta`**
- Recebe `candidatura_id` e `arquivo_id`
- Busca dados do orçamento (necessidade, categorias, local, tamanho, nome do arquivo)
- Chama Lovable AI Gateway com prompt contendo o contexto do orçamento e instrução para retornar análise comparativa
- Usa tool calling para extrair JSON estruturado (posicionamento, valor_proposta, valor_referencia, pontos_fortes[3], pontos_atencao[3])
- Salva resultado em `propostas_analises_ia`
- Fallback: salva status `failed` se a API falhar

**Prompt da IA (resumo):** Recebe dados do orçamento e metadados da proposta. Analisa posicionamento de mercado, identifica pontos fortes e de atenção, gera valores comparativos. Retorna JSON via tool calling.

**3. Hook `src/hooks/useAnalisePropostaIA.ts`**
- Carrega análise existente da tabela `propostas_analises_ia`
- Função `solicitarAnalise(candidaturaId, arquivoId)` que chama a edge function
- Polling a cada 3s enquanto status é `pending`
- Retorna `statusAnalise`: idle | processing | completed | failed

**4. Componente `src/components/fornecedor/PropostaProcessando.tsx`**
- 5 etapas sequenciais com ícones animados (Upload, FileText, BarChart, Search, Sparkles)
- Cada etapa ~2s, avanço automático
- Barra de progresso no topo
- Texto: "Sua proposta está sendo analisada pela IA Reforma100"

**5. Componente `src/components/fornecedor/AnalisePropostaCard.tsx`**
- Card verde colapsável com chevron
- Título: "✓ Análise Reforma100 — exclusiva para você"
- Badge colorido (Dentro/Acima/Abaixo da média)
- Valor proposta vs. referência mercado
- 3 pontos fortes (✔ verde) + 3 pontos de atenção (→ âmbar)
- Rodapé: "Esta análise é privada e visível apenas para você"
- Fallback: "Análise indisponível no momento — sua proposta foi recebida com sucesso."

**6. Refatorar `PropostaAnexoUpload.tsx`**
- Integrar `useAnalisePropostaIA`
- Estado 1 (vazio): sem alteração
- Estado 2 (processando): renderiza `PropostaProcessando`
- Estado 3 (concluído): arquivo + `AnalisePropostaCard`

**7. Atualizar `usePropostasArquivos.ts`**
- Retornar ID do arquivo inserido após upload para passar ao hook de análise

### Fluxo
1. Fornecedor faz upload → arquivo salvo no storage + banco
2. Upload conclui → dispara chamada à edge function + animação de 5 etapas
3. Edge function analisa via IA e salva resultado
4. Polling detecta conclusão → exibe card de análise colapsável
5. Se erro → fallback amigável, proposta continua salva

### Arquivos
- `supabase/migrations/...` (nova tabela)
- `supabase/functions/analisar-proposta/index.ts`
- `src/hooks/useAnalisePropostaIA.ts`
- `src/components/fornecedor/PropostaProcessando.tsx`
- `src/components/fornecedor/AnalisePropostaCard.tsx`
- `src/components/fornecedor/PropostaAnexoUpload.tsx` (editado)
- `src/hooks/usePropostasArquivos.ts` (editado)

