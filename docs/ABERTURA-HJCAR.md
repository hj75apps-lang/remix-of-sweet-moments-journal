# Abertura inicial HJCar

- A imagem enviada aparece centralizada, sem distorção, durante 1,8 segundo na primeira abertura Android.
- A imagem é empacotada como recurso Android para funcionar sem internet. O arquivo `src/assets/hjcar-opening.png.asset.json` registra a versão original enviada; o favicon é uma cópia quadrada de 64 px.
- `FirstLaunchState` usa um marcador em `getNoBackupFilesDir()`: reabertura, retorno à Home, reinicialização e atualização preservam a marca. Desinstalar/reinstalar ou limpar os dados do aplicativo reinicia a marca.
- A marca é gravada quando a imagem chega ao primeiro desenho, não simplesmente quando a atividade começa.
- A tela de partida obrigatória do Android usa imagem transparente; o HJCar não é definido como ícone permanente dessa tela. O ícone instalado na gaveta de apps não foi alterado.
- O navegador não recebe uma abertura artificial: esta solicitação refere-se à instalação Android.

## Verificação

Executado o código Java real de `FirstLaunchState` com verificações de instalação nova, consumo no primeiro desenho, reabertura/atualização, idempotência, reinstalação e falha de armazenamento: aprovado. Testes equivalentes ficam em `FirstLaunchStateTest.java`.

XML dos recursos validado; dimensões do ícone conferidas; navegador confirmou o novo favicon servido na Home.

APK `HJCar-2026-10-09-v2.apk` gerado e entregue em 09/10/2026, incluindo o envio direto de destino ao navegador escolhido. Compilação Android e cinco testes JUnit aprovados, integridade ZIP e assinatura v2 verificadas, Android mínimo 24 confirmado. Assinatura de debug difere do APK anterior: não suporta atualização direta desse pacote. Reinstalação perde preferências locais; preservar dados exige compilar com a chave original, indisponível nesta sessão. A exibição real da abertura e abertura de navegador instalado ainda dependem de teste na central.