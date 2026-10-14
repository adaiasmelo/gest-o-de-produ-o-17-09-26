# Guia Completo: Subir para o GitHub & Rodar com Supabase

Este guia contém o passo a passo exato para você subir o código no **GitHub** e conectar com o **Supabase (PostgreSQL)**, eliminando qualquer limite de leituras diárias e garantindo que todos os aparelhos (computadores, celulares e tablets) mostrem exatamente as mesmas informações em tempo real.

---

## 1. Criar o Projeto no Supabase (Gratuito)

1. Acesse **[supabase.com](https://supabase.com)** e faça login ou crie uma conta gratuita.
2. Clique no botão **"New Project"** (Novo Projeto).
3. Preencha os dados:
   - **Name:** `gestao-producao` (ou o nome de sua preferência)
   - **Database Password:** Crie uma senha segura e anote.
   - **Region:** Escolha `São Paulo (sa-east-1)` para menor latência no Brasil.
4. Clique em **"Create new project"** e aguarde cerca de 1 a 2 minutos para o provisionamento.

---

## 2. Executar o Script SQL no Supabase

O projeto já contém o arquivo **`supabase-schema.sql`** pronto com todas as 21 tabelas, índices de alta performance, permissões de segurança (RLS) e sincronização Realtime.

1. No menu lateral esquerdo do painel do Supabase, clique em **SQL Editor** (ícone `>_`).
2. Clique no botão **+ New Query** (Nova Consulta).
3. Abra o arquivo `supabase-schema.sql` deste projeto, copie todo o conteúdo e cole no SQL Editor do Supabase.
   *(Você também pode clicar no botão "Copiar Script SQL Completo" direto dentro do sistema no modal "Supabase & Nuvem").*
4. Clique no botão verde **RUN** (ou pressione `Ctrl + Enter`).
5. A mensagem **"Success. No rows returned"** confirmará que todas as tabelas e políticas de tempo real foram criadas com sucesso!

---

## 3. Obter as Chaves de Acesso do Supabase

1. No painel do Supabase, vá em **Project Settings** (ícone de engrenagem no canto inferior esquerdo) $\rightarrow$ **API**.
2. Copie os seguintes dados:
   - **Project URL:** Exemplo: `https://abcdefghijk.supabase.co`
   - **Project API Keys $\rightarrow$ anon / public:** Exemplo: `eyJhbGciOiJIUzI1NiIsInR5cCI...`

---

## 4. Configurar as Variáveis no Projeto

Você tem duas formas muito práticas de conectar:

### Opção A: Direto pelo Sistema (Sem precisar compilar)
Abra o sistema, clique no botão **"Supabase & Nuvem"** na barra superior, cole a **Project URL** e a **Anon Public Key** e clique em **Salvar e Ativar**. O sistema conectará imediatamente!

### Opção B: Via arquivo `.env` (Para GitHub / Vercel / Netlify / Produção)
Crie um arquivo `.env` na raiz do projeto com o conteúdo:
```env
VITE_SUPABASE_URL=https://abcdefghijk.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

---

## 5. Como Subir o Código no GitHub

Abra o terminal na pasta do projeto e execute os comandos abaixo:

```bash
# 1. Inicie o repositório Git caso ainda não tenha iniciado
git init

# 2. Adicione todos os arquivos do projeto
git add .

# 3. Crie o primeiro commit com as alterações
git commit -m "feat: Integracao completa com Supabase e Gestao de Producao"

# 4. Defina a branch principal como main
git branch -M main

# 5. Conecte com o seu repositório no GitHub
# (Substitua SEU_USUARIO e SEU_REPOSITORIO pelo link que você criou no github.com)
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git

# 6. Envie o código para o GitHub
git push -u origin main
```

---

## 6. Como Fazer o Deploy (Vercel ou Netlify)

1. Acesse **[vercel.com](https://vercel.com)** ou **[netlify.com](https://netlify.com)** e conecte sua conta do GitHub.
2. Selecione o repositório que você acabou de subir.
3. Na seção **Environment Variables** (Variáveis de Ambiente), adicione:
   - `VITE_SUPABASE_URL` = sua URL do Supabase
   - `VITE_SUPABASE_ANON_KEY` = sua chave anônima do Supabase
4. Clique em **Deploy**.
5. Em menos de 2 minutos seu sistema estará no ar, acessível pelo celular, computador ou tablet de qualquer operador!

---

## 7. Como Migrar Todos os Dados Existentes para o Supabase

Para que o Supabase receba todos os lançamentos de outubro (incluindo até o dia 13/10 e todos os colaboradores cadastrados):

1. Acesse o sistema.
2. Clique no botão **"Supabase & Nuvem"** (ícone de banco de dados no topo da tela).
3. Vá na aba **3. Enviar Dados Atuais**.
4. Clique em **"Iniciar Envio de Todos os Dados para o Supabase"**.
5. O sistema fará o upload em blocos com barra de progresso em tempo real.

Pronto! Todos os aparelhos agora estarão 100% sincronizados sem risco de esgotar cotas gratuitas.
