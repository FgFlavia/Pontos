# Backlog do Projeto - Sistema de Controle de Ponto e Antifraude

## 📌 Status Geral
Este documento registra o acompanhamento das funcionalidades implementadas, ajustadas, alteradas e pendentes no sistema de Ponto Eletrônico e Antifraude para Tablets/Desktops.

---

## 🚀 Funcionalidades Implementadas

### Phase 1: Documentação & Banco de Dados (Supabase)
- [x] Criação do arquivo `backlog.md` para acompanhamento contínuo do projeto.
- [x] Criação do script SQL de definição do banco de dados (`schema.sql`):
  - Tabela `funcionarios` (ID/Matrícula, CPF, Nome, Cargo, Ativo, Data Criação).
  - Tabela `registros_ponto` (ID, Matricula, Tipo, Data/Hora Servidor, Hash Autenticação, Origem).
  - Índices para otimização de consultas por matrícula e data/hora.
  - Regras RLS (Row Level Security) para leitura e escrita segura no Supabase.
  - View analítica `vw_espelho_ponto` para cálculo de horas e tolerância.

### Phase 2: Interface Frontend (Tablet/Desktop Kiosk UI)
- [x] Layout responsivo HTML5/CSS3 puro otimizado para tablets na horizontal (Kiosk) e desktops.
- [x] Paleta de cores minimalista (Fundo `#FFFFFF`, tons neutros e acentuadores de alto contraste).
- [x] Ausência de emojis — uso exclusivo de ícones SVG via biblioteca Lucide.
- [x] Relógio e calendário digital em tempo real.
- [x] Teclado numérico virtual na tela com botões táteis amplos.
- [x] Suporte a leitura de QR Code via câmera do tablet (usando `html5-qrcode`).
- [x] Modal de comprovante impresso (Ticket Digital com CSS `@media print`).

### Phase 3: Lógica Antifraude e Integrações Client-Side
- [x] Integração via CDN com `@supabase/supabase-js` v2.
- [x] Módulo local de backup/demo (Fallback localStorage quando sem conexão Supabase).
- [x] Bloqueio antifraude temporal: impede novos registros na mesma matrícula em menos de 120 segundos (2 minutos).
- [x] Alternância automática de status (`ENTRADA` / `SAIDA`) com base no último registro.
- [x] Alerta visual quando o usuário seleciona um tipo divergente da sequência lógica esperada.
- [x] Hash SHA-256 antifraude determinístico via `js-sha256`:
  - Formato: `[Matricula] + [Tipo] + [Timestamp ISO] + [Salt]`
  - Extração dos primeiros 12 caracteres gravados no banco e exibidos no ticket.
- [x] Feedback visual de sucesso com animação de confetes via `canvas-confetti`.

---

## ⏳ Pendências / Próximos Passos (Melhorias Futuras)
- [ ] Integração com reconhecimento facial biométrico (expansão futura).
- [ ] Módulo administrativo de fechamento de folha de ponto.
