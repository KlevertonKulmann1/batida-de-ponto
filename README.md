# ⏱️ Controle de Batida de Ponto Pessoal

Um aplicativo web leve, elegante e responsivo no estilo clássico/RPG para acompanhamento pessoal de batidas de ponto, sem necessidade de login ou senha, 100% executado no seu navegador e pronto para ser publicado no **GitHub Pages** ou instalado como **PWA** no celular.

---

## 📸 Visual e Funcionamento

Baseado fielmente na arte e estrutura do projeto:
- **Moldura:** Inspirada no `quadro.png`.
- **Botões de Batida:** Alternam interativamente entre `nao-marcado.png` e `marcado.png`, com carimbo de horário e som tátil.
- **Orbe de Status por Dia:**
  - 🔵 **Azul (`batida-aberta.png`):** Padrão do dia em aberto ou dias futuros.
  - 🟢 **Verde (`batida-correta.png`):** Quando todos os pontos previstos do dia foram batidos.
  - 🔴 **Vermelho (`batida-faltando.png`):** Se o dia terminou e ficou alguma batida pendente.

---

## 🌟 Principais Recursos

1. **Pronto para Celular e Computador:**
   - Layout responsivo que se adapta perfeitamente a qualquer tamanho de tela.
   - Suporte a PWA (`manifest.json` e `sw.js`): adicione à tela inicial do iPhone ou Android e use como aplicativo nativo mesmo **sem internet**.
2. **Navegação entre Semanas:**
   - Botões `‹` (anterior), `›` (próxima) e `Hoje`.
   - Menu seletor que lista automaticamente todas as semanas que possuem registros salvos.
3. **Botão Rápido "🕒 Bater Ponto":**
   - Ao abrir no celular, basta dar um toque para marcar automaticamente o próximo horário pendente do dia atual com o horário exato.
4. **Registro de Log por Interação:**
   - Cada clique (marcação ou desmarcação) gera um log com data, hora, dia da semana e ação.
   - Permite consultar o histórico e baixar em formato **CSV (Excel)**.
5. **Configuração Flexível de Horários:**
   - Grade padrão baseada no `exemplo.png`:
     - **Segunda:** 08:00, 08:15, 08:45, 11:00, 11:30, 17:00, 18:00, 20:00
     - **Terça:** 08:00, 18:00
     - **Quarta:** 08:00, 08:15, 08:45, 11:00, 11:30, 17:00, 18:00, 20:00
     - **Quinta:** 08:00, 18:00
     - **Sexta:** 08:00, 17:00, 18:00, 19:00
   - Você pode adicionar, editar ou remover horários de qualquer dia pelo botão **"⚙️ Horários"**.
6. **Backup e Sincronização:**
   - Exportação e importação de arquivo JSON ou cópia de texto para transferir seus pontos entre o computador e o celular.

---

## 🚀 Como Publicar no GitHub Pages (Passo a Passo)

Para ter seu controle acessível de qualquer lugar pelo celular:

### 1. Criar repositório no GitHub
1. Acesse [github.com/new](https://github.com/new).
2. Dê um nome ao repositório (ex: `ponto` ou `controle-ponto`).
3. Deixe o repositório como **Public** e clique em **Create repository**.

### 2. Enviar os arquivos pelo terminal
No terminal do seu computador (dentro da pasta deste projeto), execute:

```bash
git init
git add .
git commit -m "feat: meu controle de ponto"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin main
```
*(Substitua `SEU_USUARIO` e `SEU_REPOSITORIO` pelos seus dados do GitHub)*

### 3. Ativar o GitHub Pages
1. No seu repositório no GitHub, clique na aba **Settings** (Configurações).
2. No menu lateral esquerdo, clique em **Pages**.
3. Em **Build and deployment > Branch**, selecione `main` e a pasta `/ (root)`.
4. Clique em **Save**.
5. Aguarde cerca de 1 a 2 minutos. O GitHub exibirá o link público:
   `https://SEU_USUARIO.github.io/SEU_REPOSITORIO/`

---

## 📱 Como Usar no Celular como Aplicativo

1. Abra o link do seu GitHub Pages no navegador do celular (Chrome ou Safari).
2. **No Android (Google Chrome):**
   - Toque nos três pontinhos do navegador e selecione **"Adicionar à tela inicial"** ou **"Instalar aplicativo"**.
3. **No iPhone (Safari):**
   - Toque no botão de compartilhamento (ícone de quadrado com seta para cima) e escolha **"Adicionar à Tela de Início"**.
4. Pronto! O ícone do relógio aparecerá na tela do seu celular e abrirá em tela cheia, funcionando inclusive offline.
