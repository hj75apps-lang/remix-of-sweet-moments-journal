# Auditoria de desempenho — 9 de outubro de 2026

## Cobertura e limites

Revisão das rotas, componentes, hooks, contextos, consultas, APIs, armazenamento local, CSS, assets, dependências, SSR, scripts e integrações Android. O projeto não possui Supabase conectado, banco, autenticação, storage ou realtime: não há consultas SQL a otimizar e nenhum desses sistemas será criado.

Baseline em Vite de desenvolvimento, Chromium, 1280×1800, GPS autorizado: 250 recursos, 182 módulos/scripts, 214 elementos DOM, 55 tiles carregados; DOMContentLoaded 2443 ms, load 2484,5 ms, heap aproximado 42,1 MB. São medições exploratórias, não métricas de produção nem Core Web Vitals. Cache, rede e compilação de desenvolvimento influenciam os tempos; não usar uma execução isolada para prometer porcentagem de ganho.

Testes antes das alterações: 245 aprovados e uma expectativa antiga de texto na previsão falhou (esperava prefixo Hoje, já removido da interface). A correção deve atualizar apenas essa expectativa, preservando o texto escolhido pelo usuário.

## Gargalos e prioridades

| Prioridade | Problema confirmado | Impacto | Melhoria segura |
|---|---|---|---|
| Alta | Modo do mapa grava uma Date a cada segundo | Re-renderizações do mapa mesmo sem mudança de tema | Guardar somente o estado noturno; verificar em minutos alinhados e ao retornar, incluindo exatamente 18h/6h |
| Alta | Relógio exibe minutos, mas atualiza a cada segundo | Formatação de data/hora e renderização 60 vezes por minuto | Atualizar no limite do minuto; pausar quando oculto e sincronizar ao retornar |
| Alta | Polling de mídia chama a ponte nativa a cada segundo mesmo oculto | CPU e comunicação JS/Android desnecessárias em segundo plano | Pausar leituras periódicas quando oculto; manter eventos e comandos reais ativos |
| Alta | Leituras idênticas de mídia geram novos objetos | Consumidores redesenhados sem mudança real | Reutilizar snapshots quando todos os campos de mídia forem iguais |
| Média | Motor de rádio retorna novo objeto em cada render do provedor | Mudanças no histórico propagam atualização a consumidores sem alteração do player | Memoizar retorno do motor e valores dos contextos |
| Média | Modal de adicionar widgets e previsão detalhada carregam na Home fechados | Mais módulos no carregamento inicial | Importar sob demanda, com Suspense e estrutura estável; não atrasar o mapa principal |
| Média | Mudança cartográfica de filtro chama setUrl com URL igual | Leaflet redesenha tiles desnecessariamente | Atualizar filtro e crédito sem recarregar a fonte quando a URL não mudou |
| Média | Rotação cria RAF mesmo sem mudança de direção | Trabalho de animação durante GPS parado | Animar somente diferenças de direção relevantes |
| Baixa | Lista ampliada usa estimativa de altura antiga (64px) | Barra de rolagem e cálculo de posição menos estáveis | Alinhar estimativa ao mínimo de 96px e manter fallback para WebView antigo |
| Baixa | Estado inicial do clima lê navegador/documento durante render | Risco de hidratação divergente offline/oculto | Estado inicial estável; leitura no efeito existente |

## O que já está adequado e será preservado

- Rotas divididas pelo TanStack e cache de consultas de 15–30 minutos; HLS e Leaflet já são carregados sob demanda.
- GPS compartilhado, limpeza de listeners nativos, RAF/mapa, áudio e assinatura das notificações.
- Eventos reais como fonte da reprodução; não assumir sucesso de play/pause.
- Filtro/busca adiados, ranking de escuta e fila de próxima/anterior independente.
- Créditos OSM, GPS real, modos 2D/3D/Automático, escolha do veículo, noite 18h–6h e onda circular.
- Layout, transparência e fontes. Blur é caro em GPUs fracas, mas é configurável e não será reduzido arbitrariamente.
- Assets públicos pequenos (~219 KB) não participam do primeiro carregamento: preservar referências e uploads.
- Dependências de componentes não usados são eliminadas do bundle por tree shaking; removê-las não demonstra melhoria de runtime, portanto não serão excluídas indiscriminadamente.
- Todas as seis rotas possuem metadados próprios. Não adicionar imagens sociais fictícias ou relativas.

## Validação prevista

- Testes completos antes/depois, mais testes de relógio, agendamento noturno, identidade de snapshots e pausa de polling oculto.
- Percorrer Home, Rádio, Apps, Ajustes, Clima e Telefone; abrir previsão e retornar pela casa; confirmar escolha do mapa após navegação.
- Reprodução de áudio real de teste e controles Rádio → Home → pausa/retomada.
- Screenshots desktop/mobile, tiles e marcador visíveis, console e ausência de overflow.
- Comparar recursos iniciais em condições equivalentes, separando resultado medido de inferência.
- Android físico, consumo de GPU/FPS, bateria e memória durante horas, R8/release e Lighthouse/Core Web Vitals publicados exigem medições específicas; não declará-los verificados apenas pelo navegador local.