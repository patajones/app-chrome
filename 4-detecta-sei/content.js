// Content script para detectar o status do SEI
(function() {
    'use strict';

    // Função para detectar se a página é do SEI
    function isSEIPage() {
        // Verifica se é uma página do SEI baseado em elementos característicos
        const seiIndicators = [
            // Título da página
            document.title === 'SEI',
            // Logo ou texto SEI
            document.querySelector('img[src*="sei_barra.svg"]'),
            // Scripts específicos do SEI
            document.querySelector('script[src*="sei.js"]'),
            // Classes específicas do SEI
            document.querySelector('.infraBarraSistema'),
            // Meta tag específica
            document.querySelector('meta[name="robots"][content="noindex"]')
        ];

        return seiIndicators.some(indicator => indicator);
    }

    // Função para detectar se o usuário está logado
    function isLoggedIn() {
        // Indicadores de que o usuário está logado
        const loggedInIndicators = [
            // Link de sair do sistema
            document.getElementById('lnkInfraSairSistema'),
            // Menu lateral do SEI
            document.getElementById('divInfraSidebarMenu'),
            // Barra de navegação completa
            document.getElementById('divInfraBarraSistema'),
            // Links de controle
            document.getElementById('lnkControleProcessos'),
            // Painel de controle
            document.getElementById('lnkPainelControle'),
            // Campo de pesquisa rápida
            document.getElementById('txtPesquisaRapida'),
            // Menu principal
            document.getElementById('infraMenu')
        ];

        return loggedInIndicators.some(indicator => indicator);
    }

    // Função para detectar se está na página de login
    function isLoginPage() {
        const loginIndicators = [
            // Campos típicos de login
            document.querySelector('input[name="txtUsuario"]'),
            document.querySelector('input[name="pwdSenha"]'),
            document.querySelector('input[type="password"]'),
            // Formulário de login
            document.querySelector('form[name="frmLogin"]'),
            // Botão de entrar
            document.querySelector('input[value="Entrar"]'),
            // Texto característico de login
            document.body && document.body.textContent.includes('Usuário'),
            document.body && document.body.textContent.includes('Senha')
        ];

        return loginIndicators.some(indicator => indicator);
    }

    // Função para obter informações do usuário logado
    function getUserInfo() {
        const userLink = document.getElementById('lnkUsuarioSistema');
        if (userLink) {
            return {
                name: userLink.title || userLink.textContent.trim(),
                hasUserInfo: true
            };
        }

        // Tenta encontrar informações do usuário em outros lugares
        const userInfoElements = document.querySelectorAll('[title*="@"], [title*="("]');
        for (let element of userInfoElements) {
            const title = element.title;
            if (title && (title.includes('@') || title.includes('('))) {
                return {
                    name: title,
                    hasUserInfo: true
                };
            }
        }

        return {
            name: 'Usuário não identificado',
            hasUserInfo: false
        };
    }

    // Função para obter informações da unidade
    function getUnitInfo() {
        const unitLink = document.getElementById('lnkInfraUnidade');
        if (unitLink) {
            return {
                unit: unitLink.textContent.trim(),
                unitTitle: unitLink.title || 'Unidade não especificada'
            };
        }
        return {
            unit: 'N/A',
            unitTitle: 'Unidade não identificada'
        };
    }

    // Função principal para analisar a página
    function analyzePage() {
        const isSEI = isSEIPage();
        
        if (!isSEI) {
            return {
                isSEIPage: false,
                status: 'not_sei',
                message: 'Esta não é uma página do SEI'
            };
        }

        const loggedIn = isLoggedIn();
        const loginPage = isLoginPage();
        
        let status, message;
        let userInfo = null;
        let unitInfo = null;

        if (loggedIn) {
            status = 'logged_in';
            message = 'Usuário logado no SEI';
            userInfo = getUserInfo();
            unitInfo = getUnitInfo();
        } else if (loginPage) {
            status = 'login_page';
            message = 'Página de login do SEI';
        } else {
            status = 'logged_out';
            message = 'Usuário não logado no SEI';
        }

        return {
            isSEIPage: true,
            status: status,
            message: message,
            userInfo: userInfo,
            unitInfo: unitInfo,
            url: window.location.href,
            timestamp: new Date().toISOString()
        };
    }

    // Função para atualizar o badge da extensão
    function updateBadge(status) {
        chrome.runtime.sendMessage({
            action: 'updateBadge',
            status: status
        });
    }

    // Função para salvar o status
    function saveStatus(statusData) {
        chrome.storage.local.set({
            seiStatus: statusData
        });
    }

    // Executar análise inicial
    function runAnalysis() {
        const result = analyzePage();
        
        // Salvar o resultado
        saveStatus(result);
        
        // Atualizar badge
        updateBadge(result.status);
        
        // Enviar resultado para o background script
        chrome.runtime.sendMessage({
            action: 'statusUpdate',
            data: result
        });

        console.log('SEI Detector:', result);
    }

    // Observer para detectar mudanças na página
    const observer = new MutationObserver(function(mutations) {
        // Debounce para evitar muitas execuções
        clearTimeout(observer.timeout);
        observer.timeout = setTimeout(runAnalysis, 1000);
    });

    // Configurar observer
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'id']
    });

    // Executar análise inicial quando a página carregar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runAnalysis);
    } else {
        runAnalysis();
    }

    // Também executar após um breve delay para garantir que elementos dinâmicos carreguem
    setTimeout(runAnalysis, 2000);

})();