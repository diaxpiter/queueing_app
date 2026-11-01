# Fila Virtual · Holy — v0

Fila virtual para restaurantes que não aceitam reservas. O cliente entra na fila
pelo celular, sai para dar uma volta e recebe um aviso no WhatsApp antes da mesa.
A equipe usa um painel num iPad na porta para avisar, sentar e dar baixa nos grupos.

Esta é a **versão 0**: serve para testar o fluxo, achar bugs e decidir funcionalidades
antes de mostrar a um cliente. Nasceu do protótipo "Fila Virtual Holy" e dos mockups
do celular e do iPad. O piloto planeado é a Holy Sandwich Shop (Porto).

> **O que a v0 NÃO tem:** servidor, base de dados e WhatsApp de verdade. Tudo roda no
> navegador. Veja [Limitações](#limitações-da-v0) e o [backlog](#backlog).

## Como rodar

Requisitos: Node 22+ e npm.

```bash
npm install
npm run dev          # http://localhost:5173
```

| Comando             | O que faz                                              |
| ------------------- | ------------------------------------------------------ |
| `npm run dev`       | Servidor de desenvolvimento                            |
| `npm run dev:host`  | Idem, acessível na rede (para abrir no celular)        |
| `npm test`          | Testes das regras de negócio (Vitest)                  |
| `npm run lint`      | Lint (oxlint)                                          |
| `npm run typecheck` | Verificação de tipos                                   |
| `npm run build`     | Build de produção em `dist/`                           |

## Telas

| Rota                    | Quem usa | O que é                                                        |
| ----------------------- | -------- | -------------------------------------------------------------- |
| `/`                     | todos    | Início com atalhos                                             |
| `/demo`                 | vendas   | Celular e iPad lado a lado, sincronizados. É o que mostramos a um cliente |
| `/fila`                 | cliente  | Entrar na fila (nome, pessoas, WhatsApp, idioma)               |
| `/fila/:code`           | cliente  | Ticket: posição, espera, "por que alguns entram antes", sair   |
| `/fila/:code/mensagens` | cliente  | Mensagens de WhatsApp recebidas (simuladas)                    |
| `/fila/:code/pedido`    | cliente  | Pedido antecipado, sem cobrança (Fase 3)                       |
| `/porta`                | equipe   | Painel do iPad: fila, salão, próximo encaixe sugerido          |

`/fila?new` ignora a vaga guardada neste aparelho e abre o formulário de novo, útil
para testar vários clientes no mesmo navegador.

### Roteiro de teste (5 minutos)

1. Abra `/demo`. À esquerda o celular, à direita o iPad da porta.
2. No celular, entre na fila (nome, 4 pessoas, um número qualquer de 9 dígitos).
3. No iPad, o novo grupo aparece no fim da fila. No celular, abra **Mensagens**.
4. No iPad, leve a **Mesa 1** até "livre" (Conta → Saiu → Pronta). O painel avisa que
   ela serve só 2 e não atende a Sophie (grupo de 5): é a avaliação de 1 estrela, resolvida na porta.
5. Clique em **Sentar** no Tiago (2). Para ver o que a Sophie vê no celular, abra `/fila/SOPH`: a explicação passa a dizer que uma mesa foi para um grupo menor. (Os grupos do cenário de demonstração têm os códigos SOPH, TIAG, MARI, KIAR, ANAA e HELE.)
6. Em **Avisar**, a mesa livre é guardada por 5 min e o celular mostra "Mesa pronta".
7. Use **+10 min**, **Reiniciar demo** e **Salão vazio** (rodapé do painel) para repetir cenários.

## Stack

- **Vite 8 + React 19 + TypeScript**
- **Tailwind CSS v4** (tokens do tema Holy em `src/index.css`)
- **shadcn/ui** (estilo new-york) sobre Radix. Os componentes de `src/components/ui/`
  foram escritos à mão no mesmo formato; o `components.json` já está configurado, então
  `npx shadcn@latest add <componente>` funciona e herda o tema.
- **React Router** para as rotas
- **Vitest** para as regras de negócio

## Estrutura

```
src/
  domain/      Regras puras, sem React nem navegador (a parte que vai para o servidor)
    types.ts       Modelo: Group, Table, Message, QueueState
    tableModel.ts  Previsão de mesas ("probabilidade de vagar até HH:MM")
    queue.ts       Espera estimada, ordem da fila, justiça, estatísticas
    actions.ts     Mudanças de estado (entrar, avisar, sentar, não veio, ...)
    domain.test.ts Testes
  data/        Onde o estado vive
    store.ts       localStorage + sincronização entre abas (única porta de escrita)
    api.ts         Funções que a interface chama (futuras chamadas ao backend)
    seed.ts        Cenário de demonstração = mockup do iPad
  features/
    customer/  Telas do celular
    door/      Painel do iPad
    home/      Início e /demo
  i18n/        Textos do cliente em PT/EN/ES/FR e mensagens de WhatsApp
  components/ui/  Componentes shadcn
```

Regra de ouro: **a interface só chama `api.*`, e `api.*` só chama `commit()` com funções
de `domain/actions.ts`.** Para ligar um backend, troque `data/store.ts` e `data/api.ts`;
as regras e as telas ficam como estão.

## Regras de negócio (e o que é suposição)

Tudo abaixo vem do protótipo. Os números **não são dados da casa**: precisam de calibração.

- **Ordem da fila**: por hora de chegada. Um grupo só passa à frente de outro se não
  couber na mesa que vagou. Quem passou à frente é registado e vira a explicação
  "Por que alguns entram antes" no celular de quem ficou.
- **Onde senta**: na mesa guardada para o grupo; senão, na menor mesa livre em que cabe,
  desde que ninguém à frente também caiba nela. Se não houver, o botão **Sentar** fica
  desativado e o motivo aparece ao passar o rato.
- **Espera estimada**: simula a fila em ordem. Cada grupo pega a mesa em que cabe e que
  vaga primeiro, e essa mesa só volta a vagar após mais um ciclo típico.
- **Tempo típico de uma mesa**: 1–2 lugares 45 min, 3–4 lugares 55 min, 5 lugares 65 min,
  balcão 35 min.
- **Probabilidade de vagar** (mesa ocupada): `p = 95·r² / (r² + 0,55)`, com `r = tempo decorrido / tempo típico`,
  limitada a 4–93%. Conta pedida = 88%, a limpar = 82%. Janela: agora + 15 min.
- **Avisos**: "faltam ~10 min" sai sozinho quando a espera estimada chega a 10 min.
  "Mesa pronta" sai ao clicar **Avisar** e guarda uma mesa livre por 5 min; se o tempo
  acabar, a mesa é solta.
- **Trava de justiça**: hoje é só uma marca (espera ≥ 40 min). A regra não está definida.
- **Idioma**: escolhido ao entrar na fila; define as mensagens e a tela do cliente.

## Limitações da v0

- **Sem servidor.** O estado fica no `localStorage`. Celular e iPad só sincronizam se
  forem abas/iframes **do mesmo navegador** (por isso a página `/demo`). Duas pessoas em
  computadores diferentes não veem a mesma fila.
- **WhatsApp simulado.** As mensagens aparecem na tela "Mensagens"; nada é enviado.
- **Pedido sem preço.** O cardápio tem só os nomes; faltam preços e ligação à cozinha/caixa.
- **Cliente "dono" do aparelho.** O código da vaga fica no `localStorage`; sem login.
- **Painel da porta só em português.**
- **Sem autenticação.** Qualquer pessoa com o link abre `/porta`.

## Backlog

Marcado como `[ ]` o que falta. Fiquem à vontade para abrir issues a partir daqui.

**Para chegar a um piloto**
- [ ] Backend com estado partilhado em tempo real (ex.: Node + WebSocket/SSE, ou Supabase). Esta é a maior lacuna
- [ ] WhatsApp Business API com modelos de mensagem aprovados (PT/EN/ES/FR)
- [ ] Login da equipe para `/porta` e separação por restaurante (multi-tenant)
- [ ] Cardápio e preços reais; envio do pedido à cozinha quando a mesa está pronta
- [ ] Medir o tempo real de cada mesa e trocar o modelo de probabilidade por estatística

**Regras para fechar com a Holy**
- [ ] Definir a "trava de justiça" (a partir de quantos minutos, e o que impede)
- [ ] Quantas mesas, de que tamanho, e como juntar mesas para grupos maiores
- [ ] Avisar um grupo quando ainda não há mesa para ele: hoje é permitido, e o cliente vê "Mesa pronta" sem mesa guardada
- [ ] Permitir que a equipe ignore a ordem da fila (hoje o botão Sentar fica bloqueado)
- [ ] Grupos de 7 ou mais pessoas (hoje "6+" conta como 6)

**Qualidade**
- [ ] Testes de interface (Playwright) para o fluxo cliente → porta
- [ ] CI (lint + testes + build) no GitHub Actions
- [ ] Acessibilidade do painel do iPad (foco e leitor de ecrã)

## Deploy

É um site estático. `npm run build` gera `dist/`. Já há configuração de rotas para
Vercel (`vercel.json`) e Netlify/Cloudflare Pages (`public/_redirects`).
