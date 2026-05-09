import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BackupProposta {
  id: string;
  checklist_proposta_id: string;
  respostas_backup: any[];
  valor_total_backup: number;
  forma_pagamento_backup: any;
  data_backup: string;
  motivo_backup: string;
  restored: boolean;
}

export const usePropostaBackup = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const criarBackupProposta = async (
    checklistPropostaId: string, 
    motivo: string = 'Backup automático antes de revisão'
  ) => {
    try {
      console.log('🔄 [PropostaBackup] Criando backup para:', checklistPropostaId);
      
      // Buscar dados atuais da proposta
      const { data: proposta, error: propostaError } = await supabase
        .from('checklist_propostas')
        .select('*')
        .eq('id', checklistPropostaId)
        .single();

      if (propostaError) throw propostaError;

      // Buscar todas as respostas atuais
      const { data: respostas, error: respostasError } = await supabase
        .from('respostas_checklist')
        .select('*')
        .eq('checklist_proposta_id', checklistPropostaId);

      if (respostasError) throw respostasError;

      console.log('📊 [PropostaBackup] Dados para backup:', {
        proposta_id: checklistPropostaId,
        respostas_count: respostas?.length || 0,
        valor_total: proposta.valor_total_estimado
      });

      // Verificar se já existe backup recente (últimas 24h)
      const { data: backupExistente } = await (supabase as any)
        .from('backups_revisoes_propostas')
        .select('id')
        .eq('checklist_proposta_id', checklistPropostaId)
        .gte('data_backup', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (backupExistente) {
        console.log('ℹ️ [PropostaBackup] Backup recente já existe, pulando...');
        return { success: true, backup_id: backupExistente.id };
      }

      // Criar backup
      const { data: backup, error: backupError } = await (supabase as any)
        .from('backups_revisoes_propostas')
        .insert({
          checklist_proposta_id: checklistPropostaId,
          respostas_backup: respostas || [],
          valor_total_backup: proposta.valor_total_estimado || 0,
          forma_pagamento_backup: proposta.forma_pagamento,
          motivo_backup: motivo
        })
        .select()
        .single();

      if (backupError) throw backupError;

      console.log('✅ [PropostaBackup] Backup criado com sucesso:', backup.id);
      return { success: true, backup_id: backup.id };

    } catch (error) {
      console.error('❌ [PropostaBackup] Erro ao criar backup:', error);
      return { success: false, error };
    }
  };

  const restaurarBackupProposta = async (checklistPropostaId: string) => {
    try {
      setLoading(true);
      console.log('🔄 [PropostaBackup] Iniciando restauração para:', checklistPropostaId);

      // Buscar backup mais recente
      const { data: backup, error: backupError } = await (supabase as any)
        .from('backups_revisoes_propostas')
        .select('*')
        .eq('checklist_proposta_id', checklistPropostaId)
        .eq('restored', false)
        .order('data_backup', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (backupError) throw backupError;

      if (!backup) {
        throw new Error('Nenhum backup disponível para restauração');
      }

      console.log('📊 [PropostaBackup] Backup encontrado:', {
        backup_id: backup.id,
        respostas_count: backup.respostas_backup?.length || 0,
        valor_total: backup.valor_total_backup
      });

      // Verificar integridade do backup
      if (!Array.isArray(backup.respostas_backup) || backup.respostas_backup.length === 0) {
        throw new Error('Backup não contém respostas válidas');
      }

      // Remover respostas atuais (podem estar corrompidas)
      const { error: deleteError } = await supabase
        .from('respostas_checklist')
        .delete()
        .eq('checklist_proposta_id', checklistPropostaId);

      if (deleteError) throw deleteError;

      // Restaurar respostas do backup
      const respostasParaRestaura = backup.respostas_backup.map((resposta: any) => ({
        checklist_proposta_id: checklistPropostaId,
        item_id: resposta.item_id,
        incluido: resposta.incluido,
        valor_estimado: resposta.valor_estimado || 0,
        ambientes: resposta.ambientes || [],
        observacoes: resposta.observacoes,
        item_extra: resposta.item_extra || false,
        nome_item_extra: resposta.nome_item_extra,
        descricao_item_extra: resposta.descricao_item_extra
      }));

      const { error: insertError } = await supabase
        .from('respostas_checklist')
        .insert(respostasParaRestaura);

      if (insertError) throw insertError;

      // Atualizar dados da proposta
      const { error: updateError } = await supabase
        .from('checklist_propostas')
        .update({
          valor_total_estimado: backup.valor_total_backup,
          forma_pagamento: backup.forma_pagamento_backup
        })
        .eq('id', checklistPropostaId);

      if (updateError) throw updateError;

      // Marcar backup como restaurado
      const { error: markError } = await (supabase as any)
        .from('backups_revisoes_propostas')
        .update({ restored: true })
        .eq('id', backup.id);

      if (markError) throw markError;

      console.log('✅ [PropostaBackup] Restauração concluída com sucesso');
      
      toast({
        title: "Dados Restaurados",
        description: `Proposta restaurada com ${respostasParaRestaura.length} itens do backup de ${new Date(backup.data_backup).toLocaleString('pt-BR')}`,
      });

      return { success: true, backup_id: backup.id, respostas_restauradas: respostasParaRestaura.length };

    } catch (error: any) {
      console.error('❌ [PropostaBackup] Erro na restauração:', error);
      toast({
        title: "Erro na Restauração",
        description: error.message || "Não foi possível restaurar os dados da proposta",
        variant: "destructive",
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const listarBackupsDisponiveis = async (checklistPropostaId: string) => {
    try {
      const { data: backups, error } = await (supabase as any)
        .from('backups_revisoes_propostas')
        .select('*')
        .eq('checklist_proposta_id', checklistPropostaId)
        .order('data_backup', { ascending: false });

      if (error) throw error;

      return { success: true, backups: backups || [] };
    } catch (error) {
      console.error('❌ [PropostaBackup] Erro ao listar backups:', error);
      return { success: false, error, backups: [] };
    }
  };

  return {
    loading,
    criarBackupProposta,
    restaurarBackupProposta,
    listarBackupsDisponiveis
  };
};