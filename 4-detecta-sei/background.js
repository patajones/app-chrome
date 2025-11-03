// Background script para gerenciar o estado da extensão
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateBadge') {
        updateBadgeForStatus(message.status, sender.tab.id);
    } else if (message.action === 'statusUpdate') {
        // Armazenar dados do status para o popup
        chrome.storage.local.set({
            [`seiStatus_${sender.tab.id}`]: message.data
        });
    }
});

// Função para atualizar o badge baseado no status
function updateBadgeForStatus(status, tabId) {
    let badgeText = '';
    let badgeColor = '#808080'; // Cinza padrão

    switch (status) {
        case 'logged_in':
            badgeText = '✓';
            badgeColor = '#4CAF50'; // Verde
            break;
        case 'logged_out':
            badgeText = '✗';
            badgeColor = '#F44336'; // Vermelho
            break;
        case 'login_page':
            badgeText = '?';
            badgeColor = '#FF9800'; // Laranja
            break;
        case 'not_sei':
            badgeText = '';
            badgeColor = '#808080'; // Cinza
            break;
    }

    chrome.action.setBadgeText({
        text: badgeText,
        tabId: tabId
    });

    chrome.action.setBadgeBackgroundColor({
        color: badgeColor,
        tabId: tabId
    });
}

// Limpar dados quando a aba for fechada
chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.storage.local.remove(`seiStatus_${tabId}`);
});

// Limpar badge quando mudar de aba
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    // Verificar se há dados salvos para esta aba
    const result = await chrome.storage.local.get(`seiStatus_${activeInfo.tabId}`);
    const statusData = result[`seiStatus_${activeInfo.tabId}`];
    
    if (statusData) {
        updateBadgeForStatus(statusData.status, activeInfo.tabId);
    } else {
        // Limpar badge se não há dados
        chrome.action.setBadgeText({
            text: '',
            tabId: activeInfo.tabId
        });
    }
});