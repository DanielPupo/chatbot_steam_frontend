// Altere para 'http://127.0.0.1:5000' se for rodar o Flask localmente na sua máquina
const URL_BACKEND = 'https://chatbot-backend-sj06.onrender.com'; 

document.addEventListener('DOMContentLoaded', () => {
    let socket = null;

    const chatBox = document.getElementById('chat-box');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const connectionStatus = document.getElementById('connection-status');
    const iniciarBtn = document.getElementById('iniciarBtn');
    const encerrarBtn = document.getElementById('encerrarBtn');
    const limparBtn = document.getElementById('limparBtn');

    let userSessionId = null;

    // Adiciona mensagens no chat utilizando os utilitários do Tailwind
    function addMessageToChat(sender, text, type = 'normal') {
        const wrapper = document.createElement('div');
        
        if (type === 'status') {
            wrapper.className = "flex justify-center my-1";
            wrapper.innerHTML = `<span class="bg-slate-200 text-slate-600 text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">${text}</span>`;
            chatBox.appendChild(wrapper);
            chatBox.scrollTop = chatBox.scrollHeight;
            return;
        }

        const messageElement = document.createElement('div');
        
        if (sender.toLowerCase() === 'user') {
            wrapper.className = "flex items-start justify-end space-x-2.5 max-w-[85%] ml-auto";
            messageElement.className = "bg-amber-400 border-2 border-slate-900 text-slate-900 p-3 rounded-2xl rounded-tr-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] text-sm font-semibold leading-relaxed markdown-content";
            messageElement.innerHTML = marked.parse(text);
        } else if (sender.toLowerCase() === 'bot') {
            wrapper.className = "flex items-start space-x-2.5 max-w-[85%]";
            messageElement.className = "bg-white border-2 border-slate-200 text-slate-800 p-3 rounded-2xl rounded-tl-none shadow-sm text-sm leading-relaxed markdown-content";
            
            // Icone lateral fixo do Sparky
            const icon = document.createElement('div');
            icon.className = "w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center font-bold text-amber-400 text-sm shrink-0 border border-slate-950 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]";
            icon.textContent = "⚡";
            wrapper.appendChild(icon);
            messageElement.innerHTML = marked.parse(text);
        } else if (type === 'error') {
            wrapper.className = "flex items-start space-x-2.5 max-w-[85%]";
            messageElement.className = "bg-red-50 border-2 border-red-200 text-red-700 p-3 rounded-2xl text-sm font-medium";
            messageElement.textContent = text;
        }

        wrapper.appendChild(messageElement);
        chatBox.appendChild(wrapper);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function setChatEnabled(enabled) {
        messageInput.disabled = !enabled;
        sendButton.disabled = !enabled;
        if(enabled) {
            messageInput.classList.remove('bg-slate-100', 'cursor-not-allowed');
            messageInput.placeholder = "Digite sua dúvida aqui (Aluno ou Professor)...";
        } else {
            messageInput.classList.add('bg-slate-100', 'cursor-not-allowed');
            messageInput.placeholder = "Clique em INICIAR SPARKY para conversar...";
        }
    }

    // Configuração inicial de bloqueio
    setChatEnabled(false);
    connectionStatus.textContent = 'Offline';
    connectionStatus.className = "text-xs font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full inline-block";
    addMessageToChat('Status', 'Clique em Iniciar Experiência para ativar o Sparky.', 'status');

    function iniciarConversa() {
        if (socket && socket.connected) return;

        connectionStatus.textContent = 'Conectando...';
        socket = io(URL_BACKEND);

        socket.on('connect', () => {
            connectionStatus.textContent = 'Sparky Ativo';
            connectionStatus.className = "text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-block animate-pulse";
            addMessageToChat('Status', 'Conexão estabelecida com a central STEAM+.', 'status');
            setChatEnabled(true);
        });

        socket.on('disconnect', () => {
            connectionStatus.textContent = 'Sessão Encerrada';
            connectionStatus.className = "text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full inline-block";
            addMessageToChat('Status', 'A conexão com o assistente foi finalizada.', 'status');
            setChatEnabled(false);
        });

        socket.on('connect_error', (error) => {
            connectionStatus.textContent = 'Falha de Link';
            connectionStatus.className = "text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full inline-block";
            addMessageToChat('Erro', 'Não foi possível estabelecer contato com o backend.', 'error');
            setChatEnabled(false);
            console.error('Socket.IO erro:', error);
        });

        socket.on('status_conexao', (data) => {
            if (data.session_id) { userSessionId = data.session_id; }
        });

        socket.on('nova_mensagem', (data) => {
            addMessageToChat(data.remetente, data.texto);
        });

        socket.on('erro', (data) => {
            addMessageToChat('Erro', data.erro, 'error');
        });
    }

    function encerrarConversa() {
        if (socket && socket.connected) {
            socket.disconnect();
            setChatEnabled(false);
        }
    }

    function limparTela() {
        chatBox.innerHTML = '';
        addMessageToChat('Status', 'Histórico de comandos limpo.', 'status');
    }

    function sendMessageToServer() {
        const messageText = messageInput.value.trim();
        if (messageText === '') return;

        if (socket && socket.connected) {
            addMessageToChat('user', messageText);
            socket.emit('enviar_mensagem', { mensagem: messageText });
            messageInput.value = '';
            messageInput.focus();
        } else {
            addMessageToChat('Erro', 'Você precisa ativar o Sparky primeiro.', 'error');
        }
    }

    iniciarBtn.addEventListener('click', iniciarConversa);
    encerrarBtn.addEventListener('click', encerrarConversa);
    limparBtn.addEventListener('click', limparTela);
    sendButton.addEventListener('click', sendMessageToServer);

    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') { sendMessageToServer(); }
    });
});