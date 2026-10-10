# Atualizações OTA — Smart Auto Launcher

## Estado da entrega
Base funcional implementada no projeto, **não ativada em produção**. Não existe ainda origem HTTPS configurada, chave de assinatura de produção nem APK inicial compilado/testado. O painel apresenta essa indisponibilidade honestamente. Não foi criado banco, autenticação, storage ou serviço Lovable.

## Arquitetura
- Capacitor 8 + `@capgo/capacitor-updater` 8.52.1: download ZIP, checksum SHA-256, armazenamento interno e recuperação nativa quando a inicialização não é confirmada.
- `LauncherOtaPlugin` e `OtaPolicy`: chave pública embutida no APK, assinatura RSA-SHA256 do manifesto, origem HTTPS/porta fixas, app/canal, validade, contador monotônico e compatibilidade nativa.
- `ota-engine` separa política e UI. Download nunca usa `next()` nem agenda ativação ao suspender o app. A atualização preparada é selecionada uma única vez na próxima Activity Android, antes de montar áudio/navegação; retomar a mesma Activity ou mudar de página não ativa pacotes.
- A raiz confirma `notifyAppReady` somente depois da montagem do menu principal. Timeout nativo de 30 segundos permite retornar à última versão boa. A confirmação não prova que todas as funções de hardware estão saudáveis: validar na central.
- Preferências/mapas/rádio existentes não são removidos. Conservam-se bundle ativo, anterior, pendente e builtin; lixo antigo é removido após confirmação. `allowBackup=false` já existe no manifesto.

## O que pode mudar
Telas, estilos, imagens locais, lógica TypeScript e comandos de voz locais que usam **os mesmos plugins e contratos já instalados**. Não é atualização da biblioteca Capacitor ou do Android.

Permissões, Kotlin/Java, serviços, manifesto Android, novos plugins, pacote/assinatura e alterações de contrato nativo exigem novo APK com a mesma assinatura e versionCode maior. Manifesto `kind: native` apenas apresenta link oficial verificado; nenhum APK é instalado silenciosamente.

## Distribuição sem novo backend
Use uma origem HTTPS estática controlada pelo responsável. O ZIP e o manifesto precisam ser públicos para o aparelho; o script/CI prepara artefatos, **não faz upload automático**. Não há painel administrativo web nem segredo administrativo no Launcher. GitHub Actions com environments `ota-testing` e `ota-production` fornece revisão/aprovação antes de assinar. Configure responsáveis/aprovadores no GitHub.

1. Gere uma chave RSA de pelo menos 2048 bits em ambiente seguro: `openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out /secure/ota-private.pem`.
2. Exporte a chave pública: `openssl pkey -in /secure/ota-private.pem -pubout -out /secure/ota-public.pem`.
3. Nunca inclua a privada no repositório, `.env`, bundle ou APK. Guarde a privada no secret GitHub `OTA_SIGNING_KEY`; rotação da raiz de confiança requer APK.
4. Defina `OTA_PACKAGE_BASE_URL` no environment GitHub; use a mesma origem do manifesto embutida no APK. Publique arquivos ZIP imutáveis primeiro, depois substitua o manifesto do canal atomicamente. Não use redirects para outra origem.
5. A execução **Prepare signed Launcher OTA** recebe versão semver, sequência, canal, limites de versionCode testados, versão mínima do launcher e notas. Gera ZIP, manifesto assinado, metadados e lista de arquivos. Transfira esses artefatos à origem HTTPS controlada; não publique chave privada.

## APK inicial
JDK 21, Android SDK 36 e assinatura Android existentes são necessários. Configure variáveis de compilação `OTA_MANIFEST_URL`, `OTA_PUBLIC_KEY` (PEM público), `OTA_CHANNEL`, `OTA_BUILTIN_SEQUENCE` (contador inteiro). O workflow Android Release lê estas variáveis GitHub. O APK de debug pode receber configuração equivalente, mas não deve substituir a chave de produção.

