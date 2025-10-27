// popup.js - Script para buscar versão do manifest
console.log('🔧 Script popup.js carregado');

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado, iniciando busca da versão...');
    
    const versionEl = document.getElementById('version');
    
    try {
        const manifest = chrome.runtime.getManifest();
        console.log('Manifest encontrado:', manifest);
        
        if (manifest && manifest.version) {
            versionEl.textContent = `Versão ${manifest.version}`;
            console.log('Versão atualizada para:', manifest.version);
            return;
        }
    } catch (error) {
        console.error('Erro método 1:', error);
    }
    
});