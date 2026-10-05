# Refinar o widget de previsão do tempo

## Alterações
- Remover a atribuição da fonte exibida no rodapé do card.
- Exibir o nome da cidade ou, quando indisponível, as coordenadas já resolvidas pelo serviço atual.
- Associar cada condição meteorológica a um ícone visual no clima atual e em cada dia da previsão.
- Preservar localização automática, atualização, cache e previsão de cinco dias.

## Validação
- Conferir o card em tela com cidade, condição atual e ícones diários.
- Confirmar que o texto da fonte não aparece e que a compilação permanece válida.

## Detalhes técnicos
- Manter a consulta atual à Open-Meteo apenas como implementação interna.
- Reutilizar os códigos meteorológicos retornados pela API para selecionar ícones, sem alterar a origem ou a lógica de carregamento.
