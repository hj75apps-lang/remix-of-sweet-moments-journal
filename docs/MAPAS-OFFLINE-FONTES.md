# Avaliação de fontes para mapas offline

## Objetivo
Pacotes por região, estado ou país, utilizáveis na central Android e no site, sem contratar serviço pago de mapas. Esta avaliação não substitui o Mapbox online nem implementa downloads.

## Fontes verificadas

| Fonte | Disponibilidade gratuita | Adequação e limites |
| --- | --- | --- |
| Protomaps / OpenStreetMap | Basemap diário gratuito em PMTiles; licença exige créditos OpenStreetMap | Permite extrair áreas com a ferramenta oficial. Mundo completo aproximadamente 120 GB em zoom 0–15. A documentação desencoraja usar os links de distribuição como fonte permanente do app; exige preparar cópias/pacotes. |
| BBBike Extract | Extração interativa gratuita sem chave ou conta | Áreas personalizadas; até 512 MB para formatos comuns. Oferece PMTiles e MBTiles vetoriais. A geração gratuita não tem API; não automatizar o formulário. Área grande pode exigir divisão ou menor detalhe. |
| Geofabrik | Dados OpenStreetMap por país e algumas subdivisões | PBF é dado bruto, não mapa pronto para Leaflet: requer geração de tiles. Pacotes vetoriais experimentais usam esquema Shortbread; não assumir compatibilidade com estilo Protomaps. |
| Servidores públicos de tiles OpenStreetMap | Visualização online sob política de uso | Proíbem downloads em massa e prefetch; não usar para gerar pacotes offline. |

## Recomendação
Usar **PMTiles com dados OpenStreetMap**, com pacotes previamente preparados e importação local. Para uma região pequena, BBBike oferece geração manual gratuita; para estados/países maiores, extrair o basemap Protomaps com a ferramenta oficial ou gerar a partir do Geofabrik no computador. Escolher um único esquema/estilo para o leitor; arquivos Protomaps e Shortbread não são intercambiáveis sem estilos adequados.

O leitor PMTiles pode integrar Leaflet. Para tiles vetoriais é necessário adicionar renderização Canvas, estilo e fontes locais; o plugin protomaps-leaflet está em manutenção e sua compatibilidade com WebViews antigos deve ser testada. Não trocar para WebGL sem confirmar Android 7 na central.

Armazenamento local não deve carregar o país inteiro na memória: implementar leituras por intervalo, validação de formato/cobertura/tamanho, progresso/cancelamento e exclusão. Android precisa de armazenamento privado de arquivos; web precisa de armazenamento local com tratamento de quota e possível remoção pelo navegador. Não criar backend, banco remoto ou autenticação para isso.

## Custos e garantias
- Dados e ferramentas acima podem ser usados sem assinatura de mapas; isso não garante hospedagem, transferência de grandes arquivos, internet ou espaço de armazenamento sem custos.
- Sem hospedagem própria, o caminho gratuito viável é baixar manualmente um pacote autorizado e importá-lo no dispositivo/site. Um catálogo automático de downloads no app exige definir onde os pacotes serão publicados e as condições de distribuição.
- Mapa e GPS offline não equivalem a busca de endereços, cálculo/recalculo de rotas, navegação Waze/Maps ou trânsito ao vivo offline.
- A cobertura e o detalhe dependem do pacote escolhido. Fora dele, pode faltar cartografia. O site não tem abertura do zero sem rede garantida enquanto não houver suporte offline da aplicação.
- Nenhum pacote foi importado, renderizado ou testado na central nesta avaliação; Mapbox e o cache atual de áreas vistas permanecem intactos.

## Referências
- https://docs.protomaps.com/basemaps/downloads/
- https://docs.protomaps.com/guide/getting-started
- https://docs.protomaps.com/pmtiles/leaflet/
- https://docs.protomaps.com/basemaps/leaflet
- https://extract.bbbike.org/extract-dialog/en/about.html
- https://extract.bbbike.org/?format=mbtiles-shortbread.zip
- https://download.geofabrik.de/south-america/brazil/norte.html
- https://operations.osmfoundation.org/policies/tiles/