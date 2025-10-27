
// IndexedDB helpers
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pageHistoryDB', 2);
    request.onupgradeneeded = function(e) {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('domains')) {
        db.createObjectStore('domains', { keyPath: 'page' });
      }
    };
    request.onsuccess = function(e) {
      resolve(e.target.result);
    };
    request.onerror = function(e) {
      reject(e);
    };
  });
}

function getDomainFromUrl(url) {
  try {
    const u = new URL(url);
    return u.origin;
  } catch {
    return url;
  }
}

function addPageToDB(url, title) {
  const now = new Date().toISOString();
  const domain = getDomainFromUrl(url);
  openDB().then(db => {
    const tx = db.transaction('domains', 'readwrite');
    const store = tx.objectStore('domains');
    store.get(domain).onsuccess = function(e) {
      let record = e.target.result;
      if (!record) {
        // Novo domínio
        record = {
          page: domain,
          firstAccess: now,
          lastAccess: now,
          quantityAccess: 1,
          subpages: [
            {
              url,
              firstAccess: now,
              lastAccess: now,
              quantityAccess: 1,
              title
            }
          ]
        };
      } else {
        // Atualiza domínio
        record.lastAccess = now;
        record.quantityAccess++;
        // Subpágina
        let sub = record.subpages.find(s => s.url === url);
        if (!sub) {
          record.subpages.push({ url, firstAccess: now, lastAccess: now, quantityAccess: 1, title });
        } else {
          sub.lastAccess = now;
          sub.quantityAccess++;
        }
      }
      store.put(record);
      tx.oncomplete = () => db.close();
    };
  });
}

function getAllDomainsFromDB(callback) {
  openDB().then(db => {
    const tx = db.transaction('domains', 'readonly');
    const store = tx.objectStore('domains');
    const req = store.getAll();
    req.onsuccess = function() {
      callback(req.result);
      db.close();
    };
  });
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString();
}

function renderHistory() {
  getAllDomainsFromDB(function(domains) {
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    if (!domains || domains.length === 0) {
      list.innerHTML = '<li>Nenhuma página registrada ainda.</li>';
    } else {
      // Ordena domínios pelo último acesso
      domains.sort((a, b) => new Date(b.lastAccess) - new Date(a.lastAccess));
      domains.forEach(domain => {
        const li = document.createElement('li');
        li.innerHTML = `<b>${domain.page}</b><br>Primeiro acesso: ${formatDate(domain.firstAccess)}<br>Último acesso: ${formatDate(domain.lastAccess)}<br>Quantidade de acessos: ${domain.quantityAccess}<br>Subpáginas:`;
        const ul = document.createElement('ul');
        domain.subpages.sort((a, b) => new Date(b.lastAccess) - new Date(a.lastAccess));
        domain.subpages.forEach(sub => {
          const subli = document.createElement('li');
          subli.innerHTML = `${sub.title ? `<b>${sub.title}</b><br>` : ''}${sub.url}<br>Primeiro acesso: ${formatDate(sub.firstAccess)}<br>Último acesso: ${formatDate(sub.lastAccess)}<br>Quantidade de acessos: ${sub.quantityAccess}`;
          ul.appendChild(subli);
        });
        li.appendChild(ul);
        list.appendChild(li);
      });
    }
  });
}

document.addEventListener('DOMContentLoaded', renderHistory);


// Registrar apenas páginas que o usuário está vendo (aba ativa)

function isValidPage(url) {
  // Ignora páginas internas do Chrome
  return url && !url.startsWith('chrome://') && !url.startsWith('chrome-extension://');
}

chrome.tabs.onActivated.addListener(function(activeInfo) {
  chrome.tabs.get(activeInfo.tabId, function(tab) {
    if (isValidPage(tab.url) && tab.title) {
      addPageToDB(tab.url, tab.title);
      console.log('Página registrada:', tab.title, tab.url);
      renderHistory();
    } else {
      console.log('Ignorado:', tab.url);
    }
  });
});


// Registrar página ativa ao carregar extensão
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  if (tabs && tabs[0] && isValidPage(tabs[0].url) && tabs[0].title) {
    addPageToDB(tabs[0].url, tabs[0].title);
    console.log('Página inicial registrada:', tabs[0].title, tabs[0].url);
    renderHistory();
  }
});

// Registrar navegação na aba ativa
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.active && isValidPage(tab.url) && tab.title) {
    addPageToDB(tab.url, tab.title);
    console.log('Página navegada registrada:', tab.title, tab.url);
    renderHistory();
  }
});