Execute `bun install --frozen-lockfile`, `bun run build:android`, depois `./gradlew assembleRelease` em `android`, com os secrets de keystore documentados em RELEASE.md. Confirme que `cap sync android` gerou registro Capacitor do updater e copiou configuração. Instale esse APK **uma vez**; publicar a página Lovable não atualiza automaticamente APKs antigos.

## Contrato do manifesto
Envelope JSON: `{payload: base64(JSON UTF-8), signature: base64(RSA-SHA256(payload))}`. Payload:

```json
{
  "schema": 1,
  "appId": "app.smartautolauncher",
  "version": "1.1.0",
  "sequence": 2,
  "channel": "testing",
  "kind": "ota",
  "minNativeCode": 1,
  "maxNativeCode": 1,
  "minLauncherVersion": "1.0.0",
  "bridgeRevision": 1,
  "publishedAt": 1790000000000,
  "expiresAt": 1797776000000,
  "url": "https://updates.example.org/2-1.1.0.zip",
  "notes": "Melhorias compatíveis de comandos locais",
  "suspended": false
}
```

URL/datas acima são exemplos, não uma distribuição ativa. `scripts/package-ota.mjs` recebe diretório `dist/client`, diretório de saída externo, JSON de metadados e caminho privado seguro; acrescenta `bytes` e `sha256`. ZIP contém `index.html` na raiz; não código Android, servidor, dependências, chaves, arquivos ocultos ou source maps. Limite de pacote 50 MiB. A operação local utiliza Node/zip apenas na máquina de publicação, nunca no runtime web.

Versões já preparadas ou inferiores são recusadas. O contador é reservado ao preparar, inclusive se falhar depois: publique correção/reversão do conteúdo conhecido com **nova sequência**, nunca reduza o contador. Um APK novo deve trazer builtinSequence pelo menos igual ao maior contador de sua linha de distribuição. Para suspender distribuição, assine nova sequência com `suspended:true`; isso impede novos downloads mas **não revoga um pacote já preparado em dispositivo offline**. Rotação/comprometimento de chave requer ação operacional e, se necessário, APK novo.

## Offline e limites
Sem rede, o app usa o bundle local; checagens ocorrem em primeiro plano, na abertura, reconexão e a cada seis horas, ou manualmente. Falha do servidor não apaga dados. O download pode continuar em segundo plano sem ativação; não controla rádio, navegação ou telefone. Android 7+ é preservado pelo minSdk 24 do plugin; comportamento em WebViews antigas precisa teste real.

## Validação realizada / pendente
- 11 testes Vitest do motor: staging sem recarga, claim de abertura, offline/oculto, nativo/incompatível/suspenso/antigo/sem envelope/hash inválido, recuperação do servidor e retenção de bundles.
- 3 testes existentes de imports/rotas: aprovados.
- 1 teste real de publicação local: ZIP offline gerado, hash conferido, assinatura verificada, adulteração recusada e arquivo secreto excluído. Total: 15 testes aprovados; lint dos arquivos OTA sem erros.
- Navegador abriu Ajustes, painel real e menu; verificação fica desativada no web, sem simulação de atualização recebida.
- Testes Java de RSA adulterada, origem, semver e anti-downgrade adicionados; execução depende de JDK/Gradle Android.
- Registro automático Capacitor reconheceu o updater, mas a sincronização não terminou sem `dist/client` no ambiente; `build:android` e sincronização completa continuam obrigatórios no ambiente de compilação.
- Não verificados: APK assinado/instalação, HTTPS de produção, pacote real ponta a ponta, queda de conexão durante download, falta de espaço, falha/crash e rollback nativo, persistência após atualização, rádio/GPS/chamadas durante download e comandos de voz na central Android 7+. Estes são requisitos antes da produção.

Não considerar a entrega produção pronta até testar APK inicial → download assinado → próxima abertura → confirmação → leitura de preferências; também provocar falha de startup e conferir retorno offline à versão anterior.