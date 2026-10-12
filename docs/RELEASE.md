# Guia de Instalação e Release Android

O Smart Auto Launcher possui suporte completo a compilação de APKs de debug e release para instalação em centrais multimídia Android e dispositivos de teste.

## Como obter o instalável (APK)

O projeto está pronto para compilação local ou automatizada via GitHub Actions (`Android APK` e `Android Release`).

### 1. Via GitHub Actions (Recomendado)
O repositório possui automações prontas na aba **Actions**:
- **Android APK (Debug)**: Compila automaticamente a cada push ou pull request, gerando o artefato `smart-auto-launcher-apk` contendo o APK pronto para instalação.
- **Android Release**: Disparado por tag (`v*`) ou manualmente informando a versão desejada, assinando o aplicativo com a keystore de produção.

### 2. Compilação Local (Desenvolvedor)
Caso possua o ambiente Android SDK configurado localmente:

```bash
# 1. Instalar dependências
bun install

# 2. Gerar build web e sincronizar com o Capacitor
bun run build:android

# 3. Compilar APK de debug
cd android
./gradlew assembleDebug
```
O APK gerado estará em:
`android/app/build/outputs/apk/debug/app-debug.apk`

## Release Android

## Secrets obrigatórios

Configure em GitHub Actions os seguintes secrets antes de criar uma release:

- ANDROID_KEYSTORE_BASE64
- ANDROID_KEYSTORE_PASSWORD
- ANDROID_KEY_ALIAS
- ANDROID_KEY_PASSWORD

A keystore nunca deve entrar no Git. O workflow decodifica a keystore somente no runner e a usa para assinar o APK.

## Versionamento

- Tag: v1.2.3 → versionName 1.2.3
- Execução manual: informe o campo Version.
- versionCode usa o número da execução do workflow para garantir monotonicidade dentro do repositório.

## Checklist

1. CI da branch verde.
2. Testes de hardware da matriz Android concluídos.
3. Chaves/credenciais do provedor rotacionadas e restritas.
4. Criar tag vX.Y.Z.
5. Confirmar artifact APK assinado.
6. Instalar em uma central real e executar o checklist de compatibilidade.
