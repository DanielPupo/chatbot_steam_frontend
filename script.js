// Detectar URL do backend dinamicamente
const BACKEND_PROTOCOL = window.location.protocol;
const BACKEND_HOST = window.location.hostname;

// Se o frontend estiver na mesma origem (localhost:5000), conectar na mesma porta
// Se em produção, usar a URL do Render
const URL_BACKEND = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? `${BACKEND_PROTOCOL}//${BACKEND_HOST}:5000`
    : 'https://chatbot-steam-backend-2ckb.onrender.com';

console.log('🔗 Tentando conectar em:', URL_BACKEND);

document.addEventListener('DOMContentLoaded', () => {
    let socket = null;

    const chatBox = document.getElementById('chat-box');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const connectionStatus = document.getElementById('connection-status');
    const iniciarBtn = document.getElementById('iniciarBtn');
    const encerrarBtn = document.getElementById('encerrarBtn');
    const limparBtn = document.getElementById('limparBtn');

    const htmlElement = document.documentElement;
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeToggleIcon = document.getElementById('theme-toggle-icon');
    const chipButtons = document.querySelectorAll('.chip-btn');

    // --- CONTROLE DE MODO CLARO/ESCURO ---
    const alternarTema = (tema) => {
        if (tema === 'dark') {
            htmlElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            themeToggleIcon.textContent = '☀️';
        } else {
            htmlElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            themeToggleIcon.textContent = '🌙';
        }
    };

    // Respeitar preferências do sistema e localStorage
    const temaAtual = localStorage.getItem('theme');
    if (temaAtual) {
        alternarTema(temaAtual);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        alternarTema('dark');
    } else {
        alternarTema('light');
    }

    themeToggleBtn.addEventListener('click', () => {
        const escuroAtivo = htmlElement.classList.contains('dark');
        alternarTema(escuroAtivo ? 'light' : 'dark');
    });

    // --- GERENCIAMENTO DE INTERFACE DO CHAT ---
    function appendMessage(sender, text, type = 'normal') {
        const wrapper = document.createElement('div');

        if (type === 'status') {
            wrapper.className = "status-center";
            wrapper.textContent = text;
            chatBox.appendChild(wrapper);
            chatBox.scrollTop = chatBox.scrollHeight;
            return;
        }

        wrapper.className = `msg-wrapper ${sender.toLowerCase() === 'user' ? 'user' : 'bot'}`;
        const bubble = document.createElement('div');
        bubble.className = "msg-bubble";
        bubble.innerHTML = marked.parse(text);

        wrapper.appendChild(bubble);
        chatBox.appendChild(wrapper);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function setChatState(enabled) {
        messageInput.disabled = !enabled;
        sendButton.disabled = !enabled;
        if (enabled) {
            messageInput.placeholder = "Envie uma mensagem para o Sparky...";
            document.getElementById('chips-container').classList.remove('hidden');
        } else {
            messageInput.placeholder = "Clique em Iniciar Sparky para liberar o chat...";
            document.getElementById('chips-container').classList.add('hidden');
        }
    }

    // --- CONFIGURAÇÃO CHIPS ---
    chipButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            messageInput.value = btn.getAttribute('data-msg');
            sendMessage();
        });
    });

    // --- LIGAÇÃO E CONEXÃO DO SOCKET.IO (BOTÃO INICIAR) ---
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;
    const RECONNECT_DELAY = 3000;

    function conectarAoServidor() {
        if (socket && socket.connected) return;

        connectionStatus.textContent = 'Conectando...';
        console.log('🔗 Tentando conectar em:', URL_BACKEND);

        socket = io(URL_BACKEND, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
            forceNew: false,
            upgrade: true
        });

        // Mantenha o restante dos seus ouvintes abaixo (socket.on('connect'), etc.) exatamente como estão

        socket.on('connect', () => {
            reconnectAttempts = 0;
            connectionStatus.textContent = 'Sparky Ativo';
            connectionStatus.className = 'status-online';
            appendMessage('Status', 'Conexão estabelecida com a Central STEAM+.', 'status');
            setChatState(true);
            console.log('✅ Conectado ao servidor');
        });

        socket.on('disconnect', () => {
            connectionStatus.textContent = 'Desconectado';
            connectionStatus.className = 'status-offline';
            appendMessage('Status', 'Sessão encerrada.', 'status');
            setChatState(false);
            console.log('❌ Desconectado do servidor');
        });

        socket.on('connect_error', (error) => {
            reconnectAttempts++;
            connectionStatus.textContent = 'Erro de Link';
            console.error('⚠️ Erro de conexão:', error);

            if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                appendMessage('Bot', 'Falha ao conectar após múltiplas tentativas. Verifique sua conexão e tente novamente.', 'error');
                setChatState(false);
            } else {
                appendMessage('Bot', `Reconectando... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`, 'status');
            }
        });

        socket.on('nova_mensagem', (data) => {
            appendMessage(data.remetente, data.texto);
        });

        socket.on('erro', (data) => {
            appendMessage('Bot', data.erro, 'error');
        });

        socket.on('status_conexao', (data) => {
            console.log('Status recebido:', data);
        });
    }

    function desconectarDoServidor() {
        if (socket && socket.connected) {
            socket.disconnect();
        }
    }

    function sendMessage() {
        const text = messageInput.value.trim();
        if (!text) return;

        if (socket && socket.connected) {
            appendMessage('user', text);
            socket.emit('enviar_mensagem', { mensagem: text });
            messageInput.value = '';
            messageInput.focus();
        }
    }

    // Inicialização segura bloqueada
    setChatState(false);

    iniciarBtn.addEventListener('click', conectarAoServidor);
    encerrarBtn.addEventListener('click', desconectarDoServidor);
    limparBtn.addEventListener('click', () => {
        chatBox.innerHTML = '';
        appendMessage('Status', 'Histórico limpo.', 'status');
    });
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
});