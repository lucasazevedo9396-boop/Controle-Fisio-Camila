# Camila · Fisioterapia

Para gerar um endereço HTTPS e testar no iPhone, siga [TESTAR-NO-IPHONE.md](TESTAR-NO-IPHONE.md). Execute `npm run package` para criar o ZIP para publicação manual no Netlify. A configuração `netlify.toml` também permite publicar a pasta `public` a partir deste repositório quando ele estiver conectado à hospedagem.

Primeira versão de demonstração, responsiva para Safari no iPhone e computadores. Cadastro de pacientes, atendimentos com valor individual, registro de pagamento, resumo por mês do atendimento e evolução clínica com cinco campos. Sem dependências externas.

## Executar

Requer Node.js 20 ou superior. Na pasta do projeto, execute `npm test` e `npm start`. O servidor usa a porta 3000, ou a variável PORT.

## Limites desta versão

Os dados ficam no localStorage do navegador. Não há autenticação, sincronização entre aparelhos, backup, auditoria ou controle de permissões. Use somente dados fictícios nesta demonstração. Login para dois usuários e banco de dados seguro são necessários antes do uso com pacientes reais. O resumo financeiro agrupa pelo mês do atendimento, e não pela data em que o pagamento foi recebido.

Para disponibilizar no iPhone, hospede o aplicativo com HTTPS. No Safari, use Compartilhar → Adicionar à Tela de Início. A instalação e o comportamento no iPhone físico ainda precisam ser validados. Esta versão não oferece funcionamento offline.

A ficha inicial contém queixa, avaliação, procedimentos, resposta ao tratamento e plano/orientações. A fisioterapeuta deve revisar a adequação clínica do modelo antes do uso real.
