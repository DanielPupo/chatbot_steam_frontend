const URL_BACKEND = 'https://chatbot-steam-backend-2ckb.onrender.com'; 

document.addEventListener('DOMContentLoaded', () => {
    let socket = null;

    const chatBox = document.getElementById('chat-box');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const connectionStatus = document.getElementById('connection-status');
    const iniciarBtn = document.getElementById('iniciarBtn');
    const encerrarBtn = document.getElementById('encerrarBtn');
    const limparBtn = document.getElementById('limparBtn');
    
    // Elementos de Controle de Estado Visual (Dark Mode e Atalhos)
    const htmlElement = document.documentElement;
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeToggleIcon = document.getElementById('theme-toggle-icon');
    const chipButtons = document.querySelectorAll('.chip-btn');

    let userSessionId = null;

    // --- ENGENHARIA DE CONTROLE DO MODO CLARO / ESCURO (TAILWIND v4) ---
    const salvarTema = (tema) => {
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

    // Inicialização baseada na preferência salva ou no sistema operacional
    const temaSalvo = localStorage.getItem('theme');
    if (temaSalvo === 'dark' || (!temaSalvo && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        salvarTema('dark');
    } else {
        salvarTema('light');
    }

    themeToggleBtn.addEventListener('click', () => {
        const haseEscuroAtivo = htmlElement.classList.contains('dark');
        salvarTema(haseEscuroAtivo ? 'light' : 'dark');
    });

    // --- DETECÇÃO DINÂMICA DE PAPEL PEDAGÓGICO (FILTRO DE CHIPS) ---
    function atualizarSugestoesDeContexto(inputTexto) {
        const termo = inputTexto.toLowerCase();
        
        // Se detectou termos do universo do Aluno
        if (termo.includes('aluno') || termo.includes('estudante') || termo.includes('6º') || termo.includes('7º') || termo.includes('8º')) {
            chipButtons.forEach(btn => {
                const msg = btn.getAttribute('data-msg').toLowerCase();
                if (msg.includes('xp') || msg.includes('lojinha') || msg.includes('circuito')) {
                    btn.classList.remove('hidden');
                } else {
                    btn.classList.add('hidden');
                }
            });
        } 
        // Se detectou termos do universo do Professor
        else if (termo.includes('professor') || termo.includes('docente') || termo.includes('aula') || termo.includes('nota')) {
            chipButtons.forEach(btn => {
                const msg = btn.getAttribute('data-msg').toLowerCase();
                if (msg.includes('sistema') || msg.includes('ideias')) {
                    btn.classList.remove('hidden');
                } else {
                    btn.classList.add('hidden');
                }
            });
        } 
        // Estado neutro ou inicial da aplicação
        else {
            chipButtons.forEach((btn, index) => {
                if (index === 0 || index === 3) {
                    btn.classList.remove('hidden');
                } else {
                    btn.classList.add('hidden');
                }
            });
        }
    }

    // Configura os cliques diretos nas sugestões de balão
    chipButtons.forEach(button => {
        button.addEventListener('click', () => {
            messageInput.value = button.getAttribute('data-msg');
            sendMessageToServer();
        });
    });

    // --- RENDERIZADOR DE COMPONENTES DE CHAT (TAILWIND INTEGRADO) ---
    function addMessageToChat(sender, text, type = 'normal') {
        const wrapper = document.createElement('div');
        
        if (type === 'status') {
            wrapper.className = "flex justify-center my-1 animate-fade-in";
            wrapper.innerHTML = `<span class="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">${text}</span>`;
            chatBox.appendChild(wrapper);
            chatBox.scrollTop = chatBox.scrollHeight;
            return;
        }

        const messageElement = document.createElement('div');
        
        if (sender.toLowerCase() === 'user') {
            wrapper.className = "flex items-start justify-end space-x-2.5 max-w-[85%] ml-auto";
            messageElement.className = "bg-amber-400 border-2 border-slate-900 text-slate-900 p-3 rounded-2xl rounded-tr-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] text-sm font-semibold leading-relaxed markdown-content";
            messageElement.innerHTML = marked.parse(text);
            // Atualiza o comportamento dos botões baseado no que o usuário acabou de falar
            atualizarSugestoesDeContexto(text);
        } else if (sender.toLowerCase() === 'bot') {
            wrapper.className = "flex items-start space-x-2.5 max-w-[85%]";
            messageElement.className = "bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm text-sm leading-relaxed markdown-content dark:strong:text-amber-400";
            
            const icon = document.createElement('div');
            icon.className = "w-8 h-8 bg-slate-900 dark:bg-slate-100 rounded-lg flex items-center justify-center font-bold text-amber-400 dark:text-slate-900 text-sm shrink-0 border border-slate-950 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]";
            icon.textContent = "⚡";
            
            wrapper.appendChild(icon);
            messageElement.innerHTML = marked.parse(text);
        } else if (type === 'error') {
            wrapper.className = "flex items-start space-x-2.5 max-w-[85%]";
            messageElement.className = "bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 p-3 rounded-2xl text-sm font-medium";
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
            messageInput.classList.remove('bg-slate-100', 'dark:bg-slate-800', 'cursor-not-allowed');
            messageInput.placeholder = "Pergunte algo sobre tarefas, notas ou robótica...";
        } else {
            messageInput.classList.add('bg-slate-100', 'dark:bg-slate-800', 'cursor-not-allowed');
            messageInput.placeholder = "Clique em INICIAR SPARKY para liberar os comandos...";
            chipButtons.forEach(btn => btn.classList.add('hidden'));
        }
    }

    // Bloqueio preventivo inicial antes do aperto de conexão
    setChatEnabled(false);
    connectionStatus.textContent = 'Offline';
    connectionStatus.className = "text-xs font-bold text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full inline-block";
    addMessageToChat('Status', 'Ative o Sparky usando o menu lateral.', 'status');

    // --- GERENCIAMENTO DE SOCKETS E FLUXO ---
    function iniciarConversa() {
        if (socket && socket.connected) return;

        connectionStatus.textContent = 'Conectando...';
        socket = io(URL_BACKEND);

        socket.on('connect', () => {
            connectionStatus.textContent = 'Sparky Ativo';
            connectionStatus.className = "text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full inline-block";
            addMessageToChat('Status', 'Conexão estável com o laboratório STEAM+.', 'status');
            setChatEnabled(true);
            atualizarSugestoesDeContexto(""); // Inicializa com os principais chips visíveis
        });

        socket.on('disconnect', () => {
            connectionStatus.textContent = 'Offline';
            connectionStatus.className = "text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full inline-block";
            addMessageToChat('Status', 'A comunicação síncrona foi finalizada.', 'status');
            setChatEnabled(false);
        });

        socket.on('connect_error', (error) => {
            connectionStatus.textContent = 'Falha de Link';
            addMessageToChat('Erro', 'Não foi possível contatar o barramento WebSocket da plataforma.', 'error');
            setChatEnabled(false);
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

    function chatDesconectar() {
        if (socket && socket.connected) {
            socket.disconnect();
        }
    }

    function limparTela() {
        chatBox.innerHTML = '';
        addMessageToChat('Status', 'Tela redefinida com sucesso.', 'status');
        atualizarSugestoesDeContexto("");
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
            addMessageToChat('Erro', 'Você precisa acionar o barramento primeiro clicando em Iniciar.', 'error');
        }
    }

    iniciarBtn.addEventListener('click', iniciarConversa);
    encerrarBtn.addEventListener('click', chatDesconectar);
    limparBtn.addEventListener('click', limparTela);
    sendButton.addEventListener('click', sendMessageToServer);

    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') { sendMessageToServer(); }
    });
});