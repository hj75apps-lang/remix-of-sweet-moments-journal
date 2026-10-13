# Personalização do papel de parede

## Recursos
- Ajustes → Personalizar papel de parede: importar JPG/JPEG, PNG ou WebP.
- Prévia na própria launcher antes de confirmar; preencher, ajustar ou centralizar, sem esticar.
- Aplicar, cancelar, restaurar o original e reaplicar a última imagem.
- Limite de entrada: 20 MB e 24 megapixels; cópia local proporcional com lado máximo de 2560 px e até 5 MiB em representação base64. PNG preservado quando cabe; JPEG com qualidade limitada quando necessário.
- URLs temporárias são usadas somente durante a leitura e imediatamente liberadas. O fundo salvo não depende delas.

## Arquivos
- `src/services/wallpaper.ts`: validação, leitura da imagem e persistência.
- `src/contexts/wallpaper-context.ts`, `wallpaper-provider.tsx`: estado global, prévia e aplicação.
- `src/components/launcher/wallpaper-settings.tsx`: controles em Ajustes; integração em `launcher-settings-panel.tsx`.
- `src/routes/__root.tsx`, `src/styles.css`: aplicação global sem alterar posições dos widgets.
- `LauncherWallpaperPlugin.java`, `MainActivity.java`: armazenamento Android privado e registro nativo.
- `src/services/wallpaper.test.ts`: validação e contrato de persistência.

## Armazenamento e compatibilidade
Android: arquivo privado `filesDir/launcher-wallpaper.json`, com AtomicFile e gravação fora da thread de UI; não exige permissões de galeria/armazenamento. Preservado em atualização assinada do APK e OTA, não em desinstalação ou limpeza de dados.
Web: IndexedDB local, independente da rede; pode ser removido ao limpar dados do site. Não foi adicionado cache offline da aplicação web.
Capacitor 8.5.2 já encaminha o input de arquivo ao seletor de arquivos Android. Não foi adicionada dependência nativa nem permissão ampla. APIs utilizadas disponíveis no Android 7/API 24; compatibilidade física da ROM e do WebView ainda não verificada.

## Validação
Playwright: importação real PNG, imagem decodificada, prévia global, ajustar, confirmar, recarregar e recuperar estado, manter imagem sem rede, cancelar restauração, restaurar e reaplicar última imagem, erro por PNG corrompido, navegação para Home e tela estreita.
23 testes de papel de parede/configurações aprovados. APK 1.1.5 gerado no GitHub (execução 38444396112), versionCode 5/minSdk 24, assinatura v2 RSA 3072 igual à 1.1.4, plugin nativo e index offline confirmados. SHA-256: 4d3ec7695386c3d0ab40ed6d329232a331021f2f7ec7a11db96186dd1cae45b2.
Teste Android físico, reinício da central e atualização assinada permanecem pendentes: sem acesso ao aparelho nesta sessão. Instalar o APK 1.1.5 sobre o 1.1.4 sem desinstalar; importar uma imagem, aplicar, fechar/reabrir, reiniciar a central e conferir sem rede, restaurar e reaplicar. Nenhuma OTA publicada nesta entrega; futuras OTA precisam de sequência crescente e compatibilidade com nativeCode 5.