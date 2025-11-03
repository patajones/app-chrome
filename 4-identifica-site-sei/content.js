// content.js - Detecta sites SEI e verifica status de login

(function () {
  function isSEISite() {
    // Verifica se é um site SEI.
    // No mínimo a palavra 'SEI' no título e a 
    // barra superior, que aparece tanto no login quanto após o login
    const hasSEITitle = document.title.includes('SEI');
    const hasSEIElements = document.getElementById('divInfraBarraSistema') !== null;

    return hasSEITitle && hasSEIElements;
  }

  function extractLoginInfo() {
    let result = {
      isLoggedIn: false,
      userNameAndNick: null,
      userName: null,
      userNick: null,
      userUnitName: null,
      userUnit: null
    };

    if (!isSEISite()) {
      return result;
    }

    // Caso esteja a tela de login, retorna null
    if (document.getElementById('frmLogin')) {
      return result;
    }

    result.isLoggedIn = true;

    // Extrai informações do usuário logado
    // usando os links da barra superior    
    if (userLink = document.getElementById('lnkUsuarioSistema')) {
      result.userNameAndNick = userLink.getAttribute('title') || userLink.textContent.trim();
      const [name, nick] = result.userNameAndNick.split('(');
      result.userName = name.trim();
      result.userNick = nick ? nick.replace(')', '').trim() : null;
    }

    if (unitLink = document.getElementById('lnkInfraUnidade')) {
      result.userUnitName = unitLink.getAttribute('title') || unitLink.textContent.trim();
      result.userUnit = unitLink.textContent.trim() || unitLink.getAttribute('title');
    }

    return result;
  }

  // Extrai todos os links da página
  function getLinksNaPagina() {
    return Array.from(document.querySelectorAll('a')).reduce((resultado, link) => {
      // Obtendo a URL, priorizando 'onclick' se existir e depois o 'href'
      // validar URL, ignorar '#' e javascript:void(0)
      let url = null;
      
      if (link.hasAttribute('onclick')) {
        url = link.getAttribute('onclick');
      } else if (link.hasAttribute('href')) {
        url = link.getAttribute('href');
      }

      if (url) {
        if (url == '#') {
          url = null;
        }
        if (url.startsWith('javascript:void(0)')) {
          url = null;
        }
        if (url.startsWith('window.location.href=')) {
          url = url.replace("window.location.href='", '').replace(/'$/, '');
        }
      }

      // Se uma URL válida foi encontrada (passou no filtro), criamos o objeto
      if (url) {
        // Extrai os outros atributos, usando 'null' se não existirem
        const id = link.getAttribute('id') || null;
        const title = link.getAttribute('title') || null;
        let acaoValue = null;
        if (url.includes('acao=')) {
           //todo: extrair valor de acao , que é um atributo de uma url
           const acaoMatch = url.match(/acao=([^&]+)/);
           if (acaoMatch) {
             acaoValue = acaoMatch[1];
           }
        }

        // Adiciona o novo objeto formatado ao nosso array de resultado
        resultado.push({
          id: id,
          title: title,
          acao: acaoValue,
          url: url
        });
      }

      // Retorna o acumulador para a próxima iteração
      return resultado;
    }, []);
  }

  function getControleProcessosUrl() {
    const links = getLinksNaPagina();
    const link = links.find(link => link.id === 'lnkControleProcessos');
    const url = link ? link.url : null;
    return url;
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
