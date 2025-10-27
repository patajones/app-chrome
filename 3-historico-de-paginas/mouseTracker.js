// mouseTracker.js - Registra movimentos do mouse na página
(function() {
  let lastMove = 0;
  document.addEventListener('mousemove', function(e) {
    const now = Date.now();
    // Limita a frequência de registro para evitar excesso de dados
    if (now - lastMove > 100) {
      lastMove = now;
      const data = {
        x: e.clientX,
        y: e.clientY,
        url: window.location.href,
        time: new Date().toISOString()
      };
      // Envia para o background
      chrome.runtime.sendMessage({ type: 'mouseMove', data });
    }
  });
})();
