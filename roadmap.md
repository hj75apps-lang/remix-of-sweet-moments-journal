# Roadmap

- [ ] Gerar APK 1.1.3 com todas as mudanças atuais e OTA configurado; conferir mesma assinatura, versão crescente, OpenStreetMap e conteúdo offline antes da entrega. Validação física depende da central.

- [x] Retirar Mapbox e usar somente OpenStreetMap, sem trânsito ao vivo; GPS/cache e controles preservados, requisito de token retirado do instalador. 23 testes aprovados; mapa HTTP 200, zero pedidos Mapbox, GPS simulado e 55 tiles mantidos offline verificados. Nenhuma conexão Mapbox disponível na lista atual. APK instalado não é alterado nesta tarefa.

- [x] Aplicar seta ciano arredondada conforme referência na seleção e mapa, sem círculo permanente; carros e GPS preservados. Seleção, retorno à Home e preferência salva verificados no navegador; 23 testes aprovados.

- [x] Avaliar fonte gratuita de pacotes offline para central/site: Protomaps/OpenStreetMap em PMTiles recomendado; BBBike permite extração manual gratuita limitada. Referências, compatibilidade não comprovada e limites em docs/MAPAS-OFFLINE-FONTES.md; Mapbox atual preservado.
- [ ] Implementar downloads/importação offline por região/estado/país; falta uma fonte de distribuição dos pacotes prontos com autorização e condições gratuitas, ou um pacote local representativo para validar o leitor. Não automatizar BBBike gratuito nem baixar tiles OSM em massa. Android 7 e abertura web do zero offline exigem validação específica.

- [x] Fixar Apps/Ajustes na base e recentes no meio; ícones contidos, intervalo de 8px e rolagem somente dos recentes. Validado em 1280×800, 1280×480 e 390×844, com quatro apps simulados e navegação Apps/Início; dois testes aprovados.

- [x] Conectar Mapbox ao widget navegação: conexão Huendeberg's Mapbox vinculada; widget já lê a variável pública oficial, sem alterações necessárias no player/mapa. Navegador com GPS autorizado confirmou tiles Mapbox HTTPS 200, crédito e posição visíveis, e preservação de 55 tiles ao desconectar. Conexão do site não altera o APK já instalado.

- [x] Criar APK definitivo e concluir GitHub: Android Release 1.1.0 (38070997799) concluído; artefato baixado com digest GitHub correspondente, assinatura v2 RSA 3072 verificada por apksigner, pacote app.smartautolauncher/versionCode 1/minSdk 24 conferidos. Entregue HJCar-1.1.0-assinatura-definitiva.apk; configuração production, chave pública e sequência inicial 1 incorporadas, index offline e updater registrados, sem arquivos privados de assinatura.

- [ ] Entregar atualizações prontas e funcionando, conforme pedido de 10/10/2026: APK definitivo entregue, production publicado e downloads assinados conferidos; falta somente validação física na central. A nova assinatura não substitui diretamente os APKs antigos de teste.
- [x] Preparar distribuição OTA via GitHub Releases e Pages com assinatura, canais preservados e testes locais.
- [x] Tornar público o repositório aprovado e habilitar Pages por Actions: API confirmou visibilidade pública e HTTPS. Auditoria all-ref 38068226172 detectou somente categoria gcp-api-key no histórico de .env, compatível com a chave cuja revogação o usuário confirmou (não verificada independentemente); revisão dos cinco uploads não detectou dados pessoais. Resumo protegido testado sem valores. OTA_MANIFEST_URL e OTA_BUILTIN_SEQUENCE=1 salvos e lidos novamente pela API.
- [x] Configurar OTA_SIGNING_KEY e OTA_PUBLIC_KEY: responsável criou par RSA no Windows e cadastrou diretamente pelo GitHub CLI; API confirmou secret em ota-testing/ota-production e variável pública no repositório, sem leitura de material privado. Correspondência verificada no workflow e independentemente contra a chave pública extraída do APK.
- [x] Criar environments ota-testing, ota-production e github-pages, restringir deploys à main e configurar o responsável como aprovador após tornar público; publicações aprovadas pela API conforme autorização no chat.
- [x] Concluir distribuição de produção: execução 38071342002 publicou production 1.1.1/sequence 3 compatível exclusivamente com nativeCode 1 e launcher >=1.1.0. Manifesto e ZIP HTTPS 200, RSA validada contra a chave extraída do APK definitivo, tamanho/hash/index offline confirmados; testing sequence 2 preservado. Testes do workflow aprovados; disponibilidade não comprova funcionamento físico.

- [x] Implementar base OTA assinada, compatibilidade nativa e staging sem ativação durante uso; recuperação nativa integrada, validação física pendente.
- [x] Preparar assinatura offline/CI, painel real de versões, testes e relatório em docs/ATUALIZACOES-OTA.md.
- [x] Compilar/sincronizar APK inicial com origem HTTPS/chaves cadastradas; Android Release 1.1.0 entregue e inspecionado.
- [ ] Validar atualização real, preservação dos dados e rollback offline na central; APK e origem disponíveis, bloqueado somente por acesso ao aparelho. Guia entregue; não desinstalar o app antigo antes de proteger preferências, pois a nova assinatura não atualiza por cima.

- [x] Ampliar Voice Assistant Engine local: intenções pt-BR, apps instalados, rádio/mídia, volume, navegação confirmada, clima/hora e interface interrompível.
- [x] Implementar TTS pt-BR e intents oficiais do assistente Android; auditar permissões, ciclo de vida e ativação externa, sem escuta contínua.
- [x] Validar comandos escritos no preview e 329 testes; registrar arquitetura, fornecedores e limites em docs/ASSISTENTE-DE-VOZ.md.
- [ ] Compilar APK atualizado e verificar fala pt-BR, TTS, foco de áudio, permissão, reconhecimento offline e botão externo na central; bloqueado pela ausência de Java e acesso ao aparelho.
- [ ] Integrar e testar GPT/Gemini apenas com serviço seguro externo autorizado e configuração fornecida; nenhum provedor remoto ativo nesta entrega.

- [x] Aprimorar Tocando Agora: dados nativos validados, ICY separado e limitado, estado/fonte/capas com fallback; 300 testes aprovados e áudio WAV de teste tocar/pausar verificado na Home.
- [x] Documentar fontes, permissões, limites e testes em docs/TOCANDO-AGORA.md.
- [ ] Compilar APK e confirmar sessões Spotify/YouTube/Music e ICY ao vivo na central; bloqueado pela ausência de SDK/aparelho nesta rodada, exige acesso a notificações e fontes compatíveis.

- [x] Abrir navegador escolhido ao tocar no mapa ou expandir, sem janela posicionada; 16 testes aprovados (Waze, Maps e outro app), abertura Google Maps verificada no preview e Home preservada. Tela cheia real depende da central e APK atualizado.

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
