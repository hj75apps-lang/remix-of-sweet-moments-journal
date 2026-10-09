# Proteção do backend Navigation Connect

Esta continuidade da auditoria fecha a criação anônima de viagens e substitui o contador por IP/processo por uma quota transacional compartilhada. O serviço oficial é opcional: quando autenticação, quota ou credenciais Google não estão configuradas, a Launcher conserva a abertura normal de Maps/Waze e as orientações por notificações/GPS.

## Contrato de acesso

`POST /api/navigation/trips` exige uma credencial de cliente provisionada independentemente. O servidor guarda somente seu SHA-256 em `NAVIGATION_CONNECT_CREATOR_KEYS_JSON`, um objeto com até 100 identificadores de dispositivo/usuário e hashes hexadecimais de 64 caracteres. A credencial deve ser aleatória, com pelo menos 32 caracteres base64url; a checagem de comprimento não substitui geração com entropia criptográfica. Revogar significa remover o hash desse registro. Cada identidade mantém uma quota própria.

A credencial pode chegar em `Authorization: Bearer ...` ou no cookie `__Host-sal-navigation-creator`. Cabe ao gateway autenticado provisionar o cookie com `Secure; HttpOnly; SameSite=Strict; Path=/`, sem `Domain`. Origem/CORS e headers de IP não autenticam o cliente. O POST verifica também a origem de navegador; clientes não browser com Bearer seguem o contrato de origem configurado.

No frontend autenticado, `setNavigationConnectCreatorCredential(credential)` permite usar uma credencial recebida do host autorizado somente em memória. `setNavigationConnectCreatorCredential(null)` encerra essa sessão e limpa a capacidade da viagem. O cookie do gateway acompanha chamadas de mesma origem automaticamente. Não há credencial no bundle, em variável `VITE_*`, URL ou storage. O APK precisa de provisionamento pelo host autenticado para usar o Bearer; não foi criado um login de usuário ou uma chave compartilhada dentro do APK.

`GET /api/navigation/trips/:id` continua exigindo a capacidade assinada e válida da viagem. IDs têm até 128 caracteres alfanuméricos, hífen ou underscore; percent-encoding inválido e IDs com barras retornam 400. A capacidade é conferida antes de consumir quota de leitura ou chamar o Google.

## Quota privada

O backend precisa receber o service binding `NAVIGATION_CONNECT_QUOTA`. Sem binding, erro, timeout ou resposta inválida, ele retorna 503 antes de acessar o Google. A implementação em `infrastructure/navigation-quota/worker.ts` usa uma única instância Durable Object com storage SQLite e transação para todos os limites:

| Operação | Limite | Identidade |
|---|---|---|
| Criar viagem | 5 por janela de 60 segundos | Cliente autenticado |
| Criar viagem | 100 por janela de uma hora, configurável | Projeto inteiro |
| Ler telemetria | 60 por janela de 60 segundos | Viagem com capacidade válida |

As janelas começam na primeira admissão. Falhas no Google também consomem a quota, pois são tentativas que podem ter chegado ao provedor. O teto horário é `NAVIGATION_CREATE_HOURLY_LIMIT` no serviço de quota, de 1 a 10.000; alterá-lo exige avaliar o orçamento Google. Os contadores sobrevivem a reinícios e são compartilhados entre instâncias do backend. Não há confiança em `x-forwarded-for` ou `cf-connecting-ip`. `429` informa `Retry-After`.

A configuração fornecida tem `workers_dev: false`, `preview_urls: false` e nenhuma rota pública. Ela é uma implementação revisável, **não uma implantação executada**. Para habilitar a telemetria no ambiente contratado:

