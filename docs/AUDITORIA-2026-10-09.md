# Auditoria técnica — 9 de outubro de 2026

## Escopo e resultado

Revisão das rotas, componentes, estados globais, persistência local, serviços remotos, reprodução, mapa e projeto Android. Aparência, funcionalidades, fontes de dados e arquitetura de integração preservadas. Nenhum banco, autenticação ou backend novo foi criado.

## Defeitos confirmados corrigidos

- Ajustes Android: preferências nativas, brilho e navegador só recebem valores depois da restauração, evitando que padrões transitórios sobrescrevam escolhas salvas.
- Rádios manuais: validação compartilhada, endereços HTTPS sem credenciais, identificação acessível dos erros e preservação dos valores nos eventos de edição.
- Filtro de estado: captura síncrona do valor antes da atualização funcional de React.
- Lista de rádios manuais: operações consecutivas usam o estado corrente mesmo antes da próxima renderização, impedindo perda de adições/remoções; estado em memória permanece disponível quando o armazenamento falha.
- Mapa: remoção de reposicionamento duplicado e estabilização da dependência que solicita localização, mantendo GPS e zoom.

## Validação final

- 261 testes aprovados em 49 arquivos, incluindo regressões de restauração Android, validação/acessibilidade e edições consecutivas.
- Compilação automática: `build OK` às 18:49:28 UTC.
- Lint: zero erros; 14 avisos existentes da regra de Fast Refresh para módulos que exportam contexto/hook junto do provider. Não são falhas de execução; não foram ocultados por supressões.
- Playwright: Início, Rádio, Apps, Ajustes, Clima e Telefone acessíveis; nenhuma exceção de página na sessão final.
- Previsão real Open-Meteo, abertura/retorno e acesso pelo launcher verificados.
- Formulário: URL com credenciais rejeitada, URL válida salva e transmissão WAV real reproduzida; Rádio → Início → pausa → retomada confirmados. O áudio usou resposta de teste controlada, não comprova disponibilidade permanente de cada estação.
- Filtro de São Paulo selecionado na interface; ausência de overflow horizontal em 1280×720 e 390×844; sessão principal em 1280×1800.
- Rotas de conteúdo, inclusive `/`, mantêm títulos, descrições e metadados sociais próprios.

## Segurança e dependências

Consulta dos advisories npm para 621 nomes de pacotes instalados: um advisory moderado para `uuid@7.0.3`, transitivo de `xcode` → CLI do Capacitor. Afeta buffer fornecido aos métodos v3/v5/v6; não pertence ao player web nem ao APK em execução. Mantido sem troca forçada de versão major; atualização deve acompanhar uma versão compatível da ferramenta upstream. React, Vite, Capacitor Core, HLS e Leaflet não retornaram advisories nessa consulta. A consulta não equivale a garantia absoluta de segurança.

Leitura nativa de sites de rádio mantém restrições de HTTPS público, destinos e tamanho. Não foram criadas permissões abertas, credenciais embutidas ou alterações de schema.

## Hipóteses rejeitadas

- Leaflet permanece atrás do carregamento cliente existente; importação no módulo lazy não demonstrou falha SSR.
- Desconexão após erro terminal do rádio já é protegida pela identidade do elemento ativo, limpa por `stopAll`; nenhuma mudança especulativa aplicada.
- Rejeitar previsão diária incompleta preserva o contrato de seis dias e o último cache válido; aceitar lacunas violaria essa exigência.
- Revalidação de migração quando armazenamento está cheio não demonstrou perda de dados; cache global por chave introduziria risco de leituras antigas.
- SDK alvo 36 preservado; minSdk 24 confirmado tanto na configuração do app quanto no Capacitor Android instalado.

## Limitações e pendências externas

Nenhuma central física conectada nesta auditoria; nenhum APK novo gerado. Boot/autostart, permissões de sobreposição no Android moderno, chamadas/Bluetooth, volante, reconhecimento de voz, sessões de players externos e janela do navegador continuam exigindo teste na central. MinSdk configurado não substitui execução em Android 7. Trânsito real depende de autorização de conexão do provedor, já registrada no roadmap.

Não é possível certificar prontidão integral de produção ou incorporação de aplicativos externos apenas pelos testes web e pela revisão de código.