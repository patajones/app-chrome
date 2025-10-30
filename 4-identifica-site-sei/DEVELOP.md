# 📚 DEVELOP.md - Identifica Site SEI

## 📁 Estrutura de Arquivos

```
4-identifica-site-sei/
├── manifest.json         # Configuração da extensão
├── background.js         # Service worker (processo em background)
├── content.js           # Script injetado nas páginas web
├── sidepanel.html       # Interface do painel lateral
├── sidepanel.js         # Lógica do painel lateral
└── README.md            # Documentação para usuários
```

---

## 🔄 Fluxo de Execução

### 1️⃣ Inicialização da Extensão

**Arquivo:** `background.js`

```javascript
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
```

**O que acontece:**
- Quando a extensão é instalada ou atualizada
- Configura o comportamento do painel lateral para abrir ao clicar no ícone da extensão

---

### 2️⃣ Detecção de Site SEI

**Arquivo:** `content.js`

#### Função: `isSEISite()`
```javascript
function isSEISite() {
  const hasSEITitle = document.title.includes('SEI');
  const hasSEIElements = document.getElementById('divInfraBarraSistema') !== null;
  const hasSEILogo = document.querySelector('[src*="sei_barra"]') !== null;
  return hasSEITitle || hasSEIElements || hasSEILogo;
}
```

**O que faz:**
- Verifica se a página atual é um site SEI
- Procura por 3 características:
  1. Título contém "SEI"
  2. Elemento `divInfraBarraSistema` existe (barra superior do SEI)
  3. Imagem com "sei_barra" no src (logo do SEI)

#### Função: `extractLoginInfo()`
```javascript
function extractLoginInfo() {
  const loginForm = document.getElementById('frmLogin');
  if (loginForm) {
    return { isLoggedIn: false, userName: null, userUnit: null };
  }
  
  const userLink = document.getElementById('lnkUsuarioSistema');
  const unitLink = document.getElementById('lnkInfraUnidade');
  
  if (userLink && unitLink) {
    return {
      isLoggedIn: true,
      userName: userLink.getAttribute('title') || userLink.textContent.trim(),
      userUnit: unitLink.getAttribute('title') || unitLink.textContent.trim()
    };
  }
  
  return { isLoggedIn: false, userName: null, userUnit: null };
}
```

**O que faz:**
- **Verifica tela de login:** Se existe `frmLogin`, usuário não está logado
- **Extrai dados do usuário logado:**
  - `lnkUsuarioSistema`: link com nome do usuário
  - `lnkInfraUnidade`: link com nome da unidade
- Retorna objeto com status de login e informações

#### Execução Automática
```javascript
if (isSEISite()) {
  const url = window.location.origin;
  
  chrome.runtime.sendMessage({
    type: 'seiSiteDetected',
    data: { url }
  });
  
  const loginInfo = extractLoginInfo();
  chrome.runtime.sendMessage({
    type: 'seiLoginInfo',
    data: { url, ...loginInfo }
  });
}
```

**O que acontece:**
1. Verifica se é site SEI
2. Envia mensagem `seiSiteDetected` com a URL
3. Extrai informações de login
4. Envia mensagem `seiLoginInfo` com status e dados

---

### 3️⃣ Processamento em Background

**Arquivo:** `background.js`

#### Listener de Mensagens
```javascript
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'seiSiteDetected') {
    // Salvar site detectado
  }
  
  if (msg.type === 'seiLoginInfo') {
    // Atualizar informações de login
  }
});
```

#### Tratamento: `seiSiteDetected`
```javascript
chrome.storage.local.get(['seiSites'], (result) => {
  const sites = result.seiSites || [];
  const existing = sites.find(s => s.url === msg.data.url);
  
  if (!existing) {
    sites.push({
      url: msg.data.url,
      firstDetected: new Date().toISOString()
    });
    chrome.storage.local.set({ seiSites: sites });
  }
});
```

**O que faz:**
- Busca lista de sites no storage
- Verifica se o site já existe
- Se não existe, adiciona à lista com timestamp
- Salva de volta no storage

