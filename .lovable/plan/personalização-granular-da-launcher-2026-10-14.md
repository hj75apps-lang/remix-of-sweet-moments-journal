# Personalização granular da launcher

## Resultado
Adicionar em Ajustes uma área compacta de “Tamanho e aparência” com controles independentes, atualização imediata e restauração segura, sem alterar aplicativos externos ou elementos nativos do Android.

## Implementação
- Ampliar as preferências existentes com valores validados e migráveis para ícones de apps, atalhos e widgets; barra lateral; textos; relógio/data; navegação/status; espaçamento e áreas de toque.
- Aplicar variáveis específicas somente nos componentes correspondentes: Home, gaveta de apps, Dock, widgets, relógio, barras e textos da launcher.
- Criar grupos expansíveis com slider, percentual/medida atual e restauração individual; incluir restauração geral com confirmação.
- Salvar automaticamente no armazenamento local já usado pelo launcher, mantendo funcionamento offline e preservando papel de parede, organização e demais preferências.
- Remover o seletor antigo de fonte global, substituindo-o pelos controles granulares para evitar escalas indiscriminadas.

## Validação
- Testar independência entre categorias, limites mínimo/padrão/máximo, persistência após recarga, alteração offline e restaurações individual/geral.
- Verificar Home, Apps e Ajustes em tela automotiva e estreita, sem cortes, colisões ou perda de toque.
- Documentar os controles efetivos e deixar o teste físico Android explicitamente pendente quando não houver acesso à central.

## Detalhes técnicos
- React funcional e TypeScript estrito; preferências no provider existente.
- Variáveis CSS sem escala global do documento e seletores locais por categoria.
- Nenhuma dependência nativa, permissão, serviço remoto ou alteração de backend.