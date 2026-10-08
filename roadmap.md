# Roadmap

- [ ] Igualar a margem superior à inferior em todas as páginas do launcher, preservando o comando de voz.

- [x] Uniformizar margens da tela inicial com as demais páginas; posições da barra e do conteúdo idênticas em Início, Rádio, Apps, Ajustes, Clima e Telefone, verificadas em 1280×800, 1280×720 e 390×844.

- [x] Retirar cabeçalhos, localização duplicada e selo da previsão expandida; Hoje + cinco dias, botão voltar e /clima validados em 1280, 390 e 320px sem rolagem; cinco testes aprovados.

- [x] Garantir seis previsões (Hoje + cinco dias seguintes), atualizando imediatamente caches incompletos quando online; validado com previsão antiga de cinco dias e dados reais em 1280 e 390px, sem rolagem.

- [x] Separar Hoje em destaque dos próximos cinco dias, começando amanhã; previsão expandida e /clima validadas em 1280 e 390px, sem rolagem, com dados reais e 11 testes aprovados.

- [x] Adaptar a previsão expandida à área inteira do launcher, com cinco dias visíveis e sem rolagem; abertura e retorno validados em 320, 390, 768 e 1280px.

- [x] Aprimorar navegação: mapa GPS fluido, estado compartilhado, apps instalados/perguntar sempre, informações reais e adaptação ao tamanho do card; fluxo web de destino, preferência, retorno e offline validado.
- [ ] Validar navegação/GPS/retorno e escolha de outros navegadores em central Android real (depende do aparelho).

- [x] Preparar Rádio Online no código Android: busca por site sem servidor web, playlists, player compartilhado e lista de uma estação por linha (21 testes passaram).
- [ ] Validar Rádio Online numa central com APK atualizado (depende do aparelho).

- [x] Integrar seleção automática da fonte ativa, atualização contínua do player e acesso às sessões Android.
- [ ] Confirmar Spotify e rádio da central em aparelho real (depende do aparelho e das informações publicadas pelo rádio).

- [x] Integrar reconhecimento de voz nativo compatível com Android 7+.
- [x] Interpretar comandos de navegação e controle do rádio.
- [x] Disponibilizar ativação do microfone em todas as páginas.
- [x] Confirmar integração no projeto Android final (registro do plugin e permissão no manifesto).
- [x] Manter Início, Rádios Online e Ajustes fixos na barra lateral.
- [x] Substituir o atalho Telefone pelo último app aberto pelo launcher, com ícone real e acesso ao app.
- [x] Manter Apps fixo na barra lateral, com acesso à lista de aplicativos instalados.
- [x] Alternar os demais espaços entre aplicativos Android ativos ou usados recentemente, com ícones reais.
- [x] Validar a barra dinâmica em diferentes tamanhos de tela.
- [x] Padronizar a composição do Launcher em 1280×720 conforme a referência: navegação ampla, relógio, clima e mídia.
- [x] Criar tela de telefone com discagem, atendimento, encerramento e viva-voz do veículo.
- [x] Registrar o plugin CarPhone, o serviço InCallService e as permissões no projeto Android.
- [ ] Confirmar chamadas e roteamento de áudio em uma central Android real após registrar o plugin e o serviço de chamadas.
- [x] Comportamento de Launcher: abrir ao ligar, tela cheia, tela sempre ligada, paisagem, pedido de tela inicial padrão.
- [x] Navegação real via Google Maps/Waze com destino e app padrão.
- [x] Painel de ajustes persistente (inicialização, tela cheia, brilho, relógio 24h, animações, app de navegação).
- [x] Contatos e chamadas recentes no telefone, com tratamento de permissão negada.
- [x] Gerar o APK instalável (bun run build:android + Gradle; workflow GitHub para builds automáticos).
- [ ] Testar boot, chamadas, Bluetooth e volante numa central real.
