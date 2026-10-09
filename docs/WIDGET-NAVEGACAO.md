# Widget de navegação em tempo real

O Smart Auto Launcher exibe seu próprio mapa Leaflet no espaço de navegação da Home ao abrir o launcher, inclusive após iniciar a central. A posição vem do GPS compartilhado e acompanha o veículo com suavização. Este mapa não é a tela incorporada do Waze ou Google Maps.

## O que é integrado hoje
- Google Maps, Waze e outros apps Android que se anunciam como handlers de navegação;
- seleção persistida em Ajustes → Navegação padrão;
- fallback automático para Perguntar sempre quando o app escolhido deixa de estar instalado;
- GPS nativo/web compartilhado pelo location-store;
- orientações publicadas por Google Maps/Waze/etc. via Notification Listener;
- distância/tempo extraídos da orientação quando o app fornece esses dados no texto;
- busca de destino e abertura explícita do navegador escolhido em Ajustes;
- retorno à Launcher com o mapa próprio e a última posição preservada no estado compartilhado;
- geometria de rota opcional no NavigationProvider, usada somente quando um provedor entrega pontos de rota autoritativos.

Não há abertura externa automática nem solicitação de janela posicionada na Home. A preferência antiga `openNavigatorOnStartup` permanece no formato salvo apenas por compatibilidade; não controla o mapa. Para iniciar o launcher ao ligar a central, use Ajustes → Abrir ao ligar a central e configure-o como tela inicial padrão; a execução após boot depende da política do aparelho.

## O que não é falsificado
Android não fornece uma API genérica que permita incorporar a interface privada de navegação do Google Maps ou Waze dentro de outro app. O Launcher não usa iframe, WebView, captura de tela ou scraping desses aplicativos.

Também não é criada uma polyline estimada a partir da posição do veículo e apresentada como rota. A rota só é desenhada quando NavigationRoute.points é fornecido por um provedor autorizado.

## Google Maps e Waze
A abertura externa usa os mecanismos oficiais:
- Google Maps: Maps URLs com api=1, travelmode=driving e dir_action=navigate.
- Waze: Deep Link https://waze.com/ul?...&navigate=yes.

Para telemetria oficial de uma viagem externa — localização da viagem, ETA, distância restante e rota restante — a opção atual do Google é o Navigation Connect. Essa integração exige configuração de Google Cloud, Navigation Connect habilitado, app Android verificado, OAuth/service account e consentimento do motorista. Por isso ela não é ativada com credenciais improvisadas no cliente.

## Arquitetura
- NavigationWidget — UI do card.
- NavigationProvider — contrato de provedor.
- NavigationState — posição, orientação, rota e telemetria.
- location-store / navigation-location — fonte única de GPS.
- navigation-apps — descoberta dos apps instalados.
- navigation-deep-link-manager — URLs oficiais.
- NavigationWidget abre o navegador externo somente por ação explícita; não carrega FullscreenNavigation.
- LiveMap — uma instância Leaflet com câmera suavizada e rota opcional.

## Performance
- não recria o mapa a cada atualização de GPS;
- atualiza a posição no máximo uma vez por segundo no estado compartilhado;
- interrompe a assinatura de GPS quando o card não está visível;
- reutiliza a instância Leaflet;
- usa ResizeObserver para redimensionamento;
- respeita redução de movimento;
- preserva o último estado durante perda temporária de conectividade.

## Validação
1. typecheck;
2. ESLint;
3. testes unitários;
4. build web;
5. build Android;
6. Android Lint;
7. testes unitários Android;
8. assembleDebug.

A validação em hardware automotivo continua necessária para GPS, Bluetooth, boot, chamadas, Waze/Google Maps e retorno à Launcher.