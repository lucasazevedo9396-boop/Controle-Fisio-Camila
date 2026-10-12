# Publicar a demonstração para testar no iPhone

1. Entre em sua conta no Netlify em https://app.netlify.com/ . Escolha adicionar um novo projeto e importar um repositório existente do GitHub.
2. Autorize o acesso ao repositório `lucasazevedo9396-boop/Controle-Fisio-Camila`. Selecione a branch `main`, deixe o comando de build vazio e use `public` como diretório de publicação. O arquivo `netlify.toml` já contém essa configuração. Confirme a publicação.
3. Quando a publicação terminar, o Netlify mostrará o endereço HTTPS do site. Abra esse endereço no Safari do iPhone.
4. Cadastre um paciente fictício, registre uma sessão de R$ 120,50, preencha a evolução e marque o pagamento. Recarregue a página e confira se os registros continuam disponíveis.
5. No Safari, toque em Compartilhar → Adicionar à Tela de Início. Abra pelo novo ícone e confira o funcionamento.

Não há conta de hospedagem conectada a este ambiente; o site não foi publicado automaticamente. A conexão do GitHub com a sua conta do Netlify é necessária para obter o link.

Os dados ficam apenas no navegador em que foram criados. Abrir o mesmo link em dois celulares não compartilha os registros. Esta demonstração ainda não tem login ou backup: use dados fictícios. Apagar os dados do Safari pode apagar os registros. Esta versão precisa de conexão para carregar.

Validação realizada: dois testes financeiros e teste de interface em Chromium com tela móvel 390×844, incluindo cadastro, atendimento, evolução, pagamento, persistência após recarga e ausência de rolagem horizontal. Não foi realizado teste em Safari/iPhone físico; o download do WebKit de teste foi bloqueado pela política de rede.

Alternativa no computador: baixe o repositório pelo GitHub em Code → Download ZIP, extraia e envie somente a pasta `public` em https://app.netlify.com/drop . Para recriar um pacote contendo somente os arquivos do site, execute `npm run package` na raiz do projeto; o ZIP será gerado em `artifacts/camila-fisio-demo.zip` (não versionado).
