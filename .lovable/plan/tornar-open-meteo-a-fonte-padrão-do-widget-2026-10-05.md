# Tornar Open-Meteo a fonte padrão do widget

## Objetivo
Substituir a Climatempo pela Open-Meteo, preservando a localização automática do aparelho e o cartão de previsão existente.

## Implementação
- Consultar a previsão da Open-Meteo diretamente pelas coordenadas do GPS, sem token ou cadastro.
- Obter temperatura, sensação térmica, umidade, vento, condição atual e previsão dos próximos cinco dias.
- Traduzir os códigos meteorológicos da Open-Meteo para descrições em português.
- Identificar a cidade por geocodificação reversa e manter uma identificação segura por coordenadas caso o nome não esteja disponível.
- Atualizar mensagens e atribuição visível para “Fonte: Open-Meteo”.
- Preservar cache, atualização automática e estados atuais de localização, carregamento e falha.
- Validar compilação e o funcionamento real do cartão.

## Detalhes técnicos
- Usar a Forecast API com `timezone=auto`, unidades métricas e `forecast_days=5`.
- Remover a dependência do token da Climatempo.
- Manter a consulta encapsulada no serviço meteorológico atual, sem alterar outras áreas do aplicativo.