1. Provisionar as identidades pelo sistema de autenticação/gateway e registrar somente os hashes no backend.
2. Implantar o serviço privado de quota na conta autorizada, preservando a configuração sem domínio/rota pública.
3. Vincular `NAVIGATION_CONNECT_QUOTA` ao serviço `smart-auto-navigation-quota` no backend existente. Exemplo de binding: `{ "binding": "NAVIGATION_CONNECT_QUOTA", "service": "smart-auto-navigation-quota" }` na lista `services` da configuração desse backend.
4. Configurar as credenciais Google e `NAVIGATION_CONNECT_SESSION_SECRET` de pelo menos 32 caracteres como secrets do servidor. Definir `NAVIGATION_CONNECT_ALLOWED_ORIGIN` com a origem exata, por exemplo `https://localhost` para o APK, quando a origem é diferente do backend.
5. Validar cliente autorizado, cliente revogado, concorrência, limite horário e indisponibilidade do serviço de quota. Nenhuma chamada ao Google deve ocorrer após recusa.

O service binding deve ficar acessível apenas ao backend autorizado. Não expor `/consume` à Internet nem substituir o Durable Object por Workers KV ou pelo binding de rate limit eventualmente consistente: o teto de criação precisa de admissão atômica entre locais. O singleton é adequado ao volume limitado desta Launcher; mudança de escala exige manter a mesma garantia de orçamento, sem criar contadores independentes por região.

## Limites externos e cliente

OAuth/criação de viagem aceitam até 32 KiB de resposta; telemetria aceita até 2 MB e 10.000 pontos. As chamadas Google exigem HTTPS, recusam redirects, têm deadline de oito segundos e acompanham o cancelamento do request. O cliente tem deadline de dez segundos, limita corpos reais e valida identidade da viagem, expiração, coordenadas, métricas e URL oficial de abertura. Erros externos não são exibidos como texto bruto nem registrados com objetos de request/credenciais.

Uma criação antiga não pode restaurar a viagem depois de logout, troca de credencial, limpeza da viagem ou criação mais recente. O cliente aborta o request e compara sua versão mesmo quando o transporte entrega uma resposta tardia. O fallback externo também respeita esse cancelamento; falhas de configuração/conectividade continuam abrindo o navegador normalmente. O deadline do cliente usa AbortController e timer, sem depender das APIs estáticas recentes AbortSignal.timeout/any em WebViews antigos.

O CI executa regressões de autenticação, rotação de headers de IP, concorrência e falhas. Um teste separado em workerd/Miniflare com SQLite persistido admite somente cinco de vinte criações concorrentes, aplica o teto horário entre clientes e reconstrói o runtime para conferir persistência. Ele não faz deploy nem acessa a conta Google.

## Pendências que exigem o ambiente real

A configuração e o provisionamento acima não foram acessíveis nesta revisão; sua presença em produção não foi certificada. Rotação de chaves históricas e orçamento/restrições do projeto Google continuam dependendo da conta do provedor.

A descoberta de rádios recebeu bloqueio de nomes locais com ponto final e faixas reservadas/benchmark/documentação. A política lexical continua sem fixar o IP conectado: DNS rebinding exige egress restrito ou transporte que resolva, valide e conecte ao mesmo IP. Não foi adotado um pré-check DNS seguido de `fetch` como se isso eliminasse a corrida. O alvo web padrão é Cloudflare; sua implementação de `node:http` não suporta a opção `lookup`, portanto transplantar uma solução Node com custom lookup daria uma proteção aparente nesse ambiente.

O preview `https://preview--hjcarlauncher.lovable.app/` redirecionou este navegador ao login da Lovable. Não foi alterada a visibilidade do preview ou do repositório. Testes visuais autenticados, telefonia/Bluetooth/faróis em hardware e o aviso moderado de `uuid` registrado na auditoria permanecem pendentes.

## Referências primárias

- [Storage transacional e consistente de Durable Objects](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/).
- [Configuração Wrangler de workers.dev, preview URLs, bindings e migrations](https://developers.cloudflare.com/workers/wrangler/configuration/).
- [Rate limiting Workers: limites locais e consistência eventual](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).
- [HTTP no Cloudflare: custom lookup não suportado](https://developers.cloudflare.com/workers/runtime-apis/nodejs/http/).