#### Tratamento: `seiLoginInfo`
```javascript
chrome.storage.local.get(['seiSites'], (result) => {
  const sites = result.seiSites || [];
  const site = sites.find(s => s.url === msg.data.url);
  
  if (site) {
    site.isLoggedIn = msg.data.isLoggedIn;
    site.userName = msg.data.userName;
    site.userUnit = msg.data.userUnit;
    site.lastChecked = new Date().toISOString();
    chrome.storage.local.set({ seiSites: sites });
  }
});
```

**O que faz:**
- Busca o site na lista
- Atualiza informações de login:
  - `isLoggedIn`: true/false
  - `userName`: nome completo do usuário
  - `userUnit`: sigla e nome da unidade
  - `lastChecked`: timestamp da última verificação
- Salva de volta no storage

---

### 4️⃣ Exibição no Painel Lateral

**Arquivo:** `sidepanel.js`

#### Função: `renderSites()`
```javascript
function renderSites() {
  chrome.storage.local.get(['seiSites'], (result) => {
    currentSites = result.seiSites || [];
    const content = document.getElementById('content');
    
    if (currentSites.length === 0) {
      content.innerHTML = `<div class="empty-state">...</div>`;
      return;
    }
    
    content.innerHTML = `
      <div class="site-selector">
        <select id="siteSelect">
          <option value="">Selecione um site SEI</option>
          ${currentSites.map((site, index) => 
            `<option value="${index}">${site.url}</option>`
          ).join('')}
        </select>
      </div>
      <div id="siteInfoContainer"></div>
    `;
    
    const select = document.getElementById('siteSelect');
    if (select) {
      select.addEventListener('change', showSiteInfo);
    }
  });
}
```

**O que faz:**
1. Busca lista de sites do storage
2. Se vazio, mostra mensagem de "nenhum site detectado"
3. Cria um `<select>` com todos os sites
4. Adiciona event listener para detectar mudanças na seleção

#### Função: `showSiteInfo()`
```javascript
function showSiteInfo() {
  const select = document.getElementById('siteSelect');
  const index = select.value;
  const container = document.getElementById('siteInfoContainer');
  
  if (index === '') {
    container.innerHTML = '';
    return;
  }
  
  const site = currentSites[index];
  const isLoggedIn = site.isLoggedIn || false;
  
  container.innerHTML = `
    <div class="site-info">
      <div class="status ${isLoggedIn ? 'logged-in' : 'logged-out'}">
        ${isLoggedIn ? '✓ Logado' : '✗ Não logado'}
      </div>
      ${isLoggedIn ? `
        <div class="info-row">
          <span class="label">Usuário:</span>
          <span class="value">${site.userName || 'Não disponível'}</span>
        </div>
        <div class="info-row">
          <span class="label">Unidade:</span>
          <span class="value">${site.userUnit || 'Não disponível'}</span>
        </div>
      ` : `
        <div class="info-row">
          <span class="value">Faça login no site para ver as informações.</span>
        </div>
      `}
      <div class="info-row">
        <span class="label">URL:</span>
        <span class="value">${site.url}</span>
      </div>
      <button id="btnCheckStatus" data-index="${index}">Atualizar Status</button>
    </div>
  `;
  
  const btn = document.getElementById('btnCheckStatus');
  if (btn) {
    btn.addEventListener('click', () => checkSiteStatus(index));
  }
}
```

**O que faz:**
1. Pega o índice do site selecionado
2. Busca dados do site no array `currentSites`
3. Renderiza informações:
   - **Status de login** (verde se logado, vermelho se não)
   - **Usuário e Unidade** (apenas se logado)
   - **URL do site**
   - **Botão "Atualizar Status"**
4. Adiciona event listener ao botão

#### Função: `checkSiteStatus(index)`
```javascript
function checkSiteStatus(index) {
  const site = currentSites[index];
  
  chrome.tabs.create({ url: site.url, active: false }, (tab) => {
    setTimeout(() => {
      chrome.tabs.remove(tab.id);
      setTimeout(() => {
        renderSites();
        document.getElementById('siteSelect').value = index;
        showSiteInfo();
      }, 1000);
    }, 2000);
  });
}
```

**O que faz:**
1. Abre o site em uma nova aba (em background)
2. Aguarda 2 segundos (tempo para o content script executar)
3. Fecha a aba
4. Aguarda 1 segundo
5. Re-renderiza o painel com as informações atualizadas

