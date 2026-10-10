# Tocando Agora — melhorias e validação

## Implementado
- Normalização e validação de dados reais de sessões Android e rádio interna, sem inventar faixas, artistas, capas ou frequências.
- Rádio destaca emissora e frequência somente quando explicitamente acompanhada de FM/AM nos dados ou no nome publicado; não infere frequência a partir de números isolados.
- Título ICY apresentado intacto, sem presumir que o separador identifica artista e música.
- Leitura ICY opcional da URL efetivamente reproduzida, separada do áudio e do equalizador. O player mantém sua reprodução normal mesmo se metadados falharem.
- Estados tocando, pausado, carregando, falha e informação indisponível. Comandos não antecipam confirmação de reprodução.
- Capas validadas, proporção preservada, fallback para ícone do aplicativo e depois ilustração neutra; erros de imagem reiniciam ao trocar imagem/fonte.
- Android fornece ícone do aplicativo com cache limitado de 12 entradas e estado detalhado da sessão; avanço/retrocesso são encaminhados à sessão selecionada.
- Eventos nativos continuam sendo a fonte principal; conferência periódica reduzida a cinco segundos em primeiro plano. Acesso a notificações atualiza a interface mesmo sem faixa disponível.
- ICY atualiza a cada 45 segundos quando disponível, recua para cinco minutos quando ausente, interrompe consultas ocultas/offline e impede associação de respostas antigas a outra estação.
- Layout, transparência e ausência de cabeçalho visível preservados.

## Fontes e permissões
| Fonte | Suporte efetivo | Requisito/limite |
|---|---|---|
| Rádio interna | Identidade da estação, frequência explícita, imagem publicada, estado real do áudio | Diretório/cadastro já existente; não necessita acesso a notificações |
| Rádio ICY | Parser e leitura limitada implementados no navegador e Android | Emissora precisa fornecer ICY; web exige CORS, permissão do cabeçalho Icy-MetaData e exposição de icy-metaint |
| Spotify, YouTube, YouTube Music e players Android | Metadados que a sessão externa publica, capa/ícone e controles | Usuário autoriza Acesso a notificações; o aplicativo deve expor MediaSession; verificação física pendente |
| Rádio FM/AM de hardware | Somente se o fabricante publicar sessão de mídia compatível | Sem API genérica para identificar todo rádio da central |
| Players externos no navegador | Não monitorados | Página web não acessa sessões de outros aplicativos |

Utiliza MediaSession/MediaSessionManager, NotificationListenerService, eventos HTMLAudioElement e protocolo ICY. Não foram criadas APIs de Spotify/YouTube, autenticação, reconhecimento por microfone, scraping, servidores ou serviços pagos. Diretório de rádio identifica emissora, não a música tocando. APIs oficiais adicionais exigiriam contrato autorizado e, quando aplicável, credenciais/consentimento antes de qualquer implementação.

## Limites de segurança e recursos
- ICY web: leitura máxima de 256 KB, timeout de oito segundos, aborta/cancela após um bloco; playlists são ignoradas.
- ICY Android: HTTPS público validado a cada redirecionamento, até três redirecionamentos, intervalo limitado a 250 KB, bloco máximo 4080 bytes, conexões fechadas. Timeout de conexão/leitura de dois segundos e verificações de prazo entre leituras; DNS/resolução e uma leitura bloqueante podem ultrapassar o prazo nominal de oito segundos. Abort na interface descarta a resposta; a leitura nativa encerra pelo próprio limite.
- Dados estáveis permanecem em memória; capas HTTPS usam o cache normal do navegador/provedor e ícones Android possuem cache limitado. Não existe cache persistente de títulos ICY.
- Sem metadados ou após leitura sem título, a emissora continua visível sem música fictícia. Respostas antigas de outra estação são descartadas.
- Se rádio interna e sessão externa confirmam reprodução simultânea, sessão externa tem prioridade; a fonte exibida identifica essa seleção. Pausas mantêm a última fonte disponível.

## Testes executados
- 300 testes aprovados em 54 arquivos, incluindo parser ICY fragmentado, limites, CORS indisponível, frequência AM/FM, ausência de dados, troca de estação/resposta atrasada, capas quebradas, fontes externas autorizadas simuladas, permissões, buffering e confirmação de play/pause.
- Análise estática: zero erros, 14 avisos preexistentes de Fast Refresh. Verificação automática web aprovada.
- Navegador: emissora Antena 1 apresentou identidade e capa reais; reprodução sustentada não foi confirmada (entrou em reconexão). Bossa Jazz também não sustentou estado tocando nesta execução.
- Fluxo completo verificado com áudio WAV de teste explicitamente identificado: cadastro pela interface → reprodução por HTMLAudioElement real → retorno à Home → Tocando → pausa → Pausado. A frequência 850 AM foi entrada de teste, não medição de emissora. Nenhum dado de teste foi adicionado ao catálogo do projeto.
- Capturas do widget tocando/pausado conferidas. Testes de Spotify/YouTube são dados de ponte simulada, não execução desses aplicativos reais.

## Pendências
Não foi gerado um novo APK nem executada compilação/teste Android nesta rodada: SDK/aparelho não estavam disponíveis. Compilar APK atualizado e testar na central Android 7+ e Android 14, autorizar acesso a notificações e confirmar Spotify, YouTube/Music, mudança de fonte, ícones, controles e ICY de uma transmissão compatível. Não se considera a detecção universal desses aplicativos ou música ICY ao vivo comprovada sem essa validação.