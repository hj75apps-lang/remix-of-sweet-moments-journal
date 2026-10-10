# Roadmap

- [x] Aplicar visual inspirado no Waze: cartografia limpa diurna/noturna, detalhes ciano e busca arredondada; 21 testes aprovados, Mapbox HTTP 200, GPS, destino e 55 tiles offline verificados. APK anterior não inclui o novo visual.

- [x] Aplicar Mapbox raster com token público ao widget: GPS, perspectivas, tema e controles preservados; 21 testes aprovados, imagens reais HTTP 200 e permanência de 55 tiles ao desconectar verificadas. APK anterior não inclui esta alteração.

- [x] “Para onde?” abre diretamente o navegador escolhido com destino; 22 testes aprovados e abertura real Google Maps verificada na web, Home preservada; incluído no APK.

- [x] APK HJCar-2026-10-09-v2.apk entregue: compilação Android aprovada, cinco testes nativos aprovados, assinatura v2 e Android mínimo 24 verificados. Assinatura de teste difere do APK anterior; atualização direta não é compatível.

- [x] Configurar HJCar somente na primeira abertura Android; favicon atualizado, persistência Java e recursos validados. Detalhes em docs/ABERTURA-HJCAR.md.
- [ ] Confirmar abertura HJCar e destino no navegador instalado na central: APK atualizado entregue, validação depende do aparelho Android disponível.

- [x] Preservar a última visualização da Home sem internet: posição/tiles salvos, mapa e clima mantidos na queda e no retorno à Home; reconexão com novo GPS verificada, 267 testes aprovados. Limites em docs/HOME-OFFLINE.md; APK atualizado e validação física dependem da central.

- [x] Auditar novamente a estrutura web/Android, corrigir defeitos confirmados e registrar cobertura e limitações em docs/AUDITORIA-2026-10-09.md; 261 testes aprovados, seis páginas, previsão e áudio verificados. Confirmação física permanece nas pendências abaixo.

- [x] Auditar toda a aplicação antes das alterações e registrar gargalos, impacto e prioridades de desempenho em docs/DESEMPENHO-2026-10-09.md.
- [x] Otimizar carregamento, renderizações, timers e navegação sem alterar funcionalidades ou aparência.
- [x] Validar regressões e fluxos em desktop/mobile; 253 testes aprovados, seis páginas e áudio real verificados; limites registrados no relatório.

- [x] Oferecer contraste cartográfico reforçado para ruas e avenidas no OpenStreetMap, escolha salva e opção Tradicional; a fonte Voyager exigiu chave e foi descartada para preservar o mapa disponível.
- [x] Integrar trânsito real com estilos Mapbox Traffic Day/Night e atualização em primeiro plano a cada cinco minutos; fonte mapbox-traffic-v1 confirmada, tiles HTTP 200 e congestionamento colorido verificados; 22 testes aprovados, GPS/destino e 55 tiles offline preservados. Cobertura e atualização dependem do provedor; APK anterior não inclui trânsito.

- [x] Oferecer mapa 2D, 3D em perspectiva e Automático, com escolha salva e aproximação maior em 3D; 41 testes aprovados e seleção, reabertura, mapa e veículo verificados em 1280×720 e 390×844. Validação em movimento na central depende do aparelho.

- [x] Retirar círculos dos carros e orientar o mapa pelo sentido real do veículo, mantendo carro/seta para cima e direção estável ao parar; 28 testes aprovados, curvas e parada verificadas com GPS simulado. Validação em movimento na central depende do aparelho.

- [x] Oferecer seta e carros branco, azul, vermelho e amarelo para a posição GPS, com destaque no mapa e escolha preservada; 19 testes aprovados e cinco opções verificadas no mapa após reabrir.

- [x] Aplicar modo noturno ao mapa das 18h às 6h locais, preservando a preferência fora desse período; 15 testes aprovados e transições 17h59 → 18h → 6h verificadas no mapa. Aparência de Waze/Maps externos continua controlada por esses aplicativos.

- [x] Solicitar o navegador configurado na área da Home ao tocar, incluindo destino, sem alternativa de abertura comum em tela cheia; 14 testes aprovados e permanência do mapa na web verificada.
- [ ] Confirmar que o Android respeita a janela pedida na área da Home (depende da central; solicitação não comprova incorporação).

- [x] Restaurar mapa próprio com GPS no espaço de navegação da Home, visível ao iniciar, com destino e abertura explícita do navegador configurado; 24 testes únicos aprovados, mapa real/GPS e destino no Waze web verificados em 1280×720 e 390×844; inicialização física e navegadores Android aguardam a central.

- [x] Sincronizar play/pause com eventos reais de áudio e sessões externas, protegendo contra leituras antigas; 13 testes aprovados e áudio WAV real verificado: Rádio → Home, pausa → play, retomada → pause. Players externos testados com ponte simulada; confirmação física continua dependente da central.

- [x] Reservar abertura comum para toque explícito na moldura; remover abertura comum automática da Home e manter janela posicionada ao iniciar/retornar. 14 testes aprovados; moldura limpa verificada na web. Tela cheia e permanência reais dependem de validação na central.

- [x] Remover qualquer mapa próprio/fallback da moldura e solicitar apenas o navegador selecionado; opção de abertura automática preservada, 11 testes aprovados e ausência de mapa ao tocar/retornar verificada no navegador. Posicionamento real continua pendente na central.

- [x] Aplicar à previsão dos próximos cinco dias a transparência e paleta dos widgets; seis testes aprovados, dados reais e superfícies verificadas em ambos os temas, abertura pelo widget e retorno confirmados.

- [x] Adaptar o widget clima à nova referência: ícone à esquerda, temperatura em negrito e Hoje/condição, sensação térmica e máxima/mínima ao lado; nove testes aprovados e dados reais, apresentação e abertura/retorno verificados em 1280×800, 1280×720 e 390×844.

- [x] Ajustar o ícone do clima à segunda referência e manter a condição escrita nos cartões compactos; 11 testes aprovados, previsão real e abertura/retorno verificados em 1280×800, 1280×720 e 390×844.

- [x] Priorizar rádios pelo tempo ouvido nos últimos 30 dias, salvar histórico local e verificar ordenação após reabrir; 26 testes aprovados e reprodução confirmada com transmissão de teste.

- [x] Verificar o widget: exibe mapa próprio e abre o navegador externamente; APK comum Android 7+ não incorpora a janela de terceiros por APIs públicas.
- [x] Identificar a central: Torque Hammer VPL - 1167/464, Android 14.
- [x] Pesquisar integração do navegador instalado em janela: TaskView exige permissões do sistema; launchBounds depende de suporte a janelas livres e não incorpora o app; embedding público exige autorização do navegador; MediaProjection exige consentimento e não entrega controle de toque. Sem contrato público confirmado para esta central. APK pré-instalado pode ser extraído por ADB autorizado, sem root, quando o firmware permite leitura.
- [x] Substituir a proposta de incorporar a tela real do navegador pelo mapa próprio, conforme a nova escolha do usuário.
- [x] Preparar solicitação nativa de janela posicionada na área da navegação, preservando o layout; sete testes aprovados e fluxo verificado com ponte nativa simulada, sem comprovar comportamento do Android.
- [x] Retirar janela externa automática do escopo atual; usuário escolheu mapa próprio na Home.

- [x] Igualar a margem superior à inferior nas seis páginas do launcher: 16px em 1280×800 e 8px em 390×844, preservando o comando de voz na barra de navegação.

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
