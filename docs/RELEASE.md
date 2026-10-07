# Release Android

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
