# Matriz de compatibilidade Android — Smart Auto Launcher

A compatibilidade abaixo é o contrato de teste do produto. O CI valida o build; a validação de hardware continua obrigatória para funções dependentes de ROM, rádio, Bluetooth, telefonia e papel de launcher.

| Área | API 24–30 | API 31–35 | API 36 | Evidência |
|---|---|---|---|---|
| HOME/default launcher | validar | validar | validar | papel HOME + intent HOME |
| Boot/autostart | validar | validar | validar | BootReceiver + política de background |
| GPS | validar | validar | validar | LauncherSystem.startLocation |
| Bluetooth | legado | permissão Nearby sob demanda | permissão Nearby sob demanda | SystemControlsPlugin |
| Telefonia | validar | validar | validar | CarInCallService/permissões |
| Microfone/voz | permissão em uso | permissão em uso | permissão em uso | VoiceControlPlugin |
| Mídia/notificações | validar | validar | validar | MediaListener |
| Apps instalados | visibilidade limitada | visibilidade limitada | visibilidade limitada | queries + launcher intents |
| WebView/HTTPS | HTTPS | HTTPS | HTTPS | mixed content global desabilitado |

## Dispositivos mínimos

1. Um head unit/central real usado no produto.
2. Um dispositivo Android 12+ (API 31+) para validar Nearby/Bluetooth e permissões modernas.
3. Um dispositivo Android 15/16 (API 35/36) para validar comportamento recente de launcher, boot e private space.

## Checklist manual

- Definir o Smart Auto Launcher como HOME padrão.
- Reiniciar a central e confirmar autostart.
- Conceder localização somente ao abrir navegação/clima.
- Conceder contatos/registro de chamadas somente ao abrir telefone.
- Acionar voz e confirmar pedido de microfone sob demanda.
- Acionar Bluetooth e confirmar pedido de Dispositivos por perto sob demanda.
- Abrir Google Maps/Waze e retornar ao launcher.
- Reproduzir mídia, avançar/retroceder e retomar após suspensão.
- Alternar tela ligada/imersiva e confirmar retomada após voltar do background.
- Confirmar que a ausência de uma capability não bloqueia a Home.

## Limitações conhecidas

O Android pode restringir inicialização em segundo plano após BOOT em algumas ROMs. A implementação trata a falha sem derrubar o app; a política específica do fabricante deve ser registrada durante o teste de campo.

O acesso à lista de apps instalados é filtrado pelo Android moderno. O launcher declara apenas consultas necessárias e não usa QUERY_ALL_PACKAGES por padrão.
