# Comandos de voz no veículo

## O que será feito
- Adicionar uma integração Android 7+ que inicia o reconhecimento de voz pelo microfone e recebe ativações compatíveis do assistente do veículo.
- Exibir um controle de microfone na barra superior, com estados claros de ouvindo, indisponível e erro.
- Interpretar comandos em português para abrir Início, Rádio, Clima, Apps e Ajustes, além de reproduzir, pausar, avançar e voltar estações.
- Manter o recurso disponível em todas as páginas, conectado ao rádio global existente.

## Detalhes técnicos
- Separar reconhecimento nativo, interpretação dos comandos e interface visual.
- Usar APIs nativas disponíveis desde Android 7, com permissão de microfone solicitada somente ao ativar o recurso.
- Integrar eventos nativos ao roteador e ao player sem alterar dados, backend ou esquema existente.
- Atualizar a orientação de integração Android e validar o aplicativo web e os testes da interpretação.
