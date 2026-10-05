# Abrir a previsão em uma página própria

## Objetivo
Substituir a janela sobreposta por uma página responsiva de previsão, mantendo a barra de navegação do launcher visível como nas telas de Rádio e Apps.

## Implementação
- Criar a página de clima com barra de status, navegação lateral/inferior e área principal em tela cheia.
- Levar para essa página o resumo atual e a previsão detalhada dos próximos cinco dias.
- Fazer o card de clima navegar para a nova página ao toque ou pelo teclado.
- Reutilizar o carregamento, cache, ícones e estados de localização já existentes, sem alterar a fonte dos dados.
- Marcar Clima como item ativo na barra de navegação enquanto a página estiver aberta.

## Validação
- Confirmar a navegação do card para a página e o retorno pela barra.
- Conferir a página em telas móvel e ampla, com os cinco dias visíveis e sem sobreposição.
