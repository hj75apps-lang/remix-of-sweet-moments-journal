# Concluir o telefone no Android

## Objetivo
Transformar a integração de telefone existente em uma configuração Android utilizável, registrando o plugin, o serviço de chamadas e as permissões exigidas.

## Implementação
- Adicionar e configurar a camada Android do aplicativo com o identificador já usado pelo código nativo.
- Registrar `CarPhonePlugin` na atividade principal antes da inicialização da interface.
- Declarar no manifesto as permissões de chamada e o `CarInCallService`, incluindo o papel de aplicativo de telefone padrão.
- Preservar Android 7+: usar o fluxo legado de aplicativo de telefone nas versões anteriores e o papel de discador nas versões atuais.
- Integrar o código nativo já criado na estrutura compilável do Android, sem alterar a tela ou a lógica visual do telefone.
- Registrar as decisões técnicas e atualizar a pendência do projeto.

## Validação
- Sincronizar o projeto Android e validar a compilação nativa disponível no ambiente.
- Verificar a compilação TypeScript e o estado atual da aplicação web.
- Manter como pendente apenas o teste físico de chamada e roteamento de áudio, que exige uma central Android real com telefonia.
