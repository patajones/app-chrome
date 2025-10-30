// background.js - Ativa painel lateral e gerencia sites SEI
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Recebe informações dos sites SEI do content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'seiSiteDetected') {
    // Salva o site SEI no storage
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
  }
  
  if (msg.type === 'seiLoginInfo') {
    // Atualiza informações de login do site
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
  }
});
