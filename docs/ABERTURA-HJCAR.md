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

Não foi gerado APK nesta alteração. A compilação completa e a exibição real da abertura ainda precisam ser verificadas com APK atualizado numa central Android; teste Java isolado não comprova renderização nativa.