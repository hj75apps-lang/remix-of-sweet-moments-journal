# Tocando Agora — melhorias e validação

## Implementado
- Camada modular de identificação e metadados para o widget "Tocando Agora".
- Integração nativa robusta via MediaSessionManager e NotificationListenerService para Spotify, YouTube Music e players externos no Android.
- Parser ICY aprimorado para transmissões online com validação rigorosa de cabeçalhos e segurança de CORS/timeout.
- Sistema de fallback em cascata para capas, miniaturas, logotipos e ícones de aplicativos com recuperação de falhas.
- Tratamento de status de reprodução (tocando, pausado, carregando, falha e indisponível) sincronizado em tempo real.

## Fontes e Permissões
- Rádios Online: Identidade de estação, frequência confirmada (FM/AM) e metadados ICY.
- Streaming (Spotify, YouTube, etc.): Sessões de mídia Android autenticadas via permissão de notificação.
- Limitações técnicas documentadas para navegadores web e players sem suporte a sessões de mídia.

## Validação
- Testes unitários e de integração cobrindo cenários de falha, troca de estação, CORS e sincronização.