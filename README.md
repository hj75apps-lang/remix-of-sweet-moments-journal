# Remix of Sweet Moments Journal

.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/89831c8c-54b1-4395-a719-1a91dfe6f5ff).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Gerando o Instalador (APK Android)

Para compilar o aplicativo Android e gerar o arquivo instalador `.apk` para a sua central multimídia:

1. Certifique-se de ter o [Android Studio](https://developer.android.com/studio) e o JDK 21 instalados.
2. Execute o build de produção e sincronize com o Capacitor:
   ```sh
   npm run build:android
   ```
3. Entre na pasta `android` e compile o APK de debug:
   ```sh
   cd android
   chmod +x gradlew
   ./gradlew assembleDebug
   ```
4. O instalador estará disponível em:
   `android/app/build/outputs/apk/debug/app-debug.apk`

Também é possível gerar o APK automaticamente utilizando a Action do GitHub configurada em `.github/workflows/android-apk.yml`.
