# Como Configurar seu Cloudflare Worker para Notificações Push

Este guia ensina como ativar notificações automáticas no seu celular para o **Controle de Ponto**.
Mesmo com o celular bloqueado ou com o app 100% fechado, ele tocará e vibrará nos minutos exatos de bater o ponto!

---

### Passo 1: Criar sua conta na Cloudflare (Grátis)
1. Acesse [dash.cloudflare.com](https://dash.cloudflare.com/) e crie uma conta gratuita (ou faça login se já tiver).

---

### Passo 2: Criar o Worker
1. No menu lateral esquerdo, clique em **Compute (Workers) > Workers & Pages**.
2. Clique no botão azul **Create application** (ou **Create Worker**).
3. Selecione a aba **Workers** e clique em **Create Worker**.
4. Dê um nome (por exemplo: `ponto-lembretes`) e clique em **Deploy**.

---

### Passo 3: Colar o Código do Worker
1. Na tela de confirmação, clique em **Edit code** (ou vá em *Deployments > Edit code*).
2. Apague todo o código de exemplo que estiver lá.
3. Abra o arquivo [`worker.js`](worker.js) deste projeto, copie todo o conteúdo e cole no editor da Cloudflare.
4. Clique em **Deploy** no canto superior direito para salvar.

---

### Passo 4: Criar o Armazenamento KV (Onde seus horários ficam salvos)
1. No menu lateral da Cloudflare, clique em **Storage & Databases > KV**.
2. Clique em **Create namespace**.
3. No campo *Namespace Name*, digite: `PONTO_KV` e clique em **Add**.
4. Agora volte em **Workers & Pages**, clique no seu worker (`ponto-lembretes`) e vá na aba **Settings > Bindings**.
5. Clique em **Add > KV Namespace**:
   - **Variable name:** `PONTO_KV` (deve ser exatamente em maiúsculas assim).
   - **KV namespace:** selecione o `PONTO_KV` que você criou.
6. Clique em **Save and deploy**.

---

### Passo 5: Ativar o Agendador (Cron Trigger - a cada minuto)
1. Ainda na página do seu Worker, clique na aba **Settings > Triggers** (ou na aba **Triggers** no topo).
2. Na seção **Cron Triggers**, clique em **Add Cron Trigger**.
3. No campo cron, digite: `* * * * *` (que significa rodar a cada 1 minuto).
4. Clique em **Add Trigger**.

---

### Passo 6: Conectar no seu Aplicativo de Ponto!
1. Copie o endereço do seu Worker (ele aparece no topo da página, ex: `https://ponto-lembretes.seu-usuario.workers.dev`).
2. Abra o seu **Controle de Ponto** no celular ou computador.
3. Abra as **Configurações (⚙️ Horários)**.
4. Na seção **Notificações Push**, cole a URL do seu Worker e clique em **"Ativar Notificações"**.
5. O navegador vai pedir permissão: clique em **Permitir**.
6. Clique no botão **"🔔 Enviar Notificação de Teste"** para ver seu celular vibrar e apitar na hora!
