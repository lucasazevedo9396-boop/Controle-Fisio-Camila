# Ativar login, registros compartilhados e backup

O código está preparado para Supabase Auth e PostgreSQL com controle de acesso por consultório (RLS). A ativação ainda requer um projeto real, duas contas e uma nova publicação no Netlify. A versão antiga publicada manualmente não recebe atualizações do GitHub automaticamente.

## 1. Criar o projeto Supabase

Entre em https://supabase.com/dashboard e crie um projeto. Escolha uma região próxima de vocês e defina uma senha forte para o banco, guardada em um gerenciador de senhas. Não envie essa senha no chat nem coloque no GitHub. Aguarde o projeto terminar de iniciar.

No SQL Editor, execute o conteúdo completo de [supabase/schema.sql](supabase/schema.sql) uma única vez. Depois execute [supabase/upgrade-pilates-progress.sql](supabase/upgrade-pilates-progress.sql) para adicionar modalidades e evolução no cadastro. Se houver erro, não continue: cada script é transacional e só confirma quando suas alterações tiverem sido concluídas.

## 2. Criar e vincular as duas contas

Em Authentication → Users, crie as duas contas por email. Vocês terão contas individuais, ambas com acesso completo. Desative novos cadastros públicos nas configurações de autenticação; o aplicativo não oferece cadastro aberto.

Opções de criação: convite por email, depois de configurar o envio; ou criação administrativa com senha inicial forte, escolhida fora do chat. Contas precisam estar confirmadas para entrar. Para convites e recuperação funcionarem com usuários reais, configure um provedor SMTP no Supabase; o envio padrão possui restrições e não deve ser assumido como pronto para produção.

No SQL Editor, copie [supabase/link-users.sql](supabase/link-users.sql), substitua `EMAIL_DA_CAMILA` e `SEU_EMAIL` pelos emails exatos das duas contas e execute uma vez. Isso cria um consultório e associa as duas contas com acesso completo. Não coloque senhas no SQL.

Em Authentication → URL Configuration, configure Site URL como `https://strong-nougat-f73995.netlify.app` e permita o redirecionamento para `https://strong-nougat-f73995.netlify.app/`. Atualize esses endereços caso o domínio do site mude. Links de convite/recuperação devem ser abertos no mesmo site publicado; o aplicativo permite definir a nova senha.

## 3. Conectar o Netlify ao GitHub

No projeto atual do Netlify, procure Project configuration → Build & deploy → Continuous deployment → Link repository. Conecte `lucasazevedo9396-boop/Controle-Fisio-Camila`, branch `main`. Se a interface não oferecer essa opção, importe o repositório como novo projeto; o endereço será outro e deve ser atualizado no Supabase.

Configuração de build:

- Comando: `npm run build`.
- Diretório publicado: `dist`.
- O arquivo `netlify.toml` já fornece esses dois valores.

Em Project configuration → Environment variables, adicione os valores públicos encontrados nas configurações de API do projeto Supabase:

- `SUPABASE_URL`: Project URL, no formato `https://SEU-PROJETO.supabase.co`.
- `SUPABASE_PUBLISHABLE_KEY`: chave **publishable**, ou a chave legada **anon**.

Esses valores identificam o projeto no navegador. Não use `secret`, `service_role`, senha do banco ou token de administração: essas credenciais dão privilégios que não podem ser publicados. O build recusa chaves privilegiadas reconhecidas.

Publique novamente a última revisão do GitHub. Variáveis adicionadas ao Netlify só entram no site após um novo build. Se nenhuma variável estiver configurada, o build mantém a demonstração local; se apenas uma estiver configurada, ele falha para evitar uma configuração incompleta.

## 4. Confirmar o funcionamento antes de usar pacientes reais

Abra o site fora da prévia do Netlify. Ele deve mostrar **Entrar**, sem dados clínicos visíveis. Entre com a primeira conta e cadastre um paciente fictício com atendimento, pagamento e evolução. No outro aparelho, entre com a segunda conta e toque em **Atualizar registros**: os mesmos registros devem aparecer, inclusive a evolução. A tela também atualiza a cada 30 segundos enquanto estiver aberta e sem formulário ativo.

Confirme que uma edição feita no segundo aparelho aparece no primeiro. Saia e verifique que os registros não aparecem sem login. O modo compartilhado não guarda dados clínicos nem tokens em localStorage. Uma recarga completa solicita login novamente; após 15 minutos sem atividade a tela é bloqueada. A demonstração local antiga permanece separada e não é importada automaticamente para o banco.

Teste **Esqueci minha senha** após configurar SMTP, confirme o recebimento, abra o link e defina uma senha de pelo menos 12 caracteres. Nunca envie senhas ou links de recuperação no chat.

## 5. Backup e restauração

O botão **Baixar backup protegido** exporta pacientes, atendimentos e evoluções num arquivo cifrado com AES-256-GCM, usando uma senha de pelo menos 12 caracteres. Guarde o arquivo e a senha separadamente. Esquecer a senha impede a recuperação. O backup não inclui senhas de login nem tokens. Esse backup é **manual**: estabeleça uma rotina, por exemplo ao final de cada dia de atendimento, e guarde uma cópia em armazenamento privado externo.

**Restaurar backup** aceita arquivos de até 10 MB pertencentes ao mesmo consultório. Insere somente registros ausentes; não sobrescreve registros atuais. Toda a importação no banco é uma transação: um erro impede uma restauração parcial. Não é possível importar backups da demonstração local nesse fluxo. A recuperação para um projeto novo ou de registros sobrescritos exige um procedimento administrativo separado.

Além do arquivo manual, configure backups gerenciados do banco nas opções de Database → Backups do Supabase. Disponibilidade, retenção e recuperação para um instante específico dependem do plano contratado. Confirme essas opções no seu projeto: este código não ativa backups automáticos do provedor. Antes do uso real, valide uma exportação e uma restauração com registros fictícios e defina a política de cópias do banco.

## Validação já realizada no ambiente de desenvolvimento

- Testes Node: valores financeiros, backup com senha, rejeição de arquivos alterados, conflitos de edição, conta sem vínculo e rejeição de chaves privilegiadas no build.
- PostgreSQL 17 local: criação do schema; negação a anônimos; isolamento de consultórios; duas contas com acesso completo; restrição de assistente; incrementos de versão; exportação; restauração sem duplicatas e reversão em caso de erro.
- Interface Chromium móvel com serviço simulado: login, compartilhamento entre dois contextos, conflito de evolução, backup cifrado, saída e ausência de cache clínico.

Esses testes não substituem a validação no Supabase real e no iPhone depois da configuração. A hospedagem, o banco real, o envio de emails e os backups do provedor ainda não foram ativados por este ambiente.
