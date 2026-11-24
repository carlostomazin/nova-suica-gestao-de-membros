# Cadastro de Membros — Nova Suíça

Aplicação administrativa para acompanhar os cadastros de membros da congregação. A interface tem duas páginas principais: **Visão geral** e **Membros**. Conforme o escopo, a aplicação não implementa login, cadastro de usuários nem permissões próprias; a proteção de acesso deve ser aplicada externamente no deployment.

## Funcionalidades

- Painel com total de membros, ativos, inativos e não revalidados, calculados a partir do banco.
- Listagem alfabética com busca sem distinção entre maiúsculas, minúsculas ou acentos, filtro de situação e paginação.
- Cadastro, edição e exclusão de membros. O código original de uma planilha é mantido no banco e não aparece na listagem.
- Escolha de uma congregação existente ou inclusão de outra. A congregação inicial é **Nova Suíça**.
- Fotos JPG, PNG ou WebP de até 5 MB em bucket privado. A interface recebe URLs assinadas com validade de 10 minutos.
- Importação `.xlsx` em duas etapas: análise, revisão de duplicidades/status e confirmação. O código é a chave preferencial; possíveis duplicidades sem código são ignoradas para revisão manual.
- Quando o formato da planilha permite extrair as imagens incorporadas e associá-las às linhas, as fotos também são importadas. Falhas de associação/salvamento são informadas sem cancelar os demais cadastros.
- Exportação para Excel de todos os membros ou do resultado filtrado. O arquivo tem cabeçalho formatado, larguras, filtro e a coluna **Foto** vazia.

## Supabase e banco de dados

A migração foi aplicada ao projeto Supabase conectado pelo fluxo de integração da v0. A cópia versionada está em [`supabase/migrations/20261123000000_create_members.sql`](supabase/migrations/20261123000000_create_members.sql).

Ela cria:

- `public.members`, com status validado, código externo único, índices de ordenação/busca e timestamps;
- trigger `set_member_updated_at`;
- RLS habilitado, sem acesso de `anon`/`authenticated` à tabela e permissões de CRUD somente para `service_role`;
- bucket privado `member-photos`, com limite de 5 MB e tipos JPG, PNG e WebP.

Para uma instalação em outro projeto Supabase, aplique essa migração uma única vez pelo fluxo de migrações da integração. Não publique a chave de serviço no navegador.

## Variáveis de ambiente

A integração Supabase conectada à v0/Vercel fornece as variáveis automaticamente. Para um ambiente independente, use [`.env.example`](.env.example) como referência e configure:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — somente no servidor; nunca use o prefixo `NEXT_PUBLIC_`.

A aplicação também aceita os aliases de chave pública `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_PUBLISHABLE_KEY`, e o alias server-side `SUPABASE_SECRET_KEY`.

## Acesso e segurança

- A aplicação não possui login, cadastro de usuários ou controle de permissões interno.
- **Antes de publicar ou conectar dados reais, proteja o deployment por uma camada externa**, como Vercel Deployment Protection com autenticação organizacional, ou um gateway de identidade equivalente. A proteção deve cobrir as páginas e todas as rotas `/api/*`, tanto em Preview quanto em Production.
- Não compartilhe uma URL de preview desprotegida com dados reais. Para demonstrações públicas, use um projeto Supabase separado com dados fictícios ou anonimizados.
- As operações de banco e armazenamento são feitas apenas no servidor. `SUPABASE_SERVICE_ROLE_KEY` nunca é enviada ao cliente; essa chave ignora RLS, por isso a barreira externa de acesso é obrigatória.
- RLS permanece habilitado na tabela `members`, sem permissões para `anon` e `authenticated`; o bucket de fotos é privado e as imagens são entregues por URLs assinadas temporárias.
- Configure a integração Supabase nos ambientes Development, Preview e Production necessários, mantendo as credenciais exclusivamente nas variáveis do projeto.
- Cabeçalhos de segurança incluem HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` e uma `Permissions-Policy` restritiva.

## Configurar e publicar

1. Conecte a integração Supabase ao projeto v0. A migração e o bucket descritos acima já estão aplicados neste projeto.
2. Garanta que as variáveis da integração estejam configuradas nos ambientes de desenvolvimento, preview e produção. Não copie segredos para o código, para o `.env.example` ou para o repositório.
3. Antes de publicar ou usar dados reais, ative Vercel Deployment Protection com autenticação organizacional para Preview e Production, ou configure um gateway externo equivalente. Confirme que a proteção também intercepta todas as rotas `/api/*`.
4. Use **Publicar** no topo do v0 somente depois de confirmar a proteção externa. Não exponha o deployment diretamente à internet.
5. Acesse o deployment pela camada externa e valide busca, cadastro, importação/exportação e upload de fotos antes de compartilhar com a equipe.

## Desenvolvimento local

Com as variáveis de ambiente do Supabase disponíveis localmente:

```bash
pnpm install
pnpm dev
```

O projeto usa Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase PostgreSQL/Storage, SWR e ExcelJS.
