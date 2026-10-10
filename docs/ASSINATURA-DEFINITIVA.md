# Assinatura definitiva — etapa assistida

Nenhuma chave ou APK novo foi criado. As ferramentas disponíveis geram apenas strings aleatórias, não keystores Android ou pares RSA. As chaves precisam ser criadas no computador confiável do responsável e mantidas em backup protegido, fora do código.

Instale Java JDK 21, OpenSSL e GitHub CLI. A geração e cadastro seguro exigem uma etapa assistida; não envie chaves ou senhas pelo chat.

Android: criar keystore JKS com RSA 3072, alias hjcar-release e senha forte digitada interativamente. OTA: criar par RSA 3072 separado, com privada protegida localmente e pública exportada. Nunca executar com rastreamento de comandos ou guardar no repositório.

GitHub: Settings → Secrets and variables → Actions precisa receber ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS e ANDROID_KEY_PASSWORD. OTA_SIGNING_KEY pertence aos environments ota-testing e ota-production; OTA_PUBLIC_KEY é variável do repositório. Não substituir identidades existentes. Guardar as chaves e senha em backup permanente: secrets do GitHub não podem ser baixados como cópia de segurança.

Após essas configurações: gerar Android Release, verificar assinatura e configuração OTA, publicar pacote compatível e testar download e próxima abertura na central, incluindo preferências e recuperação offline. Não desinstalar o app antigo antes de proteger os dados. Nova assinatura impede substituição direta.