#### Listener de Mudanças no Storage
```javascript
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.seiSites) {
    const select = document.getElementById('siteSelect');
    const selectedIndex = select ? select.value : '';
    renderSites();
    if (selectedIndex && select) {
      setTimeout(() => {
        select.value = selectedIndex;
        showSiteInfo();
      }, 100);
    }
  }
});
```

**O que faz:**
- Escuta mudanças no `chrome.storage.local`
- Quando `seiSites` é atualizado, re-renderiza o painel
- Mantém o site selecionado após atualização

---

## 🗂️ Estrutura de Dados

### Storage (`chrome.storage.local`)

```javascript
{
  "seiSites": [
    {
      "url": "https://sei.stj.jus.br",
      "firstDetected": "2025-10-29T12:00:00.000Z",
      "isLoggedIn": true,
      "userName": "Ricardo Bernardes dos Santos (ricardo.santos/CJF)",
      "userUnit": "Seção de Suporte à Infraestrutura",
      "lastChecked": "2025-10-29T12:30:00.000Z"
    },
    {
      "url": "https://sei.cjf.jus.br",
      "firstDetected": "2025-10-29T11:45:00.000Z",
      "isLoggedIn": false,
      "userName": null,
      "userUnit": null,
      "lastChecked": "2025-10-29T12:15:00.000Z"
    }
  ]
}
```

---

## 📨 Mensagens (Chrome Runtime)

### Tipo: `seiSiteDetected`
```javascript
{
  type: 'seiSiteDetected',
  data: {
    url: 'https://sei.stj.jus.br'
  }
}
```
**Origem:** `content.js`  
**Destino:** `background.js`  
**Propósito:** Notificar que um novo site SEI foi detectado

### Tipo: `seiLoginInfo`
```javascript
{
  type: 'seiLoginInfo',
  data: {
    url: 'https://sei.stj.jus.br',
    isLoggedIn: true,
    userName: 'Ricardo Bernardes dos Santos (ricardo.santos/CJF)',
    userUnit: 'Seção de Suporte à Infraestrutura'
  }
}
```
**Origem:** `content.js`  
**Destino:** `background.js`  
**Propósito:** Enviar informações de login do site

---

## 🎯 Permissões Necessárias

### `manifest.json`
```json
{
  "permissions": ["sidePanel", "tabs", "storage"]
}
```

- **`sidePanel`**: Para criar e gerenciar o painel lateral
- **`tabs`**: Para criar/fechar abas ao atualizar status
- **`storage`**: Para salvar lista de sites e informações

---

## 🔧 APIs Utilizadas

### Chrome Extensions APIs

1. **`chrome.runtime.onInstalled`**: Detecta instalação/atualização
2. **`chrome.runtime.onMessage`**: Comunicação entre scripts
3. **`chrome.runtime.sendMessage`**: Enviar mensagens
4. **`chrome.sidePanel.setPanelBehavior`**: Configurar comportamento do painel
5. **`chrome.storage.local.get`**: Ler dados do storage
6. **`chrome.storage.local.set`**: Salvar dados no storage
7. **`chrome.storage.onChanged`**: Detectar mudanças no storage
8. **`chrome.tabs.create`**: Criar nova aba
9. **`chrome.tabs.remove`**: Fechar aba

### Web APIs

1. **`document.getElementById`**: Buscar elementos no DOM
2. **`document.querySelector`**: Buscar elementos com seletores CSS
3. **`document.title`**: Acessar título da página
4. **`Element.getAttribute`**: Obter atributos de elementos
5. **`Element.textContent`**: Obter texto de elementos
6. **`Element.addEventListener`**: Adicionar event listeners

---

## 🚀 Ciclo de Vida Completo

1. **Usuário navega em um site**
   - `content.js` é injetado automaticamente (via `manifest.json`)

2. **Content script detecta site SEI**
   - `isSEISite()` verifica características
   - `extractLoginInfo()` extrai dados de login

3. **Envia informações ao background**
   - Mensagem `seiSiteDetected` com URL
   - Mensagem `seiLoginInfo` com status e dados

