// background.js - Abre o painel lateral ao clicar no ícone da extensão

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// IndexedDB helpers para mouse
function openMouseDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('mouseMoveDB', 1);
    request.onupgradeneeded = function(e) {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('moves')) {
        db.createObjectStore('moves', { keyPath: 'id', autoIncrement: true });
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

function addMouseMove(data) {
  openMouseDB().then(db => {
    const tx = db.transaction('moves', 'readwrite');
    const store = tx.objectStore('moves');
    store.add(data);
    tx.oncomplete = () => db.close();
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'mouseMove' && msg.data) {
    addMouseMove(msg.data);
  }
});
