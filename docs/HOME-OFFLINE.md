# Tela inicial sem internet

- Layout e último clima válido continuam usando a persistência local existente.
- Última posição do mapa é validada e salva localmente, restaurada ao iniciar sem depender de GPS ou rede.
- Mapa preserva o enquadramento enquanto o dispositivo informa ausência de conexão; volta a acompanhar GPS ao reconectar.
- Imagens cartográficas efetivamente visualizadas ficam em cache local limitado a 160 tiles, respeitando validade HTTP e sem baixar regiões antecipadamente. Falhas de armazenamento não interrompem o mapa online.
- Reconexão redesenha os tiles e retoma atualizações reais. Estado de reprodução continua vindo de eventos reais; rádio online não funciona sem rede e não é apresentado como tocando por causa de um cache.

## Verificação

267 testes aprovados. Playwright carregou mapa e clima reais, cortou a internet, mudou o GPS e confirmou que mapa/clima permaneceram iguais; abriu Ajustes e voltou à Home offline com 60 tiles visíveis; reconectou e confirmou novo GPS salvo e mapa carregado. Compilação automática OK; lint sem erros.

## Limites

É necessário ter visualizado o conteúdo antes para existir cache. O navegador pode remover caches por falta de espaço. O APK já empacota a tela inicial offline, mas esta alteração não gerou um APK novo nem foi testada na central física. Na versão web, recarregar ou abrir o site do zero sem rede não é garantido: não foi introduzido service worker; a preservação foi validada com a aplicação já carregada e na navegação interna.