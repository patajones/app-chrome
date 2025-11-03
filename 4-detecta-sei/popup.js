// Popup script para exibir o status do SEI
document.addEventListener('DOMContentLoaded', loadStatus);

async function loadStatus() {
    try {
        // Mostrar loading
        showLoading();

        // Obter a aba ativa
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) {
            throw new Error('Não foi possível obter informações da aba atual');
        }

        // Buscar dados salvos para esta aba
        const result = await chrome.storage.local.get(`seiStatus_${tab.id}`);
        const statusData = result[`seiStatus_${tab.id}`];

        if (statusData) {
            displayStatus(statusData);
        } else {
            // Se não há dados salvos, executar o content script
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                });
                
                // Aguardar um pouco e tentar novamente
                setTimeout(async () => {
                    const newResult = await chrome.storage.local.get(`seiStatus_${tab.id}`);
                    const newStatusData = newResult[`seiStatus_${tab.id}`];
                    
                    if (newStatusData) {
                        displayStatus(newStatusData);
                    } else {
                        displayStatus({
                            isSEIPage: false,
                            status: 'not_sei',
                            message: 'Esta não é uma página do SEI ou não foi possível analisar',
                            timestamp: new Date().toISOString()
                        });
                    }
                }, 1500);
            } catch (scriptError) {
                // Se não conseguir executar o script, mostrar status padrão
                displayStatus({
                    isSEIPage: false,
                    status: 'not_sei',
                    message: 'Não foi possível analisar esta página',
                    timestamp: new Date().toISOString()
                });
            }
        }
    } catch (error) {
        console.error('Erro ao carregar status:', error);
        showError();
    }
}

function showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('error').style.display = 'none';
    document.getElementById('status-container').style.display = 'none';
}

function showError() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').style.display = 'block';
    document.getElementById('status-container').style.display = 'none';
}

function displayStatus(statusData) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').style.display = 'none';
    document.getElementById('status-container').style.display = 'block';

    const statusCard = document.getElementById('status-card');
    const statusIcon = document.getElementById('status-icon');
    const statusText = document.getElementById('status-text');
    const statusMessage = document.getElementById('status-message');
    const userInfo = document.getElementById('user-info');
    const timestamp = document.getElementById('timestamp');

    // Limpar classes anteriores
    statusCard.className = 'status-card';

    // Configurar baseado no status
    switch (statusData.status) {
        case 'logged_in':
            statusCard.classList.add('logged-in');
            statusIcon.textContent = '✅';
            statusText.textContent = 'Logado no SEI';
            statusMessage.textContent = statusData.message;
            
            // Mostrar informações do usuário se disponível
            if (statusData.userInfo) {
                userInfo.style.display = 'block';
                document.getElementById('user-name').textContent = statusData.userInfo.name || 'Não identificado';
                
                if (statusData.unitInfo) {
                    document.getElementById('user-unit').textContent = 
                        `${statusData.unitInfo.unit} - ${statusData.unitInfo.unitTitle}` || 'Não identificada';
                } else {
                    document.getElementById('user-unit').textContent = 'Não identificada';
                }
            } else {
                userInfo.style.display = 'none';
            }
            break;

        case 'logged_out':
            statusCard.classList.add('logged-out');
            statusIcon.textContent = '❌';
            statusText.textContent = 'Não logado';
            statusMessage.textContent = statusData.message;
            userInfo.style.display = 'none';
            break;

        case 'login_page':
            statusCard.classList.add('login-page');
            statusIcon.textContent = '🔐';
            statusText.textContent = 'Página de Login';
            statusMessage.textContent = statusData.message;
            userInfo.style.display = 'none';
            break;

        case 'not_sei':
        default:
            statusCard.classList.add('not-sei');
            statusIcon.textContent = '🌐';
            statusText.textContent = 'Não é uma página do SEI';
            statusMessage.textContent = statusData.message;
            userInfo.style.display = 'none';
            break;
    }

    // Mostrar timestamp
    if (statusData.timestamp) {
        const date = new Date(statusData.timestamp);
        timestamp.textContent = `Última verificação: ${date.toLocaleString('pt-BR')}`;
    }
}

// Função para formatar data/hora
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}