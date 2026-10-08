# Auditoria redteam e causa raiz — Smart Auto Launcher

Data: 8 de outubro de 2026. Repositório: `hj75apps-lang/remix-of-sweet-moments-journal`.

Base examinada: `d77c264bde6d7d7a33b78def49580477b65c6e5e`, árvore `789d47d5ea508130c95d5169f02b67e6dc56a776`. Os 263 arquivos da árvore foram materializados e conferidos pelo SHA de cada blob. As correções estão no [PR #9](https://github.com/hj75apps-lang/remix-of-sweet-moments-journal/pull/9), com commits adicionais, sem reescrever histórico.

## Resultado e alcance

A revisão encontrou falhas concretas de dados, ciclo de vida e integração, além de dependências com avisos de segurança. As correções mantêm os widgets, o player global, a edição da Home e as integrações nativas. A previsão conserva hoje em destaque e os cinco dias seguintes. Não houve publicação de Site, mudança de visibilidade ou certificação de comportamento em uma central real.

| Área | Revisão realizada | Limite da evidência |
|---|---|---|
| Home e rotas | Todas as rotas, shell/Dock, registro, drag/drop, tamanhos, persistência e importação em ambiente servidor | Sem inspeção visual no Lovable ou navegador publicado |
| Clima | API, validação, cache/migração, localização, símbolos, expansão e cinco dias futuros | Respostas simuladas; sem comparação com a imagem ausente |
| Rádio e mídia | Catálogo, busca, descoberta web/nativa, playlists, player/EQ, favoritos, histórico e seleção de mídia | Streams e MediaSession reais dependem da rede e do dispositivo |
| Navegação | GPS compartilhado, notificações, polling, capacidade assinada, OAuth, limites HTTP, deep links e janelas externas | Sem conta Google de produção nem Maps/Waze em hardware |
| Android | Manifesto, Gradle, activity, boot e todos os plugins próprios; APK e teste de inicialização previstos no CI | Emulador não substitui ROM automotiva, telefonia ou faróis |
| Segurança e dependências | Entradas externas, dados persistidos, HTTPS, redirecionamentos, corpos, segredos na árvore atual, lockfile e workflows | Sem acesso a secrets/configuração da implantação ou varredura completa do histórico Git |
| UI compartilhada | Componentes genéricos, tokens, padrões de foco, semântica e regras responsivas por análise estática | Não certifica WCAG, contraste final, LCP ou cobertura percentual de testes |

## Achados corrigidos e causas raiz

P0 indica aviso crítico de dependência. P1 indica falha funcional importante ou fronteira de segurança. P2 indica comportamento incorreto ou degradação localizada. Essas prioridades orientam a correção; não equivalem a uma prova de exploração remota no produto.

| ID | Prioridade | Falha e causa raiz | Correção e regressão |
|---|---|---|---|
| A01 | P1 | Clima incompleto virava temperatura e máxima de 0°C: coerção numérica usava zero como fallback e aceitava dias inválidos | Valores obrigatórios finitos, coordenadas válidas, seis datas reais consecutivas e limites de chuva/umidade; zero real continua válido. Testes de payload parcial e coordenadas |
| A02 | P1 | GPS pontual aceitava posição antiga e deixava assinatura ativa: freshness usava horário de recebimento e replay acontecia antes da atribuição do cleanup | Freshness pelo timestamp do fix, assinatura pontual sem replay antigo e limpeza inclusive em emissão síncrona/timeout. Permissão nativa tardia não reativa GPS após stop |
| A03 | P1 | Viagem criada depois da montagem não iniciava polling; resposta antiga podia interferir na nova viagem | Mudanças de viagem notificam o provider; respostas verificam cancelamento e identidade. Testes com criação posterior e conclusão atrasada |
| A04 | P2 | Duração `12.5s` não era interpretada; métricas reais sem geometria se perdiam; distância da próxima manobra aparecia como distância restante da viagem | Regex corrigida, métricas preservadas sem inventar pontos, números com vírgula e distinção entre manobra e viagem. Testes de transformação |
| A05 | P1 | Objeto mais amplo de viagem salvava `authToken` do Google no sessionStorage por spread | Allowlist de campos, remoção do token legado, validação/expiração e fallback em memória quando escrita falha. A capacidade assinada do próprio launcher ainda é armazenada por sessão e exige proteção normal contra XSS |
| A06 | P1 | POST de viagem confiava em Content-Length, podia ler corpo ilimitado e aceitava entradas de tipos incorretos | Limite real de 4.096 bytes, timeout, cancelamento, JSON/entrada inválidos em 400, excesso em 413 e origem de navegador verificada. Testes sem header, header enganoso e stream lento |
| A07 | P1 | Falta de chave de assinatura era detectada só depois de criar viagem no serviço externo | Configuração da assinatura validada antes de OAuth/criação; teste confirma ausência de chamada externa |
| A08 | P1 | Resultado atrasado de playlist/CORS podia substituir estação recente ou agendar reconexão obsoleta; callbacks e recursos de áudio sobreviviam à saída; graph suspenso podia aparentar reprodução sem áudio | Tokens verificados após awaits, cancelamento de attach, limpeza de listeners/timers/áudio e fallback do EQ para áudio comum. O graph precisa estar em running em até 500 ms; testes de duas corridas, Web Audio indisponível e resume rejeitado |
| A09 | P2 | Busca por site destruía pontuação da URL; favoritos legados sem tags/codec podiam quebrar consumidores | URL preservada no debounce, normalização de estações, fontes HTTPS e ganhos limitados. Teste de busca real do componente e migração de preferências |
| A10 | P1 | Referências herdadas como `constructor` passavam na validação; resize e adição podiam gravar layout recusado no próximo boot; área total subestimava linhas fragmentadas | `Object.hasOwn`, validação antes de commit, teto de 24 itens, altura compatível com schema, botão de adição desabilitado e simulação de empacotamento CSS dense. Testes de persistência e fragmentação |
| A11 | P2 | Storage bloqueado derrubava preferências/ordem de apps; envelopes de aparência aceitavam opacidade negativa e cor inválida | Leitura/escrita opcionais, normalização de ordem, fontes permitidas e validação de brilho/cor/opacidade antes de aplicar/persistir. Testes de envelopes e atualização |
| A12 | P2 | Listener de voz era recriado a cada atualização do objeto do player, criando janelas de perda de eventos | Listener estável usa ref com o player atual e cleanup na saída; disponibilidade assíncrona respeita desmontagem |
| A13 | P1 | Importação estática da navegação expandida alcançava Leaflet e `window` em ambiente servidor | Expansão importada sob demanda; teste importa a árvore de rotas no ambiente Node sem `window` |
| A14 | P1 | `android.car` era biblioteca obrigatória e suas classes apareciam no plugin carregado em qualquer Android | Biblioteca opcional no Gradle, monitor isolado e carregamento apenas após feature/classe disponíveis. Teste Android abre a MainActivity e confere plugins em emulador não automotivo |
| A15 | P1 | Chamadas só apareciam na página de telefone; intents DIAL não chegavam ao formulário; um único Call perdia a chamada anterior; viva-voz informava sucesso sem conferir rota | Integração global, intents preenchem número sem ligar automaticamente, notificação privada de chamada com permissão sob demanda, lista de chamadas e rota Telecom real. Testes de navegação, intent e cleanup; telefonia física permanece pendente |
| A16 | P0/P1 | Lockfile continha 12 avisos altos/críticos em cinco famílias de pacotes, inclusive `shell-quote` via devtools | Auditoria acrescentada ao CI e lockfile atualizado a partir da proposta compatível, com manifesto preservado e instalação congelada, testes e builds como gates |
| A17 | P1 | Primeiro teste de instrumentação não chegava ao aplicativo: runner sem permissão de KVM iniciava emulação x86 sem aceleração e travava no boot | Permissão KVM do runner efêmero configurada conforme o mantenedor da action; aceleração exigida e boot limitado a cinco minutos |

## Reprodução contra a base

Três hipóteses foram executadas contra o código da base antes de corrigi-lo:

1. `fetchWeather({ lat: 0, lng: 0 })`, com `current: {}` e somente uma data diária, retornou temperatura e máxima zero. O resultado esperado é erro de dados incompletos, mantendo a possibilidade de mostrar cache sinalizado como antigo.
2. Uma posição com mais de dez minutos, recebida por adapter simulado, foi devolvida por `getLocationOnce`; o contador registrou duas assinaturas iniciadas e só uma encerrada. O resultado esperado é aguardar fix recente ou timeout e encerrar a assinatura pontual.
3. Telemetria com `remainingDuration: "12.5s"`, OAuth simulado e chave RSA efêmera gerada apenas para o teste perdeu a duração. O resultado esperado é 12,5 segundos reais, inclusive sem geometria de rota.

Os testes adicionados exercitam essas causas e também sequências assíncronas de substituição, cancelamento, armazenamento indisponível e entradas malformadas. Não foi criado teste para cada mudança cosmética.

## Dependências

O [primeiro job de auditoria](https://github.com/hj75apps-lang/remix-of-sweet-moments-journal/actions/runs/37843546296) reportou um aviso crítico e onze altos. As famílias afetadas foram `brace-expansion`, `js-yaml`, `nanoid`, `shell-quote` e `source-map-js`. Existem caminhos por lint, CLI, devtools, PostCSS e plugins de build. A presença no grafo não prova que a aplicação publicada expõe o gatilho de cada aviso.

A proposta gerada no Actions foi conferida pelo SHA256 do ZIP e pelo diff do lockfile. `package.json` permaneceu idêntico. Foram atualizados `brace-expansion` para 1.1.21/5.0.12, `js-yaml` transitivo para a 4.3.2 já declarada, `nanoid` para 3.3.18, `shell-quote` para 1.11.0 e `source-map-js` para 1.2.2. Bun restaurou também três entradas opcionais de WASI para completar o grafo.

O processo de correção reportou **um aviso moderado restante**: [GHSA-w5hq-g745-h8pq](https://github.com/uuidjs/uuid/security/advisories/GHSA-w5hq-g745-h8pq) em `uuid@7.0.3`, exigido por `xcode@3.0.1` via CLI Capacitor. O aviso afeta APIs v3/v5/v6 com buffers externos. A [fonte de xcode 3.0.1](https://github.com/apache/cordova-node-xcode/blob/3.0.1/lib/pbxProject.js) usa `uuid.v4()` sem buffer, caminho não afetado segundo o mantenedor. Isso reduz a exposição observada, mas não apaga o aviso. Não foi forçada uma versão major fora da faixa do dependente; atualizar/substituir esse dependente permanece uma pendência documentada.

Referências primárias:

- [Bun audit e atualização dentro das faixas permitidas](https://bun.sh/docs/pm/cli/audit).
- [shell-quote: correção em 1.11.0](https://github.com/advisories/GHSA-pqg4-j6r4-53mv).
- [brace-expansion: versões corrigidas por família](https://github.com/advisories/GHSA-qhr7-859c-m2p7).
- [source-map-js: consumo de event loop](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).

## Validação automatizada

O [PR #9](https://github.com/hj75apps-lang/remix-of-sweet-moments-journal/pull/9/checks) reúne os checks associados ao commit corrente. A revisão usa instalação com lockfile congelado, TypeScript, lint, Vitest, build web, build estático Capacitor, lint/testes Gradle, APK debug e instrumentação Android. O job de dependências bloqueia avisos altos/críticos e preserva uma proposta de correção para revisão, sem editar o branch automaticamente.

A primeira rodada detectou um erro de lint e uma asserção que contava timers do React; ambos foram corrigidos. A execução de `24ce98b` passou em **145 testes, 33 arquivos**, tipos, lint, build web, build Capacitor, lint/testes Gradle e APK. Os checks do PR vinculados acima fornecem o resultado do commit mais recente, incluindo o lockfile atualizado e a instrumentação.

O teste Android de inicialização valida carregamento do bridge/plugins. Ele não testa chamadas reais, Bluetooth, boot por ROM do fabricante, iluminação veicular nem seleção efetiva do papel HOME pelo usuário. O APK é de debug, não um release assinado.

Na primeira execução de instrumentação, o log registrou falta de permissão em `/dev/kvm`, `-accel off` e dispositivo offline durante o boot. Foi corrigida a configuração do runner conforme [android-emulator-runner](https://github.com/ReactiveCircus/android-emulator-runner#running-hardware-accelerated-emulators-on-linux-runners); essa falha de infraestrutura não foi tratada como evidência contra o aplicativo.

## Riscos residuais de implantação e campo

| Prioridade | Pendência | Motivo e próximo critério de aceite |
|---|---|---|
| P1 | Limitar e autenticar criação de viagens na implantação | Origem/CORS e limite em memória não autenticam clientes fora do navegador. O limite usa headers de proxy e é por processo; validar proxy confiável, quota/custo e proteção centralizada antes de expor um backend configurado |
| P1 | Restringir saída de rede do descobridor web | URLs/redirecionamentos são validados e o corpo é limitado, mas a política lexical de hostname não fixa o IP efetivamente conectado. Exigir egress que bloqueie redes internas/metadata ou transporte com resolução e conexão fixadas; DNS rebinding não foi declarado resolvido |
| P1 | Confirmar rotação de chaves históricas | A árvore atual não apresentou credencial real na busca por padrões. A documentação existente relata chaves no histórico; estado de revogação/restrições não foi acessível. Não reescrever história para ocultar exposição |
| P1 | Validar na central e APIs 24–36 | Instalar APK e executar a matriz de compatibilidade: suspensão/retomada, permissões, rádio/EQ, Maps/Waze, contatos, chamada em espera, áudio Bluetooth e faróis |
| P2 | Atualizar dependente de uuid | Aviso moderado preso à faixa `uuid@^7.0.3` de xcode; uso observado é v4 sem buffer. Resolver com atualização compatível do dependente e teste da CLI, sem override major cego |
| P2 | Resolver contrato documental do tema | AGENTS descreve prioridade manual; código e planos recentes priorizam faróis enquanto ativos. Foi conservado o comportamento atual para não desfazer uma decisão funcional recente |
| P2 | Medir layout e desempenho | Capturas em 320/768/1280 px, fontes máximas, contraste nos dois temas e LCP no dispositivo. Layouts muito densos ainda encontram o mínimo de altura de 32 px e precisam de limite de capacidade/UX definido |

## Revisão de design exigida pelo repositório

Aplicada a instrução de `.agents/skills/webdesign-review/SKILL.md`. As notas abaixo são avaliação estática provisória da base e dos riscos de interface, não medições visuais do site implantado.

### Rodada 1 — críticos: 5,5/10

Três principais pontos: edição da Home não tinha entrada de teclado; URL de rádio deixava de funcionar na busca; cálculo da grade cortava layouts fragmentados. Importação de Leaflet no servidor também prejudicava disponibilidade. Contraste, 320/768/1280 px e LCP < 2,5 s ainda exigem medição.

Correção prioritária aplicada em `customizable-home.tsx`:

```tsx
useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
```

Há também botão de personalização que fica visível ao receber foco, e o número de linhas usa `homeGridRows` para refletir o empacotamento dense.

### Rodada 2 — qualidade: 6,5/10

Três principais pontos: aparência persistida podia tornar botões invisíveis; tamanho de fonte anunciado não garante tamanho automotivo em todos os componentes que usam classes fixas; prioridade do tema diverge da instrução documental. O produto é uma launcher, portanto conversão comercial/social proof não se aplicam.

Correção prioritária aplicada em `use-launcher-settings.tsx`:

```ts
buttonOpacity: typeof v.buttonOpacity === "number" && v.buttonOpacity >= 10 && v.buttonOpacity <= 100 ? v.buttonOpacity : 100
```

A validação do envelope e das atualizações agora aplica o mesmo intervalo.

### Rodada 3 — polimento: 6/10

Três principais pontos: dados legados de rádio podiam quebrar estado vazio/mídia; condição noturna mostrava lua mesmo em chuva/tempestade; chamadas recebidas não alcançavam a tela de controle a partir de outras rotas. Esses pontos foram corrigidos. Animações e sinalização de loading/erro ainda precisam de inspeção no dispositivo, incluindo preferência de movimento reduzido.

Correção prioritária aplicada no player:

```ts
setFavorites(normalizeRadioStations(rawFavs, 200));
```

Saúde de design provisória: **60/100**. Recomendação: **Needs polish**, com validação de campo obrigatória antes de declarar pronto para lançamento.

Lista de dez melhorias/validações por prioridade:

1. Confirmar chamadas recebidas, em espera e retomada da original com dois números reais.
2. Validar central sem `android.car` e central automotiva com faróis reais.
3. Capturar Home padrão e personalizada em 320/768/1280 px e diferentes alturas.
4. Definir comportamento para layouts que excedem a altura mínima de leitura.
5. Medir contraste com vidro, cores personalizadas e opacidade reduzida.
6. Validar edição inteira com teclado, foco e anúncio do drag/drop.
7. Alinhar prioridade do tema entre código, plano e instruções.
8. Verificar todas as fontes anunciadas como padrão automotivo, sem rescalar dimensões globais.
9. Verificar movimento reduzido em widgets e modo de edição.
10. Medir inicialização, LCP e retomada com GPS, rádio e mapa na central.

## Fontes de compatibilidade

- [Android: biblioteca opcional e verificação de presença](https://developer.android.com/guide/topics/manifest/uses-library-element).
- [Android: InCallService e responsabilidades da interface de chamadas](https://developer.android.com/reference/android/telecom/InCallService).
- [Matriz de compatibilidade do projeto](MATRIZ-COMPATIBILIDADE-ANDROID.md).
- [Plano de estabilização existente](PLANO-DE-ESTABILIZACAO.md).
