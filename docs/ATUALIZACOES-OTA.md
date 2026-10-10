# Atualizações OTA — Smart Auto Launcher

## Estado da entrega
Distribuição assinada publicada, **validação física ainda pendente**. Em 10/10/2026, Android Release 1.1.0 (38070997799) terminou com sucesso: assinatura v2 RSA 3072, package app.smartautolauncher, versionCode 1 e minSdk 24 conferidos. APK entregue como HJCar-1.1.0-assinatura-definitiva.apk, SHA-256 ef400fc14c236bed2fcf9562003db1a505e2bc8ea3eb3250af260c8b15ae6ba9. A assinatura definitiva difere dos instaladores antigos de teste e não permite atualização direta sobre eles; proteger preferências antes de qualquer remoção.

O workflow 38071342002 publicou production 1.1.1, sequência 3, compatível com nativeCode 1 e launcher >=1.1.0. Manifesto `https://hj75apps-lang.github.io/remix-of-sweet-moments-journal/production.json` e ZIP retornaram HTTPS 200; assinatura RSA verificada independentemente contra a chave pública extraída do APK, SHA-256 1762f919c9e216bc6f562f85f27d70070af7f2dcac07483daa29dbf0be228470 e 735006 bytes conferidos. ZIP contém index.html offline e nenhum arquivo privado de assinatura. Testing sequência 2 preservado. Aprovações ota-production e github-pages realizadas conforme autorização no chat. Não foi criado banco, autenticação, storage ou serviço Lovable.

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
O workflow **Publish signed Launcher OTA to GitHub** assina, publica uma Release imutável e implanta manifesto e ZIP no GitHub Pages. Ambos os canais são reconstruídos a partir das Releases publicadas de maior sequência, com verificação RSA e SHA-256 antes de enviar ao Pages. A implantação é serializada e atômica; não publica chaves privadas. Configure aprovação nos environments `ota-testing`, `ota-production` e `github-pages`.

**Importante:** o APK exige a mesma origem para manifesto e ZIP. Downloads de Releases redirecionam para outra origem; por isso Releases guardam os arquivos e Pages disponibiliza também uma cópia idêntica do ZIP. A política nativa permanece intacta. Mudança de origem ou chave exige novo APK.

### Ativação no GitHub
1. Vincule o projeto pelo menu **+ → GitHub → Connect project** do Lovable, caso ainda não esteja vinculado. Use repositório público destinado à distribuição: código e pacotes ficam visíveis; não coloque credenciais nele.
2. No repositório, abra **Settings → Pages → Source → GitHub Actions**. O workflow exige Pages já habilitado.
3. Configure os environments acima e os aprovadores. Use a mesma chave raiz nos dois canais; guarde `OTA_SIGNING_KEY` como secret dos environments de assinatura e `OTA_PUBLIC_KEY` como variável do repositório.
4. Configure `OTA_MANIFEST_URL` como o endereço Pages efetivo seguido de `/production.json`, e `OTA_BUILTIN_SEQUENCE` com o contador já incorporado. Configure qualquer domínio próprio antes de gerar o APK e mantenha esse endereço.
5. Gere o APK Android Release com a chave Android original. Execute **Actions → Publish signed Launcher OTA to GitHub → Run workflow**, informando versão, sequência crescente, canal e compatibilidade real com esse APK.
6. Aguarde Release e implantação Pages; verifique os endereços públicos e instale/teste o APK configurado. Cada nova atualização é uma execução aprovada desse workflow, não apenas uma publicação no Lovable.

O workflow lê automaticamente o endereço oficial de Pages; não precisa de token pessoal GitHub nem `OTA_PACKAGE_BASE_URL` para CI. Se uma implantação falhar após criar a Release, reexecute os jobs falhos de implantação; não sobrescreva a Release. Limites/custos de GitHub Actions e Pages dependem da conta/plano; este fluxo não é um serviço OTA gerenciado com garantia de disponibilidade.

1. Gere uma chave RSA de pelo menos 2048 bits em ambiente seguro: `openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out /secure/ota-private.pem`.
2. Exporte a chave pública: `openssl pkey -in /secure/ota-private.pem -pubout -out /secure/ota-public.pem`.
3. Nunca inclua a privada no repositório, `.env`, bundle ou APK. Guarde a privada no secret GitHub `OTA_SIGNING_KEY`; rotação da raiz de confiança requer APK.
4. Para publicação manual fora do GitHub, use a mesma origem do manifesto embutida no APK. Publique ZIPs imutáveis primeiro, depois substitua o manifesto atomicamente. Não use redirects para outra origem.
5. O script local continua disponível para distribuição estática alternativa, recebendo metadados com URL HTTPS definitiva. No GitHub o upload é automático pelo workflow descrito acima.

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
- Conferência atual em 10/10/2026: chaves cadastradas pelo responsável e presença confirmada pela API; 343 testes locais aprovados na rodada anterior e testes do workflow production aprovados. APK assinado e downloads públicos inspecionados conforme estado acima. Resultados anteriores abaixo descrevem etapas históricas, não bloqueios atuais.
- Integração GitHub: 14 testes locais aprovados (11 do motor, 1 de assinatura/empacotamento, 2 de seleção de canais e cópia Pages). Os testes usam pacotes reais temporários assinados, validam hash, rejeitam adulteração/chave incorreta e preservam os dois canais. Execução GitHub Actions, implantação pública e download na central ainda não verificados por dependerem da configuração externa.
- 11 testes Vitest do motor: staging sem recarga, claim de abertura, offline/oculto, nativo/incompatível/suspenso/antigo/sem envelope/hash inválido, recuperação do servidor e retenção de bundles.
- 3 testes existentes de imports/rotas: aprovados.
- 1 teste real de publicação local: ZIP offline gerado, hash conferido, assinatura verificada, adulteração recusada e arquivo secreto excluído. Total: 15 testes aprovados; lint dos arquivos OTA sem erros.
- Navegador abriu Ajustes, painel real e menu; verificação fica desativada no web, sem simulação de atualização recebida.
- Testes Java de RSA adulterada, origem, semver e anti-downgrade adicionados; execução depende de JDK/Gradle Android.
- Registro automático Capacitor reconheceu o updater, mas a sincronização não terminou sem `dist/client` no ambiente; `build:android` e sincronização completa continuam obrigatórios no ambiente de compilação.
- Não verificados na central: instalação, pacote real ponta a ponta, queda de conexão durante download, falta de espaço, falha/crash e rollback nativo, persistência após atualização, rádio/GPS/chamadas durante download e comandos de voz Android 7+. Estes são requisitos antes de declarar funcionamento em produção; assinatura do APK e HTTPS de produção já foram verificados externamente.

Não considerar a entrega produção pronta até testar APK inicial → download assinado → próxima abertura → confirmação → leitura de preferências; também provocar falha de startup e conferir retorno offline à versão anterior.