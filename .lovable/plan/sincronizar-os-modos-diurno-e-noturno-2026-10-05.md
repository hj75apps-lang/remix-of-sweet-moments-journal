# Sincronizar os modos diurno e noturno

## Alterações
- Centralizar o estado visual para que a tela inicial e Ajustes usem exatamente o mesmo modo.
- Restaurar a escolha salva antes de cada página aparecer, evitando retorno ao modo padrão durante a navegação.
- Persistir alterações feitas em qualquer tela e sincronizá-las imediatamente no aplicativo inteiro.
- No Android, observar o modo noturno do sistema do veículo e ativar automaticamente o tema noturno quando as luzes acionarem esse sinal.
- Manter uma detecção equivalente de preferência noturna no navegador para testes.

## Validação
- Alternar o modo na tela inicial, navegar para Ajustes e confirmar que o estado permanece.
- Alternar em Ajustes, voltar à tela inicial e confirmar o mesmo comportamento.
- Simular o sinal noturno e verificar a mudança automática.

## Detalhes técnicos
- Usar um provedor único de tema no nível geral do aplicativo.
- Ampliar a ponte Android já existente para informar mudanças de modo dia/noite usando recursos compatíveis com Android 7+.
- O sinal automático noturno tem prioridade quando ativo; a preferência manual continua salva para ser restaurada fora desse estado.
