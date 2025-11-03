# 🏛️ Detector de SEI

Uma extensão do Chrome que detecta automaticamente quando você está logado ou deslogado em páginas do Sistema Eletrônico de Informações (SEI).

## 📋 Funcionalidades

- **Detecção Automática**: Identifica automaticamente páginas do SEI
- **Status de Login**: Mostra se você está logado, deslogado ou na página de login
- **Informações do Usuário**: Exibe nome do usuário e unidade quando logado
- **Badge Visual**: Ícone na barra de ferramentas que indica o status atual
- **Interface Intuitiva**: Popup com informações detalhadas sobre o status

## 🎯 Estados Detectados

### ✅ Logado no SEI
- **Badge**: ✓ (verde)
- **Detecta**: Presença de elementos como menu lateral, barra de navegação, link de logout
- **Mostra**: Nome do usuário, unidade atual, informações da sessão

### ❌ Não Logado no SEI  
- **Badge**: ✗ (vermelho)
- **Detecta**: Página do SEI mas sem elementos de usuário logado
- **Mostra**: Mensagem indicando que não está logado

### 🔐 Página de Login
- **Badge**: ? (laranja)
- **Detecta**: Presença de campos de usuário e senha
- **Mostra**: Indicação de que está na página de login

### 🌐 Não é uma Página do SEI
- **Badge**: (sem badge)
- **Detecta**: Ausência de elementos característicos do SEI
- **Mostra**: Mensagem indicando que não é uma página do SEI

## 🚀 Como Instalar

1. Faça o download ou clone este repositório
2. Abra o Chrome e vá para `chrome://extensions/`
3. Ative o "Modo do desenvolvedor" no canto superior direito
4. Clique em "Carregar sem compactação"
5. Selecione a pasta `4-detecta-sei`
6. A extensão será instalada e aparecerá na barra de ferramentas

## 💡 Como Usar

1. **Navegue para qualquer página** - A extensão analisa automaticamente todas as páginas
2. **Observe o badge** - O ícone da extensão mostra um indicador visual do status
3. **Clique na extensão** - Abre um popup com informações detalhadas
4. **Atualização automática** - O status é atualizado conforme você navega

## 🔧 Funcionamento Técnico

### Detecção de Páginas SEI
A extensão identifica páginas do SEI através de múltiplos indicadores:
- Título da página (`SEI`)
- Elementos específicos como `sei_barra.svg`
- Scripts específicos (`sei.js`)
- Classes CSS características (`.infraBarraSistema`)
- Meta tags específicas

### Detecção de Status de Login
Para determinar se o usuário está logado, a extensão verifica:
- Presença do link "Sair do Sistema" (`#lnkInfraSairSistema`)
- Menu lateral do SEI (`#divInfraSidebarMenu`) 
- Barra de navegação completa (`#divInfraBarraSistema`)
- Links de controle e painel
- Campo de pesquisa rápida

### Extração de Informações
Quando logado, extrai:
- **Nome do usuário**: Do link de usuário ou elementos com informações de perfil
- **Unidade atual**: Do link de unidade na barra de navegação
- **Timestamp**: Momento da última verificação

## 📁 Estrutura dos Arquivos

```
4-detecta-sei/
├── manifest.json       # Configuração da extensão
├── content.js          # Script que analisa as páginas
├── background.js       # Script de background para gerenciar estado
├── popup.html          # Interface do popup
├── popup.js            # Lógica do popup
└── README.md          # Esta documentação
```

## 🎨 Recursos Visuais

- **Badge Colorido**: Indicação visual rápida na barra de ferramentas
- **Interface Responsiva**: Popup adaptável com design moderno
- **Ícones Intuitivos**: Símbolos claros para cada estado
- **Cores Semânticas**: Verde (logado), vermelho (não logado), laranja (login)

## 🔒 Privacidade e Segurança

- **Não coleta dados pessoais**: Todas as informações ficam localmente
- **Não envia dados**: Nenhuma informação é transmitida para servidores externos
- **Permissões mínimas**: Apenas acesso à aba ativa e armazenamento local
- **Open Source**: Código totalmente transparente

## 🐛 Resolução de Problemas

### A extensão não detecta o SEI
- Verifique se está em uma página oficial do SEI
- Aguarde alguns segundos após carregar a página
- Clique no ícone da extensão para forçar uma nova verificação

### Badge não aparece
- Recarregue a página
- Verifique se a extensão está ativada em `chrome://extensions/`
- Tente desabilitar e reabilitar a extensão

### Informações incorretas
- A detecção baseia-se em elementos HTML específicos
- Diferentes versões do SEI podem ter estruturas ligeiramente diferentes
- A extensão se adapta automaticamente na maioria dos casos

## 🔄 Atualizações e Melhorias

A extensão é atualizada automaticamente conforme você navega pelas páginas. Usa um sistema de observação de mudanças no DOM para detectar transições entre estados de login.

## 🤝 Contribuições

Este projeto é open source. Sinta-se à vontade para:
- Reportar bugs
- Sugerir melhorias
- Contribuir com código
- Testar em diferentes versões do SEI

## 📞 Suporte

Para suporte ou dúvidas sobre a extensão, consulte o código fonte ou abra uma issue no repositório do projeto.

---

**Desenvolvido para facilitar o trabalho com o Sistema Eletrônico de Informações (SEI)**