# Telefone integrado ao sistema do carro

## Experiência
- Fazer o atalho **Telefone** abrir uma tela própria com teclado numérico e chamada direta.
- Exibir chamadas recebidas e em andamento com ações para atender, recusar ou encerrar.
- Adicionar controle de viva-voz, usando o sistema de áudio do veículo.
- Mostrar claramente quando o recurso só estiver disponível no aplicativo Android.

## Integração Android
- Criar uma ponte nativa de telefonia compatível com Android 7+.
- Integrar as chamadas com o serviço telefônico do Android, sem substituir contatos ou histórico.
- Solicitar apenas as permissões necessárias no momento do uso.
- Documentar o registro nativo e as entradas necessárias no manifesto do aplicativo.

## Verificação
- Validar a navegação até a tela Telefone e todos os estados visuais no navegador.
- Verificar tipagem e compilação do projeto.
- Manter pendente apenas a confirmação em uma central Android real, necessária para testar ligação, atendimento e áudio do veículo.

## Detalhes técnicos
- Ações de atendimento usam o serviço oficial de chamadas do Android, exigindo que o app seja escolhido como aplicativo de telefone padrão.
- O viva-voz usa o roteamento de áudio do Android; quando o veículo estiver conectado por Bluetooth, o próprio sistema controla a saída disponível.
