# Plano de estabilização — Smart Auto Launcher

## Objetivo
Reduzir riscos de segurança e release antes de ampliar funcionalidades. Executar em incrementos pequenos, mantendo mudanças revisáveis em pull request.

## Fase 1 — Segurança e infraestrutura (P0)
- [x] Parar de versionar arquivos .env e adicionar .env.example sem valores secretos.
- [x] Desabilitar mixed content global no WebView Android.
- [x] Corrigir configuração do SDK Android no workflow e executar validação em PR.
- [ ] Rotacionar/restringir chaves que já estiveram no histórico Git; remoção do arquivo atual não apaga commits antigos.
- [x] Workflow de APK corrigido para SDK 36, lint/testes unitários e artifact de debug; validação final depende de uma execução do Actions.
- [x] Política HTTPS/SSRF coberta por testes e permissões Bluetooth/voz/localização solicitadas sob demanda.
- [x] Versões críticas atuais conferidas: TanStack Start 1.168.60 e Vitest 4.1.10 já estão em versões corrigidas; lockfile permanece versionado.

## Fase 2 — Estabilidade (P0/P1)
- [x] Camada de capabilities com cache e hook React criada.
- [x] Location store compartilhado entre navegação e clima.
- [x] Storage versionado criado e Home/settings/clima migrados com compatibilidade legada.
- [x] Location store usa ref-count; NavigationProvider inicia apenas quando há consumidores visíveis e listeners existentes são removidos no cleanup.

## Fase 3 — Qualidade (P1)
- [x] Typecheck explícito adicionado ao script e ao CI.
- [x] Testes de Home cobrem layout, reorder, resize, undo, reset e persistência.
- [x] Testes de clima cobrem transformação da resposta e erro HTTP; permissões críticas foram revisadas.
- [x] Smoke test Android adicionado; execução em dispositivo/emulador ainda depende do runner de instrumentação.
- [ ] Definir cobertura mínima baseada no baseline real.

## Fase 4 — Compatibilidade automotiva (P1)
- [x] Matriz API 24–36 e checklist de campo documentados.
- [ ] Validar HOME role, boot, telefone, Bluetooth, GPS, mídia e voz em hardware real.
- [x] Limitações conhecidas de boot em background e package visibility documentadas.

## Fase 5 — Produto e release (P2)
- [x] Pipeline de release assinado criado; requer configuração dos quatro secrets da keystore.
- [x] Nome/metadata e README padronizados para Smart Auto Launcher.
- [x] Medição startup→Home adicionada; navegação/GPS já é ativada somente quando consumida.
- [ ] Executar checklist de release e publicar artefatos versionados.

## Critérios de conclusão da estabilização
- CI de PR verde (lint, testes, build web e APK debug).
- Nenhum segredo ativo no repositório; chaves anteriormente commitadas rotacionadas/restritas.
- APK instalado e validado em pelo menos uma central real.
- Permissões solicitadas sob demanda e documentadas.
- Fluxos críticos com testes automatizados e limitações documentadas.

## Observações de segurança
Remover .env da ponta atual do branch não remove seu conteúdo do histórico Git. Se uma chave esteve commitada, revogue/rotacione-a no provedor e restrinja-a por API e origem. Não publique keystores nem segredos em arquivos do projeto.
