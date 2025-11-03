// sidepanel.js - Exibe sites SEI e informações de login
let currentSites = [];
let selectedUrl = ''; // Armazena a URL selecionada ao invés do índice

function renderSites() {
  chrome.storage.local.get(['seiSites'], (result) => {
    currentSites = result.seiSites || [];
    const content = document.getElementById('content');
    
    if (currentSites.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          Nenhum site SEI detectado ainda.<br>
          Navegue em um site SEI para que ele apareça aqui.
        </div>
      `;
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
    
    // Adiciona event listener após renderizar
    const select = document.getElementById('siteSelect');
    if (select) {
      select.addEventListener('change', showSiteInfo);
      
      // Restaura a seleção anterior se existir
      if (selectedUrl) {
        const index = currentSites.findIndex(site => site.url === selectedUrl);
        if (index !== -1) {
          select.value = index;
          showSiteInfo();
        }
      }
      
      updateSeiBarInfo();
    }
  });
}

function showSiteInfo() {
  const select = document.getElementById('siteSelect');
  const index = select.value;
  const container = document.getElementById('siteInfoContainer');
  
  if (index === '') {
    container.innerHTML = '';
    selectedUrl = ''; // Limpa a seleção
    return;
  }
  
  const site = currentSites[index];
  selectedUrl = site.url; // Salva a URL selecionada
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
      <div class="button-group">
        <button id="btnCheckStatus" data-index="${index}">Atualizar Status</button>
        ${isLoggedIn ? `<button id="btnSearchProcesses" data-index="${index}">Buscar Processos Abertos</button>` : ''}
      </div>
      <div id="processesContainer"></div>
    </div>
  `;
  
  // Adiciona event listener ao botão Atualizar Status
  const btn = document.getElementById('btnCheckStatus');
  if (btn) {
    btn.addEventListener('click', () => checkSiteStatus(index));
  }
  
  // Adiciona event listener ao botão Buscar Processos
  const btnSearchProcesses = document.getElementById('btnSearchProcesses');
  if (btnSearchProcesses) {
    btnSearchProcesses.addEventListener('click', () => searchOpenProcesses(index));
  }
  
  updateSeiBarInfo();
}

function checkSiteStatus(index) {
  const site = currentSites[index];
  
  // Abre a página do site em uma nova aba e fecha imediatamente
  // O content script irá detectar e atualizar as informações
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

function searchOpenProcesses(index) {
  const site = currentSites[index];
  const processesContainer = document.getElementById('processesContainer');
  
  // Mostra loading
  processesContainer.innerHTML = `
    <div class="loading">
      <span>⏳ Buscando processos abertos...</span>
    </div>
  `;
  
  // Busca abas abertas do site
  chrome.tabs.query({ url: `${site.url}/*` }, (tabs) => {
    if (tabs.length > 0) {
      // Usa a primeira aba encontrada do site
      const activeTab = tabs[0];
      
      // Pede para o content script extrair a URL correta do menu
      chrome.tabs.sendMessage(activeTab.id, { type: 'getControleProcessosUrl' }, (response) => {
        if (response && response.url) {
          // Usa a URL extraída do menu
          openProcessControlPage(response.url, processesContainer);
        } else {
          processesContainer.innerHTML = `
            <div class="error">
              ❌ Não foi possível encontrar o link de Controle de Processos no menu.<br>
              Verifique se você está logado e tente novamente.
            </div>
          `;
        }
      });
    } else {
      // Se não há aba aberta do site, informa o usuário
      processesContainer.innerHTML = `
        <div class="error">
          ❌ Nenhuma aba aberta deste site foi encontrada.<br>
          Por favor, abra o site SEI primeiro e tente novamente.
        </div>
      `;
    }
  });
}

function openProcessControlPage(controleUrl, processesContainer) {
  // Abre a página em background e espera o content script extrair os dados
  chrome.tabs.create({ url: controleUrl, active: false }, (tab) => {
    // Aguarda a página carregar e envia mensagem para extrair processos
    setTimeout(() => {
      chrome.tabs.sendMessage(tab.id, { type: 'extractProcesses' }, (response) => {
        // Fecha a aba
        chrome.tabs.remove(tab.id);
        
        if (response && response.processes) {
          displayProcesses(response.processes);
        } else {
          processesContainer.innerHTML = `
            <div class="error">
              ❌ Não foi possível buscar os processos. Verifique se você está logado.
            </div>
          `;
        }
      });
    }, 3000); // Aguarda 3 segundos para a página carregar
  });
}

function displayProcesses(processes) {
  const processesContainer = document.getElementById('processesContainer');
  
  if (processes.length === 0) {
    processesContainer.innerHTML = `
      <div class="info-message">
        ℹ️ Nenhum processo aberto encontrado.
      </div>
    `;
    return;
  }
  
  // Agrupa processos por categoria
  const grouped = {};
  processes.forEach(proc => {
    const category = proc.category || 'Processos';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(proc);
  });
  
  let html = `<div class="processes-list">`;
  html += `<h3>Processos Abertos (${processes.length})</h3>`;
  
  // Renderiza cada categoria
  Object.keys(grouped).forEach(category => {
    const procs = grouped[category];
    html += `<div class="process-category">`;
    html += `<h4 class="category-title">${category}</h4>`;
    
    procs.forEach(proc => {
      html += `
        <div class="process-item">
          <div class="process-header">
            <a href="${proc.link}" target="_blank" class="process-number">${proc.number}</a>
            ${proc.assignedTo ? `<span class="process-assigned">(${proc.assignedTo})</span>` : ''}
          </div>
          ${proc.description ? `<div class="process-description">${proc.description}</div>` : ''}
          ${proc.markers && proc.markers.length > 0 ? `
            <div class="process-markers">
              ${proc.markers.map(marker => `
                <span class="marker" title="${marker.text}">${marker.type}</span>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    });
    
    html += `</div>`;
  });
  
  html += `</div>`;
  processesContainer.innerHTML = html;
}

// Atualiza a barra superior com a URL e dados do usuário do site selecionado
function updateSeiBarInfo() {
  const seiBarUrl = document.getElementById('seiBarUrl');
  const seiUserName = document.getElementById('seiUserName');
  const seiUserNick = document.getElementById('seiUserNick');
  const seiUserUnit = document.getElementById('seiUserUnit');
  const select = document.getElementById('siteSelect');
  if (select && select.value !== '') {
    const site = currentSites[select.value];
    if (seiBarUrl) seiBarUrl.textContent = site ? site.url : '';
    if (seiUserName) seiUserName.textContent = site && site.userName ? site.userName : '';
    if (seiUserUnit) seiUserUnit.textContent = site && site.userUnit ? site.userUnit : '';
    if (seiUserNick) {
      const match = site && site.userName ? site.userName.match(/\(([^)]+)\)/) : null;
      seiUserNick.textContent = match ? match[1] : '';
    }
  } else {
    if (seiBarUrl) seiBarUrl.textContent = '';
    if (seiUserName) seiUserName.textContent = '';
    if (seiUserNick) seiUserNick.textContent = '';
    if (seiUserUnit) seiUserUnit.textContent = '';
  }
}

// Atualiza a barra superior com a URL do site selecionado
function updateSeiBarUrl() {
  const seiBarUrl = document.getElementById('seiBarUrl');
  const select = document.getElementById('siteSelect');
  if (seiBarUrl && select && select.value !== '') {
    const site = currentSites[select.value];
    seiBarUrl.textContent = site ? site.url : '';
  } else if (seiBarUrl) {
    seiBarUrl.textContent = '';
  }
}

// Função para selecionar automaticamente o site da aba ativa
function selectCurrentTabSite() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      const currentTab = tabs[0];
      const currentOrigin = new URL(currentTab.url).origin;
      
      // Busca o site correspondente
      const index = currentSites.findIndex(site => site.url === currentOrigin);
      
      if (index !== -1) {
        const select = document.getElementById('siteSelect');
        if (select && select.value !== String(index)) {
          select.value = index;
          selectedUrl = currentOrigin;
          showSiteInfo();
        }
      }
    }
  });
}

// Renderiza ao carregar
document.addEventListener('DOMContentLoaded', () => {
  renderSites();
  // Após renderizar, seleciona o site da aba ativa
  setTimeout(selectCurrentTabSite, 100);
});

// Atualiza quando há mudanças no storage
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.seiSites) {
    // Apenas re-renderiza, a função renderSites() já cuida de restaurar a seleção
    renderSites();
    // Após re-renderizar, tenta selecionar o site da aba ativa
    setTimeout(selectCurrentTabSite, 100);
  }
});

// Detecta quando o usuário muda de aba
chrome.tabs.onActivated.addListener(() => {
  selectCurrentTabSite();
});

// Detecta quando o usuário navega em uma aba
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Só atualiza quando a navegação for completa
  if (changeInfo.status === 'complete') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0 && tabs[0].id === tabId) {
        selectCurrentTabSite();
      }
    });
  }
});
