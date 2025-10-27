// popup.js - Script para buscar versão do manifest
console.log('🔧 Script popup.js carregado');

function atualizarInfoAba() {
    const urlEl = document.getElementById('url');
    const titleEl = document.getElementById('title');
    if (chrome.tabs) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs && tabs[0]) {
                urlEl.textContent = 'URL: ' + (tabs[0].url || 'Não encontrada');
                titleEl.textContent = 'Título: ' + (tabs[0].title || 'Não encontrado');
            } else {
                urlEl.textContent = 'URL não encontrada';
                titleEl.textContent = 'Título não encontrado';
            }
        });
    } else {
        urlEl.textContent = 'chrome.tabs não disponível';
        titleEl.textContent = 'chrome.tabs não disponível';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado, iniciando busca da versão...');
    
    const versionEl = document.getElementById('version');
    
    try {
        const manifest = chrome.runtime.getManifest();
        console.log('Manifest encontrado:', manifest);
        
        if (manifest && manifest.version) {
            versionEl.textContent = `Versão ${manifest.version}`;
        }
    } catch (error) {
        console.error('Erro método 1:', error);
    }
    
    atualizarInfoAba();
    window.addEventListener('focus', atualizarInfoAba);
});