# Integrar Climatempo ao widget de previsão

## Objetivo
Substituir a fonte atual pela API meteorológica oficial Climatempo Advisor, mantendo a localização automática do aparelho e exibindo os dados no widget existente.

## Implementação
- Adaptar o serviço de previsão para localizar a cidade pelas coordenadas do GPS e consultar condições atuais e previsão diária na Climatempo.
- Manter o token somente no servidor e validar respostas antes de enviá-las à tela.
- Mapear temperatura, sensação térmica, umidade, vento, condição, chuva, mínimas e máximas para o formato já usado pelo widget.
- Preservar cache para reduzir consumo da cota e manter os estados de localização, carregamento, falha e atualização.
- Exibir no widget a identificação “Fonte: Climatempo”.
- Validar o fluxo no aplicativo e confirmar que não restaram erros de compilação.

## Dependência do usuário
A integração real exige um token ativo da API Climatempo Advisor. Após aprovar o plano, será aberto um campo seguro para cadastrá-lo; ele não será gravado no código.

## Detalhes técnicos
- Usar a API Climatempo Advisor pelo servidor, nunca diretamente no navegador.
- Resolver as coordenadas em `localeId`, registrar/validar a localidade conforme o plano da conta e consultar clima atual e previsão.
- Tratar limites do plano e mensagens da API sem expor o token.
