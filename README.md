# Camila · Fisioterapia

Para adicionar Pilates, exclusão de atendimentos, evolução no cadastro e gráfico de 0 a 10 ao banco existente, siga [ATUALIZAR-PILATES-EVOLUCAO.md](ATUALIZAR-PILATES-EVOLUCAO.md). Instalações novas também devem executar `supabase/upgrade-pilates-progress.sql` após `schema.sql`.

Para gerar um endereço HTTPS e testar no iPhone, siga [TESTAR-NO-IPHONE.md](TESTAR-NO-IPHONE.md). Execute `npm run package` para criar o ZIP para publicação manual no Netlify. A configuração `netlify.toml` também permite publicar a pasta `public` a partir deste repositório quando ele estiver conectado à hospedagem.

Aplicativo responsivo para Safari no iPhone e computadores. Cadastro de pacientes, atendimentos com valor individual, pagamento, resumo por mês da sessão, evolução clínica e backup protegido por senha. Sem bibliotecas externas. Para login e registros compartilhados, siga [ATIVAR-LOGIN.md](ATIVAR-LOGIN.md).

## Executar

Requer Node.js 20 ou superior. Na pasta do projeto, execute `npm test` e `npm start` para demonstração local. Para o modo compartilhado, configure `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`, execute `npm run build` e inicie com `SERVE_DIST=1 npm start`. O servidor usa a porta 3000, ou a variável PORT. O Netlify deve publicar `dist` após `npm run build`.

## Limites desta versão

Sem configuração do Supabase, os dados ficam no localStorage e não são compartilhados: use apenas dados fictícios. No modo compartilhado, o banco aplica permissões por consultório e papel; as duas contas solicitadas são vinculadas com acesso completo. Recarregar exige login novamente. Não há operação offline nem importação automática da demonstração. O resumo financeiro agrupa pelo mês do atendimento, e não pela data em que o pagamento foi recebido.

O arquivo de backup é manual e cifrado; configure também backups gerenciados no plano do Supabase escolhido. A restauração no app recupera registros ausentes do mesmo consultório, sem sobrescrever registros atuais. Antes do uso real, conclua e valide a configuração, a recuperação de senha e a rotina de backup.

Para disponibilizar no iPhone, hospede o aplicativo com HTTPS. No Safari, use Compartilhar → Adicionar à Tela de Início. A instalação e o comportamento no iPhone físico ainda precisam ser validados. Esta versão não oferece funcionamento offline.

A ficha inicial contém queixa, avaliação, procedimentos, resposta ao tratamento e plano/orientações. A fisioterapeuta deve revisar a adequação clínica do modelo antes do uso real.
