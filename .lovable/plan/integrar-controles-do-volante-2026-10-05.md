# Integrar controles do volante

## Objetivo
Permitir que os botões físicos de mídia do veículo controlem o rádio do aplicativo no Android 7 ou superior.

## Implementação
- Criar uma sessão de mídia Android própria para receber reproduzir, pausar, avançar e voltar.
- Enviar esses comandos ao player global do rádio, independentemente da página aberta.
- Sincronizar título da estação e estado de reprodução com o sistema do veículo.
- Manter o suporte atual aos controles de mídia do navegador e a outros aplicativos de áudio.

## Validação
- Validar o encaminhamento de cada comando até as ações do player.
- Confirmar que a aplicação continua compilando sem erros.
