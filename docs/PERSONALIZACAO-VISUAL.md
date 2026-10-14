# Tamanho e aparência

## Categorias implementadas
- Aplicativos: ícone e nome, na Home e na gaveta.
- Atalhos: ícone e texto dos favoritos da Home.
- Widgets: ícones, textos e distância entre cartões.
- Barra lateral: ícone, texto acessível, distância entre itens e área de toque.
- Navegação/status: ícones e textos pertencentes à launcher; não altera barras nativas do Android.
- Tipografia: títulos, textos secundários e textos de Ajustes.
- Relógio: números do horário e data separados.

## Comportamento
Cada tamanho usa uma variável própria e seletores locais. Percentuais aceitam 70–150%, em passos de 5%. Espaçamento e área de toque usam limites em pixels. A mudança é imediata e salva automaticamente em `sal.launcher-settings`, no armazenamento local já utilizado pelo app, sem internet.

Cada controle e cada categoria podem voltar ao padrão. A restauração geral exige confirmação e altera somente tamanhos e espaçamentos; papel de parede, ordem dos aplicativos, atalhos, tema, mapas e demais preferências permanecem intactos.

## Limites
Os controles atuam somente na interface da launcher. Eles não alteram aplicativos externos, fontes do Android ou barras nativas. A confirmação em central real permanece necessária antes de declarar a experiência Android validada.