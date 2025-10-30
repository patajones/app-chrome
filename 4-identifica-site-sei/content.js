// content.js - Detecta sites SEI e verifica status de login
(function() {
  function isSEISite() {
    // Verifica se é um site SEI pela estrutura HTML característica
    const hasSEITitle = document.title.includes('SEI');
    const hasSEIElements = document.getElementById('divInfraBarraSistema') !== null;
    const hasSEILogo = document.querySelector('[src*="sei_barra"]') !== null;
    
    return hasSEITitle || hasSEIElements || hasSEILogo;
  }
  
  function extractLoginInfo() {
    // Verifica se está na tela de login
    const loginForm = document.getElementById('frmLogin');
    if (loginForm) {
      return {
        isLoggedIn: false,
        userName: null,
        userUnit: null
      };
    }
    
    // Extrai informações do usuário logado
    const userLink = document.getElementById('lnkUsuarioSistema');
    const unitLink = document.getElementById('lnkInfraUnidade');
    
    if (userLink && unitLink) {
      return {
        isLoggedIn: true,
        userName: userLink.getAttribute('title') || userLink.textContent.trim(),
        userUnit: unitLink.getAttribute('title') || unitLink.textContent.trim()
      };
    }
    
    return {
      isLoggedIn: false,
      userName: null,
      userUnit: null
    };
  }
  
  function getControleProcessosUrl() {
    console.log('[SEI Extension] Buscando URL do Controle de Processos...');
    
    // Estratégia 1: Busca pelo atributo link (funciona com ou sem selected)
    const menuLinkByAttr = document.querySelector('a[link="procedimento_controlar"]');
    console.log('[SEI Extension] Estratégia 1 - a[link="procedimento_controlar"]:', menuLinkByAttr);
    if (menuLinkByAttr) {
      const url = menuLinkByAttr.href || new URL(menuLinkByAttr.getAttribute('href'), window.location.href).href;
      console.log('[SEI Extension] ✓ URL encontrada (estratégia 1):', url);
      return url;
    }
    
    // Estratégia 2: Busca por ID do link
    const menuLinkById = document.getElementById('linkMenu8');
    console.log('[SEI Extension] Estratégia 2 - getElementById("linkMenu8"):', menuLinkById);
    if (menuLinkById) {
      const url = menuLinkById.href || new URL(menuLinkById.getAttribute('href'), window.location.href).href;
      console.log('[SEI Extension] ✓ URL encontrada (estratégia 2):', url);
      return url;
    }
    
    // Estratégia 3: Busca por texto "Controle de Processos"
    const allLinks = document.querySelectorAll('a');
    console.log('[SEI Extension] Estratégia 3 - Buscando em', allLinks.length, 'links por texto');
    for (let link of allLinks) {
      const spanText = link.querySelector('span');
      if (spanText && spanText.textContent.includes('Controle de Processos')) {
        const url = link.href || new URL(link.getAttribute('href'), window.location.href).href;
        console.log('[SEI Extension] ✓ URL encontrada (estratégia 3):', url);
        return url;
      }
    }
    
    // Estratégia 4: Busca qualquer link com acao=procedimento_controlar (no menu)
    const menuLinks = document.querySelectorAll('#main-menu a[href*="acao=procedimento_controlar"], nav a[href*="acao=procedimento_controlar"], ul a[href*="acao=procedimento_controlar"]');
    console.log('[SEI Extension] Estratégia 4 - Links com acao=procedimento_controlar:', menuLinks.length);
    if (menuLinks.length > 0) {
      const url = menuLinks[0].href || new URL(menuLinks[0].getAttribute('href'), window.location.href).href;
      console.log('[SEI Extension] ✓ URL encontrada (estratégia 4):', url);
      return url;
    }
    
    console.log('[SEI Extension] ✗ Nenhuma URL encontrada em nenhuma estratégia');
    console.log('[SEI Extension] URL atual:', window.location.href);
    console.log('[SEI Extension] Title:', document.title);
    return null;
  }
  
  function extractProcesses() {
    const processes = [];
    
    // Busca todas as tabelas de processos (Recebidos, Gerados, etc)
    const tables = document.querySelectorAll('table.tabelaControle');
    
    tables.forEach(table => {
      // Pega o caption da tabela (ex: "Processos recebidos (2 registros):")
      const caption = table.querySelector('caption');
      const category = caption ? caption.textContent.trim() : 'Processos';
      
      // Busca todas as linhas de processos (ignora cabeçalho)
      const rows = table.querySelectorAll('tbody tr');
      
      rows.forEach(row => {
        // Ignora linha de cabeçalho (que tem <th>)
        if (row.querySelector('th')) {
          return;
        }
        
        // Busca o link do processo (acao=procedimento_trabalhar)
        const processLink = row.querySelector('a[href*="acao=procedimento_trabalhar"]');
        
        if (processLink) {
          // Número do processo (texto do link)
          const number = processLink.textContent.replace(/<wbr>/g, '').trim();
          
          // Descrição do processo (no atributo aria-label ou onmouseover)
          let description = '';
          const ariaLabel = processLink.getAttribute('aria-label');
          if (ariaLabel) {
            // aria-label tem formato: "Tipo / Especificação"
            description = ariaLabel;
          } else {
            const onmouseover = processLink.getAttribute('onmouseover');
            if (onmouseover) {
              // Extrai descrição do tooltip
              const match = onmouseover.match(/infraTooltipMostrar\('([^']+)'/);
              if (match) {
                description = match[1];
              }
            }
          }
          
          // Usuário atribuído (último <td> da linha)
          let assignedTo = '';
          const assignedLink = row.querySelector('a.ancoraSigla');
          if (assignedLink) {
            assignedTo = assignedLink.textContent.trim();
          }
          
          // Marcadores (ícones de status)
          const markers = [];
          const markerLinks = row.querySelectorAll('a[href*="andamento_marcador"]');
          markerLinks.forEach(markerLink => {
            const markerMouseover = markerLink.getAttribute('onmouseover');
            if (markerMouseover) {
              const match = markerMouseover.match(/infraTooltipMostrar\('([^']+)','([^']+)'/);
              if (match) {
                markers.push({
                  text: match[1],
                  type: match[2]
                });
              }
            }
          });
          
          processes.push({
            number: number,
            description: description,
            link: processLink.href,
            category: category,
            assignedTo: assignedTo,
            markers: markers
          });
        }
      });
    });
    
    return processes;
  }
  
  // Detecta site SEI ao carregar
  if (isSEISite()) {
    const url = window.location.origin;
    
    // Notifica que um site SEI foi detectado
    chrome.runtime.sendMessage({
      type: 'seiSiteDetected',
      data: { url }
    });
    
    // Extrai e envia informações de login
    const loginInfo = extractLoginInfo();
    chrome.runtime.sendMessage({
      type: 'seiLoginInfo',
      data: {
        url,
        ...loginInfo
      }
    });
  }
  
  // Listener para requisições de extração de processos
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'extractProcesses') {
      const processes = extractProcesses();
      sendResponse({ processes: processes });
    }
    
    if (msg.type === 'getControleProcessosUrl') {
      const url = getControleProcessosUrl();
      sendResponse({ url: url });
    }
    
    return true; // Mantém o canal aberto para resposta assíncrona
  });
})();
