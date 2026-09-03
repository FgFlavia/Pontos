# 📄 SPEC PRINCIPAL: Sistema de Controle de Ponto e Antifraude

## 🎯 Objetivo do Projeto
Desenvolver um sistema web para registro de ponto (entrada e saída) de funcionários com mecanismo antifraude integrado, geração de ticket comprovante com código de verificação hash e interface otimizada exclusivamente para uso em tablets e desktops.

---

## 🤖 INSTRUÇÕES CRÍTICAS PARA O AGENTE DE IA (Google Jules)
1. **Dúvidas e Ambiguidade:** NÃO inicie a codificação se houver qualquer dúvida ou ambiguidade nos requisitos. Solicite esclarecimentos primeiro.
2. **Decomposição de Tarefas:** Sempre divida demandas de desenvolvimento extensas em tarefas e subtarefas incrementais.
3. **Registro de Progresso:** É OBRIGATÓRIO criar e manter atualizado um arquivo `backlog.md` na raiz do repositório, registrando todas as funcionalidades implementadas, ajustadas, alteradas ou pendentes a cada etapa desenvolvida.
4. **Respeito à Stack:** NUNCA utilize Node.js, NPM, ferramentas de build (Vite, Webpack) ou gerenciadores de pacotes. Toda e qualquer biblioteca externa deve ser carregada obrigatoriamente via **CDN (ES Modules / Script Tag)**.

---

## 🛠️ Stack Tecnológica & Dependências

### Stack Base:
- **Agente de IA:** Google Jules 
- **Hospedagem / Repositório:** GitHub (GitHub Pages para hospedagem estática)
- **Banco de Dados & Backend REST API:** Supabase (PostgREST + JS Client)
- **Frontend:** W3C Padrão — HTML5, CSS3 puro, JavaScript Vanilla (ES6+)

### Bibliotecas Externas (Carregadas estritamente via CDN):
Para redução de código boilerplate, prevenção de erros e melhoria na UI/UX, utilize apenas:
1. `@supabase/supabase-js` (v2 via CDN): Cliente oficial para comunicação com a API do Supabase.
2. `lucide` / `lucide-static`: Biblioteca de ícones SVG limpos (substitui qualquer uso de emojis).
3. `canvas-confetti` (via CDN): Feedback visual discreto de sucesso no registro.
4. `html5-qrcode` (via CDN): Para eventual leitura rápida do ID do funcionário via QRCode no tablet (opcional/expansão).
5. `js-sha256` (via CDN): Para geração determinística do hash de verificação antifraude no client-side.

---

## 🎨 Especificações de UI / UX
- **Target Device:** Exclusivo para Tablets (modo kiosk/horizontal) e Desktops.
- **Estilo:** Design limpo, minimalista, fundo branco (`#FFFFFF`), tons neutros e acentuadores em alto contraste para legibilidade.
- **Elementos de Interface:**
  - Sem emojis. Usar exclusivamente ícones da biblioteca **Lucide**.
  - Tipografia legível e botões com áreas de toque amplas (otimizado para telas sensíveis ao toque de tablets).
  - Componente de relógio em tempo real exibindo Data e Hora exatas sincronizadas.
  - Teclado numérico na tela para digitação fácil de ID/Matrícula do funcionário no tablet.
  - Modal/Visualizador de Ticket Comprovante pós-registro com opção de impressão (CSS `@media print`).

---

## 🔒 Estratégia Antifraude e Autenticação

### 1. Identificação:
- O funcionário insere o **ID / Matrícula** ou **CPF** no terminal.

### 2. Validação Temporal e Sequencial:
- O sistema consulta a API do Supabase para verificar o último registro do funcionário.
- Impede registros duplicados em intervalo inferior a 2 minutos.
- Controla a alternância lógica de status: se o último foi `ENTRADA`, o próximo deve ser `SAIDA` (com opção de visualização de alerta em caso de divergência).

### 3. Hash de Autenticidade (Ticket Digital):
- Ao registrar a entrada ou saída, o sistema gera uma string contendo:
  `[Matricula] + [Tipo: ENTRADA/SAIDA] + [Timestamp ISO] + [Salt/Secret do Sistema]`
- A biblioteca `js-sha256` gera um hash SHA-256 de 64 caracteres.
- Os primeiros 12 caracteres desse hash são gravados no banco de dados e impressos no **Ticket Comprovante**.

---

## 📋 Histórias de Usuário & Regras de Negócio

### História 1: Registro de Entrada/Saída
- **Como** Funcionário,
- **Quero** digitar meu ID/Matrícula na tela do tablet ao chegar ou sair da empresa,
- **Para que** meu horário seja registrado com precisão e eu receba um comprovante com código de autenticidade.

### Tratamento de Exceções e Fraudes:
1. **Faltas / Atrasos / Saídas Antecipadas:**
   - O sistema registra o timestamp exato (`data_hora`) retornado pelo servidor Supabase (evitando adulteração do relógio do cliente/tablet).
   - As regras de tolerância de horário e cálculo de horas extras/atrasos serão processadas via queries/views analíticas no Supabase.
2. **Tentativa de Fraude por Repetição de Registro:**
   - O sistema bloqueia requisições consecutivas com a mesma matrícula em um tempo inferior a 120 segundos.
