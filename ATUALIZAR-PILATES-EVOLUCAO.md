# Atualizar o aplicativo existente

Antes de publicar o código novo, execute a atualização do banco. Não execute `schema.sql` nem `link-users.sql` novamente: seu consultório e seus dois logins já existem.

1. No Supabase, abra SQL Editor e clique em **+** para uma consulta nova.
2. Copie o conteúdo completo de [supabase/upgrade-pilates-progress.sql](supabase/upgrade-pilates-progress.sql), cole e clique em Run.
3. O resultado esperado é **Success. No rows returned**. Se houver erro, envie a mensagem antes de prosseguir. O script inteiro é transacional e preserva os registros existentes.
4. Depois dessa confirmação, publique o código atualizado no Netlify pelo GitHub. As duas variáveis do Supabase continuam as mesmas. O comando permanece `npm run build`, e a pasta publicada é `dist`.

## Funcionalidades da nova versão

- Cada atendimento tem modalidade **Fisioterapia** ou **Pilates**. O filtro de modalidade funciona no resumo, na lista e no financeiro. Pacientes podem ter atendimentos nas duas modalidades.
- Os atendimentos antigos começam classificados como Fisioterapia. Use **Alterar modalidade** para corrigir os que eram Pilates.
- **Excluir** pede confirmação com nome, data, valor e status. O atendimento sai das listas, dos totais e do gráfico; o banco mantém o registro excluído e as notas. A exclusão não apaga o paciente nem suas evoluções independentes. Não há botão de desfazer nesta versão. Backups não reativam registros já marcados como excluídos.
- **Novo paciente** permite registrar a evolução inicial e uma nota opcional. No perfil, **Registrar evolução** adiciona novas entradas com data e observações, sem exigir um atendimento financeiro.
- **Ver histórico e evolução** mostra gráfico e registros do cadastro, além das fichas por atendimento. Nas fichas de atendimento também há uma nota opcional.
- Escala do gráfico: **0 = pior condição funcional; 10 = melhor condição funcional**. Deixe em branco quando não tiver uma nota. Não é escala de dor nem cálculo automático: a profissional deve usar o mesmo critério ao longo do acompanhamento. O gráfico mostra os últimos 12 registros com nota, em ordem cronológica; a lista mantém as evoluções completas.
- O backup protegido continua funcionando e inclui modalidade, exclusões e novas evoluções. Arquivos antigos continuam aceitos, sem inventar notas para registros anteriores.

## Verificar depois da publicação

Com um paciente fictício, registre uma evolução inicial com nota 0 e outra com nota 8. Confira o gráfico e a visualização na segunda conta. Crie um atendimento de cada modalidade e teste o filtro e os totais. Exclua um atendimento fictício, confirme que saiu do financeiro e que as evoluções independentes do paciente permanecem. Exporte um backup protegido.

Validação de desenvolvimento: testes Node, interface Chromium em tela móvel, dois logins com API simulada e PostgreSQL 17 local com RLS, atualização repetível, preservação de registros, cadastro atômico e backup. A atualização no Supabase real depende da execução do script acima.
