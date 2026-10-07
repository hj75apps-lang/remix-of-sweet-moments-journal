# Smart Auto Launcher

Launcher Android automotivo construído com React, TanStack, Vite e Capacitor, com integrações nativas para recursos do dispositivo.

## Requisitos
- Bun (versão atual)
- JDK 21
- Android SDK / Android Studio para compilar o APK

## Desenvolvimento

    bun install --frozen-lockfile
    bun run dev

## Verificações

    bun run lint
    bun run test
    bun run build

## APK Android de desenvolvimento

    bun run build:android
    cd android
    ./gradlew assembleDebug

O APK de debug é gerado em android/app/build/outputs/apk/debug/. O workflow Android APK executa validações e publica o APK como artifact quando o job termina com sucesso.

## Variáveis de ambiente
Copie .env.example para .env e preencha somente valores necessários. Variáveis VITE_* são incluídas no bundle do cliente: não coloque segredos nelas. Restrinja chaves de navegador por API e origem no provedor. Não versione .env.

## Segurança e compatibilidade
- Mixed content está desabilitado globalmente no WebView. Streams HTTP legados devem ser tratados de forma específica, não liberando conteúdo misto para toda a aplicação.
- Recursos como telefonia, boot automático, Bluetooth, GPS e acesso a notificações dependem da versão Android, permissões, ROM e hardware. Validar em uma central real antes de distribuir.
- Consulte docs/PLANO-DE-ESTABILIZACAO.md para fases, pendências e critérios de release.

## Release
O workflow atual gera APK de debug para validação. APK de produção assinado exige configuração de keystore e secrets no GitHub; isso não deve ser armazenado no repositório.