4. **Background processa e armazena**
   - Adiciona site à lista (se novo)
   - Atualiza informações de login
   - Salva no `chrome.storage.local`

5. **Usuário abre o painel lateral**
   - `sidepanel.js` carrega
   - `renderSites()` busca dados do storage
   - Renderiza lista de sites

6. **Usuário seleciona um site**
   - Event listener `change` dispara
   - `showSiteInfo()` renderiza informações

7. **Usuário clica em "Atualizar Status"**
   - `checkSiteStatus()` abre site em background
   - Content script é executado novamente
   - Informações são atualizadas
   - Painel é atualizado automaticamente

---

## 🐛 Debugging

### Console Logs

**Para ver logs do content script:**
- Abra DevTools na página SEI (F12)
- Vá para Console

**Para ver logs do background:**
- Vá em `chrome://extensions/`
- Clique em "Inspecionar" no Service Worker

**Para ver logs do sidepanel:**
- Clique com direito no painel lateral
- Selecione "Inspecionar"

### Storage Inspector

**Para ver dados salvos:**
- Inspecione o sidepanel
- Vá para "Application" > "Storage" > "Extension storage"
- Ou execute no console: `chrome.storage.local.get(['seiSites'], console.log)`

---

## � Funcionalidade: Buscar Processos Abertos

### Arquivo: `sidepanel.js`

#### Função: `searchOpenProcesses(index)`
```javascript
function searchOpenProcesses(index) {
  const site = currentSites[index];
  const controleUrl = `${baseUrl}/controlador.php?acao=procedimento_controlar&reset=1`;
  
  chrome.tabs.create({ url: controleUrl, active: false }, (tab) => {
    setTimeout(() => {
      chrome.tabs.sendMessage(tab.id, { type: 'extractProcesses' }, (response) => {
        chrome.tabs.remove(tab.id);
        displayProcesses(response.processes);
      });
    }, 3000);
  });
}
```

**O que faz:**
1. Constrói URL do controlador de processos
2. Abre página em background (aba oculta)
3. Aguarda 3 segundos para carregar
4. Envia mensagem `extractProcesses` para content script
5. Fecha a aba
6. Exibe processos recebidos

#### Função: `displayProcesses(processes)`
```javascript
function displayProcesses(processes) {
  // Renderiza lista de processos com:
  // - Número do processo
  // - Descrição
  // - Link para abrir
}
```

### Arquivo: `content.js`

#### Função: `extractProcesses()`
```javascript
function extractProcesses() {
  const processes = [];
  
  // Estratégia 1: Tabela com ID específico
  const table = document.querySelector('table#tblProcessos, table.infraTable');
  
  // Estratégia 2: Links com padrão de processo
  const processLinks = document.querySelectorAll('a[href*="acao=procedimento_"]');
  
  return processes;
}
```

**O que faz:**
- Busca processos usando múltiplas estratégias:
  1. Tabela de processos (`#tblProcessos` ou `.infraTable`)
  2. Links com padrão `acao=procedimento_`
- Extrai: número, descrição e link de cada processo
- Retorna array de objetos com os dados

#### Listener para Extração
```javascript
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'extractProcesses') {
    const processes = extractProcesses();
    sendResponse({ processes: processes });
  }
  return true; // Mantém canal aberto
});
```

---

## �📝 Notas de Desenvolvimento

### Content Security Policy (CSP)
- Manifest V3 não permite eventos inline (`onclick`, `onchange`)
- Todos os event listeners devem ser adicionados via JavaScript
- Solução: `element.addEventListener('event', handler)`

### Comunicação Assíncrona
- Todas as APIs do Chrome Extensions são assíncronas
- Use callbacks, Promises ou async/await

### Contextos Isolados
- Content scripts rodam em contexto isolado da página
- Não compartilham variáveis com a página
- Comunicação via `chrome.runtime.sendMessage`

### Persistência de Dados
- `chrome.storage.local` persiste entre sessões
- Limite de ~5MB de dados
- Mudanças disparam `chrome.storage.onChanged`

### Seleção Estável
- Armazena URL selecionada (não índice) em variável `selectedUrl`
- Ao re-renderizar, busca site pela URL usando `findIndex`
- Evita mudança de seleção quando novos sites são detectados
