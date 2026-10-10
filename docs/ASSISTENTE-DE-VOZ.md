# Assistente de voz — auditoria e entrega

## Arquitetura e auditoria

Antes de implementar foram examinados manifesto e registro Capacitor, reconhecimento existente, apps instalados, rádio global, sessões externas, volume Android, navegador configurado, clima e layout. Não foram criados banco, autenticação, storage remoto, serviços Lovable ou novas dependências de IA.

`voice-command.ts` normaliza e reconhece intenções pt-BR; `voice-assistant-engine.ts` delega somente ações tipadas autorizadas. `VoiceControlProvider` conecta as integrações existentes e guarda transcrição, resposta e confirmação em memória. O painel é montado uma vez na raiz para sobreviver às mudanças de página; o microfone permanece no dock e os widgets não foram redesenhados.

## Provedores efetivos

| Recurso | Implementação e limite |
|---|---|
| Interpretação local | Regras pt-BR sem IA/internet; não interpreta linguagem arbitrária. |
| Reconhecimento Android | SpeechRecognizer em primeiro plano, pt-BR e preferência offline. Depende do serviço e modelos instalados; preferência offline não garante funcionamento sem rede. |
| Fala Android | TextToSpeech opcional pt-BR, interrompível, com foco temporário may-duck. Exige voz instalada. Ainda não validado audivelmente na central. |
| Fala web | speechSynthesis somente com voz pt-BR disponível; não verificada audivelmente. |
| Assistente Android | Intents públicos ACTION_VOICE_COMMAND/ACTION_ASSIST para outro aplicativo compatível; evita reabrir o launcher. Não incorpora Google Assistant nem comprova identidade Google/Gemini. |
| GPT/Gemini por API | Não integrados nem ativos. Exigem serviço seguro externo autorizado, configuração e teste real; opções ficam indisponíveis. Nenhuma chave privada no frontend/APK. |

Não há wake word, escuta contínua ou serviço permanente de microfone. Intents externos compatíveis ativam o fluxo global quando o firmware os encaminha ao launcher; não há promessa de botão universal. Botões de mídia do volante não foram convertidos em botão de voz.

## Ações e segurança

- Abrir Home, Apps, Rádio, Clima e Ajustes por navegação existente.
- Abrir app instalado por nome exato ou aliases conhecidos (Spotify, Waze, Maps etc.); nomes duplicados não são escolhidos automaticamente.
- Buscar rádios no catálogo/favoritas/estações próprias validados. Múltiplos resultados exigem escolha. Catálogo offline não torna streaming disponível sem internet.
- Enviar play/pause/próxima/anterior ao player ativo pelas integrações existentes. Mensagens identificam comando enviado, sem presumir reprodução confirmada.
- Alterar volume de mídia pela ponte Android, informando o valor retornado. Na web, somente volume da rádio do launcher, explicitamente identificado.
- Abrir navegador configurado; todo destino pede confirmação e pode ser corrigido. A busca é entregue ao navegador: não há geocodificação inventada nem garantia de destino único.
- Hora local e previsão Open-Meteo disponível; dados antigos são identificados como última previsão salva. Sem dados, aguarda clima/localização.
- Consultas livres são identificadas como não reconhecidas, sem resposta de IA simulada.

Parser recusa comandos negados/condicionais/compostos. Não executa código, URLs arbitrárias ou pacotes inventados. Cancelamento invalida resultados antigos antes de iniciar ações externas, mas não desfaz ações já aceitas pelo Android/player. Após consultas assíncronas, a validade do comando é conferida novamente.

## Permissões, privacidade e configuração

RECORD_AUDIO é solicitado antes do reconhecimento. Negação/revogação, rede, microfone ocupado e serviço indisponível têm mensagens próprias. Manifesto consulta reconhecimento/TTS e recebe intents oficiais. Plugin registrado em MainActivity; apps, sessões externas e localização reutilizam permissões existentes. Sessões externas dependem do acesso às notificações e suporte do app.

Áudio, transcrições e conversas não são persistidos pelo launcher; apenas preferências de fala/modo são salvas localmente. Ocultar ou encerrar interrompe reconhecimento/TTS. O fornecedor de reconhecimento Android pode processar fala online conforme sua configuração; EXTRA_PREFER_OFFLINE não garante processamento totalmente local.

Na central: instalar APK atualizado, autorizar microfone, instalar recursos pt-BR e escolher assistente padrão quando desejado. Código usa APIs disponíveis no Android 7/API 24; WebView, firmware e serviços de fala também influenciam compatibilidade.

## Verificações e limites

- Vitest: 56 arquivos e 329 testes aprovados, incluindo 33 testes de voz (parser, execução, cancelamento, confirmação e permissão negada/revogada). Pontes nativas são simuladas nesses testes.
- Preview Chromium: painel global, hora escrita, volume da rádio em 30%, destino com confirmação/cancelamento, Apps e retorno à Home mantendo painel, hora sem rede e rejeição de “Não abra o Spotify”. Capturas: /tmp/browser/voice-assistant/.
- ESLint dos arquivos afetados: zero erros; aviso Fast Refresh do hook exportado junto ao provider.
- Compilação automática web: build OK após integração.

A compilação Kotlin/Android foi tentada, mas não iniciou: Java/JAVA_HOME indisponível. Nenhum APK novo entregue nesta rodada. Reconhecimento audível, TTS, foco/Bluetooth, botão externo do firmware, permissões físicas e reconhecimento offline exigem APK compilado e teste na central. Não foram declarados funcionais no aparelho sem validação; também não houve teste físico Android 7.

GPT/Gemini não têm serviço seguro configurado nem chamada executada; não há teste remoto a relatar. Nenhum scraping, API privada ou backend Lovable foi utilizado.