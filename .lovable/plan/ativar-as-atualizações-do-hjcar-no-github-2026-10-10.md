# Ativar as atualizações do HJCar no GitHub

## Decisão confirmada
Usar `hj75apps-lang/remix-of-sweet-moments-journal` e torná-lo público, conforme sua escolha. O acesso ao repositório foi confirmado; atualmente ele é privado e o fluxo de distribuição preparado exige um repositório público.

## Plano
1. Conferir permissões e o conteúdo do repositório, incluindo o histórico, antes de expor o código. Se houver credenciais, interromper a mudança de visibilidade e resolver a exposição com segurança.
2. Tornar o repositório público e habilitar GitHub Pages com publicação por GitHub Actions. Conferir se os arquivos de atualização preparados chegaram ao repositório.
3. Configurar assinatura segura das atualizações. Reutilizar uma chave OTA existente quando disponível; caso contrário, preparar uma nova chave privada exclusivamente para os secrets do GitHub e sua chave pública para o aplicativo. Nunca colocar a chave privada no código ou APK.
4. Configurar os canais de teste e produção, proteções de publicação disponíveis na conta e o endereço definitivo de atualização. Confirmar o endereço fornecido pelo Pages antes de incorporá-lo ao APK.
5. Publicar um pacote de teste compatível e verificar a assinatura, integridade e disponibilidade do manifesto e ZIP no mesmo endereço HTTPS.
6. Preparar o APK inicial configurado e validar na central: baixar a atualização, ativá-la na próxima abertura, preservar preferências e recuperar a versão anterior em caso de falha. Não declarar atualizações automáticas prontas sem esse teste.

## Detalhes técnicos
- Distribuição: GitHub Releases arquiva os pacotes assinados; GitHub Pages serve manifesto e ZIP sem mudar de origem.
- Configurações: `OTA_SIGNING_KEY` em secrets; `OTA_PUBLIC_KEY`, `OTA_MANIFEST_URL` e `OTA_BUILTIN_SEQUENCE` como variáveis, conforme os fluxos existentes.
- A assinatura OTA é diferente da assinatura Android. Atualizar um APK já instalado exige a chave Android original; sem ela, não será prometida instalação por cima com preservação de dados.
- Nenhum banco, autenticação, armazenamento ou serviço Lovable será criado.

## Possíveis dependências
Se as permissões do GitHub não permitirem alguma configuração, informar a ação exata necessária. A chave Android original e o teste físico na central podem depender de você; chaves privadas nunca serão solicitadas como texto no chat.