# Launcher automotivo completo — auditoria e implementação

## Objetivo
Evoluir o que já existe (rádio, clima, tema, voz, volante, apps recentes, telefone) até um Launcher que opere como tela principal da central, sem botões vazios nem dados fictícios. Recursos que dependem do fabricante (CAN Bus, MCU, rádio FM, câmera de ré, ACC) ficam detectados e desativados com aviso claro quando o aparelho não os oferece.

## Fase 1 — Inventário e classificação
- Mapear cada botão, ícone e widget e classificar como Funcional, Parcial, Visual, Quebrado ou Ausente.
- Registrar o resultado no checklist do projeto, apontando a correção de cada item.

## Fase 2 — Comportamento de Launcher (Android)
- Inicialização automática após ligar a central e pedido para ser a tela inicial padrão.
- Tela cheia imersiva, tela sempre ligada enquanto ativa, orientação horizontal.
- Botão voltar nunca sai do Launcher; retomada do estado após suspensão ou reinício.

## Fase 3 — Mídia
- Ler e controlar qualquer app de música (Spotify, YouTube Music etc.): título, artista, capa, play/pause, próxima/anterior, avançar/voltar.
- Volume e mudo do sistema; lembrar a última mídia tocada.

## Fase 4 — Bluetooth, Wi-Fi, localização e telefone
- Estado do Bluetooth e aparelhos pareados; atalhos para parear/conectar pelas configurações do sistema (o Android não permite conectar direto sem privilégio).
- Contatos e histórico de chamadas com permissão; discagem a partir deles.
- Mensagens claras quando uma permissão é negada.

## Fase 5 — Navegação
- Botões para Google Maps e Waze via links oficiais, abrir navegação para um destino, escolha do app de navegação padrão.
- Aviso quando o app não estiver instalado.

## Fase 6 — Configurações persistentes
- Novo painel com: apps favoritos e ordem dos atalhos, tema, brilho, volume, formato do relógio, unidades, app padrão de navegação e de música, inicialização, animações, modo noturno.
- Tudo salvo e restaurado após reinício.

## Fase 7 — Robustez e desempenho
- Telas de falha amigáveis (sem internet, GPS indisponível, app ausente, serviço fora).
- Revisar timers e listeners para uso contínuo por horas; reduzir pacotes grandes.
- Revisar permissões e remover as desnecessárias.

## Detalhes técnicos
- Novos plugins Capacitor no pacote do app: BootReceiver + LauncherSystem (imersivo, keep-screen-on, role HOME), extensão do NowPlaying (seek, volume/mudo via AudioManager), BluetoothState (BluetoothAdapter, ACTION_BLUETOOTH_SETTINGS), Contacts/CallLog (READ_CONTACTS, READ_CALL_LOG), Navigation (intents geo:/google.navigation:/waze://).
- Camada de capacidades no front (`device-capabilities`) habilita/oculta recursos conforme o hardware.
- Configurações num hook único com validação e armazenamento local versionado.
- Empacotamento: gerar build estático com index.html para o Capacitor (`webDir`), pré-requisito para gerar o APK.
- Compatibilidade Android 7+ (minSdk 24) em todas as APIs.
- Limitação: a compilação do APK e os testes de hardware (chamadas, Bluetooth, volante, boot) precisam ser confirmados numa central real; o ambiente aqui não tem SDK Android.
