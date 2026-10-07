# Plano de estabilização — Smart Auto Launcher

## Objetivo
Reduzir riscos de segurança e release antes de ampliar funcionalidades. Executar em incrementos pequenos, mantendo mudanças revisáveis em pull request.

## Fase 1 — Segurança e infraestrutura (P0)
- [x] Parar de versionar arquivos .env e adicionar .env.example sem valores secretos.
- [x] Desabilitar mixed content global no WebView Android.
- [x] Corrigir configuração do SDK Android no workflow e executar validação em PR.
- [ ] Rotacionar/restringir chaves que já estiveram no histórico Git; remoção do arquivo atual não apaga commits antigos.
- [ ] Confirmar a compilação do APK no CI após esta alteração.
- [ ] Auditar política de URLs/SSRF e permissões Android com testes específicos.
- [ ] Atualizar dependências vulneráveis somente com lockfile regenerado e build/testes verdes.

## Fase 2 — Estabilidade (P0/P1)
- [ ] Centralizar detecção de capabilities do dispositivo Android.
- [ ] Unificar localização nativa/web e compartilhamento da última posição.
- [ ] Criar camada de storage com schemas e migrações versionadas.
- [ ] Revisar ciclo de vida de listeners nativos e retomada/suspensão.

## Fase 3 — Qualidade (P1)
- [ ] Adicionar typecheck explícito ao CI após validar configuração TypeScript.
- [ ] Ampliar testes de Home: layout, reorder, resize, undo, reset e persistência.
- [ ] Testar clima, permissões e erros de serviços externos.
- [ ] Adicionar testes de integração dos bridges e smoke tests Android.
- [ ] Definir cobertura mínima baseada no baseline real.

## Fase 4 — Compatibilidade automotiva (P1)
- [ ] Criar matriz por versão Android e hardware.
- [ ] Validar HOME role, boot, telefone, Bluetooth, GPS, mídia e voz em hardware real.
- [ ] Registrar limitações conhecidas por fabricante/ROM.

## Fase 5 — Produto e release (P2)
- [ ] Criar pipeline de release assinado com keystore armazenada em GitHub Secrets.
- [ ] Padronizar nome/metadata e reescrever README para o produto atual.
- [ ] Medir startup e adiar serviços não essenciais até a Home estar visível.
- [ ] Executar checklist de release e publicar artefatos versionados.

## Critérios de conclusão da estabilização
- CI de PR verde (lint, testes, build web e APK debug).
- Nenhum segredo ativo no repositório; chaves anteriormente commitadas rotacionadas/restritas.
- APK instalado e validado em pelo menos uma central real.
- Permissões solicitadas sob demanda e documentadas.
- Fluxos críticos com testes automatizados e limitações documentadas.

## Observações de segurança
Remover .env da ponta atual do branch não remove seu conteúdo do histórico Git. Se uma chave esteve commitada, revogue/rotacione-a no provedor e restrinja-a por API e origem. Não publique keystores nem segredos em arquivos do projeto.
