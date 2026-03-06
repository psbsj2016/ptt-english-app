// API URL - ATUALIZE COM SUA URL DO RAILWAY
const API_URL = 'https://ptt-english-app-production.up.railway.app/api';

// Estado global
let activitiesCompleted = 0;
let currentActivity = null;
let recognition = null;
let isRecording = false;
let deferredPrompt = null;
let authToken = localStorage.getItem('ptt-token');
let currentUser = JSON.parse(localStorage.getItem('ptt-user') || 'null');
let isLoginMode = true;

// Inicialização
window.addEventListener('load', () => {
    if (authToken && currentUser) {
        const authModal = document.getElementById('auth-modal');
        if (authModal) authModal.classList.add('hidden');
        loadUserProfile();
    }
    loadProgress();
    registerServiceWorker();
    setupInstallBanner();
});

// Service Worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('✅ SW registrado'))
            .catch(err => console.log('❌ SW erro:', err));
    }
}

// Banner PWA
function setupInstallBanner() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        const banner = document.getElementById('install-banner');
        if (banner) banner.classList.add('show');
    });
    const installBtn = document.getElementById('install-btn');
    if (installBtn) {
        installBtn.onclick = async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                await deferredPrompt.userChoice;
                deferredPrompt = null;
                document.getElementById('install-banner').classList.remove('show');
            }
        };
    }
    const dismissBtn = document.getElementById('dismiss-install');
    if (dismissBtn) {
        dismissBtn.onclick = () => {
            document.getElementById('install-banner').classList.remove('show');
        };
    }
}

// Auth: Toggle login/registro
function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    const nameField = document.getElementById('auth-name');
    const authBtn = document.getElementById('auth-btn');
    const toggleText = document.getElementById('auth-toggle-text');
    if (nameField) nameField.classList.toggle('hidden');
    if (authBtn) authBtn.innerText = isLoginMode ? 'ENTRAR' : 'CRIAR CONTA';
    if (toggleText) toggleText.innerText = isLoginMode ? 'Não tem conta?' : 'Já tem conta?';
}

// Auth: Handle
async function handleAuth() {
    const email = document.getElementById('auth-email')?.value;
    const password = document.getElementById('auth-password')?.value;
    const name = document.getElementById('auth-name')?.value;
    const errorEl = document.getElementById('auth-error');
    const btn = document.getElementById('auth-btn');

    if (!email || !password) { showError(errorEl, 'Preencha email e senha'); return; }
    if (!isLoginMode && !name) { showError(errorEl, 'Preencha o nome'); return; }

    setLoading(btn, true, 'Carregando...');
    hideError(errorEl);

    try {
        const endpoint = isLoginMode ? '/auth/login' : '/auth/register';
        const body = isLoginMode ? { email, password } : { email, password, name };
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro na autenticação');
        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem('ptt-token', authToken);
        localStorage.setItem('ptt-user', JSON.stringify(currentUser));
        document.getElementById('auth-modal').classList.add('hidden');
        loadUserProfile();
    } catch (error) {
        showError(errorEl, error.message);
    } finally {
        setLoading(btn, false, isLoginMode ? 'ENTRAR' : 'CRIAR CONTA');
    }
}

// Logout
function logout() {
    localStorage.removeItem('ptt-token');
    localStorage.removeItem('ptt-user');
    authToken = null;
    currentUser = null;
    document.getElementById('auth-modal').classList.remove('hidden');
    location.reload();
}

// Carregar perfil
function loadUserProfile() {
    if (!currentUser) return;
    const nameEl = document.getElementById('user-name-display');
    const xpEl = document.getElementById('user-xp');
    const levelEl = document.getElementById('user-level');
    if (nameEl) nameEl.innerText = `Olá, ${currentUser.name}!`;
    if (xpEl) xpEl.innerText = currentUser.total_xp || 0;
    if (levelEl) levelEl.innerText = currentUser.level || 'Iniciante';
}

// Carregar progresso
function loadProgress() {
    const saved = localStorage.getItem('ptt-activities');
    if (saved) {
        activitiesCompleted = parseInt(saved);
        updateProgressUI();
    }
}

// Atualizar UI progresso
function updateProgressUI() {
    const progress = Math.min((activitiesCompleted / 8) * 100, 100);
    const fill = document.getElementById('progress-fill');
    const text = document.getElementById('daily-progress');
    if (fill) fill.style.width = `${progress}%`;
    if (text) text.innerText = `${activitiesCompleted}/8 atividades`;
}

// Dados dos conteúdos
const contentData = {
    logica: { title: '🧠 Lógica', subtitle: 'Sintaxe', color: 'from-logica-500 to-logica-700', icon: 'puzzle-piece', xp: 50 },
    contexto: { title: '💬 Contexto', subtitle: 'Semântica', color: 'from-contexto-500 to-contexto-700', icon: 'chat-circle-text', xp: 50 },
    som: { title: '🔊 Som', subtitle: 'Fonética', color: 'from-som-500 to-som-700', icon: 'speaker-high', xp: 50 },
    listening: { title: '🎧 Listening', subtitle: 'Escuta', color: 'from-listening-500 to-listening-700', icon: 'headphones', xp: 50 },
    speaking: { title: '🎤 Speaking', subtitle: 'Fala', color: 'from-speaking-500 to-speaking-700', icon: 'microphone', xp: 50 },
    reading: { title: '📖 Reading', subtitle: 'Leitura', color: 'from-reading-500 to-reading-700', icon: 'book-open', xp: 50 },
    writing: { title: '✍️ Writing', subtitle: 'Escrita', color: 'from-writing-500 to-writing-700', icon: 'pencil-simple', xp: 50 },
    training: { title: '🚀 Training', subtitle: 'Completo', color: 'from-training-500 to-training-700', icon: 'aperture', xp: 100 }
};

// Abrir conteúdo
function openContent(type) {
    currentActivity = type;
    const data = contentData[type];
    const header = document.getElementById('modal-header');
    const icon = document.getElementById('modal-icon');
    const title = document.getElementById('modal-title');
    const subtitle = document.getElementById('modal-subtitle');
    const body = document.getElementById('modal-body');
    if (header) header.className = `bg-gradient-to-r ${data.color} p-5 text-white relative`;
    if (icon) icon.innerHTML = `<i class="ph-fill ph-${data.icon} text-2xl"></i>`;
    if (title) title.innerText = data.title;
    if (subtitle) subtitle.innerText = data.subtitle;
    if (body) body.innerHTML = getExerciseContent(type);
    const modal = document.getElementById('content-modal');
    if (modal) modal.classList.remove('hidden');
    if (type === 'speaking') initSpeechRecognition();
}

// Conteúdo dos exercícios
function getExerciseContent(type) {
    const contents = {
        logica: `<div class="space-y-4"><div class="bg-purple-50 p-4 rounded-xl"><h4 class="font-bold text-purple-700 mb-2">Complete:</h4><p class="text-lg bg-white p-3 rounded-lg mb-3">"She ___ to the store yesterday."</p><div class="space-y-2"><button class="option-btn w-full p-3 rounded-xl border-2" onclick="selectOption(this,false)">go</button><button class="option-btn w-full p-3 rounded-xl border-2" onclick="selectOption(this,true)">went</button></div></div></div>`,
        contexto: `<div class="space-y-4"><div class="bg-amber-50 p-4 rounded-xl"><h4 class="font-bold text-amber-700 mb-2">No Restaurante:</h4><button class="option-btn w-full p-3 rounded-xl border-2 mb-2" onclick="selectOption(this,false)">"I want food!"</button><button class="option-btn w-full p-3 rounded-xl border-2" onclick="selectOption(this,true)">"Could I see the menu?"</button></div></div>`,
        som: `<div class="space-y-4"><div class="bg-emerald-50 p-4 rounded-xl"><h4 class="font-bold text-emerald-700 mb-2">Som /θ/</h4><div class="grid grid-cols-2 gap-2"><div class="bg-white p-3 rounded-lg text-center"><p class="font-bold">Think</p></div><div class="bg-white p-3 rounded-lg text-center"><p class="font-bold">Three</p></div></div><button onclick="playAudio()" class="w-full bg-emerald-500 text-white p-3 rounded-xl mt-3">🔊 Ouvir</button></div></div>`,
        listening: `<div class="space-y-4"><div class="bg-red-50 p-4 rounded-xl"><button onclick="playAudio()" class="bg-red-500 text-white rounded-full p-4 mx-auto block mb-3"><i class="ph-fill ph-play text-2xl"></i></button><button class="option-btn w-full p-3 rounded-xl border-2 mb-2" onclick="selectOption(this,false)">"She is reading"</button><button class="option-btn w-full p-3 rounded-xl border-2" onclick="selectOption(this,true)">"She has been reading"</button></div></div>`,
        speaking: `<div class="space-y-4"><div class="bg-blue-50 p-4 rounded-xl"><p class="text-center mb-3">"Hello! I am learning English!"</p><button id="record-btn" onclick="toggleRecording()" class="bg-red-500 text-white rounded-full p-4 mx-auto block"><i class="ph-fill ph-microphone text-2xl"></i></button><p id="recording-status" class="text-center text-sm mt-2">Toque para gravar</p></div></div>`,
        reading: `<div class="space-y-4"><div class="bg-indigo-50 p-4 rounded-xl"><p class="mb-3"><strong>My Routine</strong><br>I wake up at 7 AM. I go to work by bus.</p><button class="option-btn w-full p-3 rounded-xl border-2 mb-2" onclick="selectOption(this,false)">Carro</button><button class="option-btn w-full p-3 rounded-xl border-2" onclick="selectOption(this,true)">Ônibus</button></div></div>`,
        writing: `<div class="space-y-4"><div class="bg-pink-50 p-4 rounded-xl"><p class="mb-2">Tema: My Hobbies</p><textarea id="writing-input" class="custom-input w-full rounded-xl p-3" rows="4" placeholder="I like..."></textarea></div></div>`,
        training: `<div class="space-y-4"><div class="bg-cyan-50 p-4 rounded-xl"><h4 class="font-bold text-cyan-700 mb-2">Training Completo</h4><p>Integra todos os métodos e habilidades.</p><div class="grid grid-cols-2 gap-2 mt-3"><div class="bg-white p-2 rounded-lg text-center text-xs"><i class="ph-fill ph-puzzle-piece text-purple-600"></i><br>Lógica</div><div class="bg-white p-2 rounded-lg text-center text-xs"><i class="ph-fill ph-chat-circle-text text-amber-600"></i><br>Contexto</div><div class="bg-white p-2 rounded-lg text-center text-xs"><i class="ph-fill ph-speaker-high text-emerald-600"></i><br>Som</div><div class="bg-white p-2 rounded-lg text-center text-xs"><i class="ph-fill ph-aperture text-cyan-600"></i><br>Skills</div></div></div></div>`
    };
    return contents[type] || '';
}

// Fechar modal
function closeModal() {
    const modal = document.getElementById('content-modal');
    if (modal) modal.classList.add('hidden');
    stopRecording();
}

// Completar atividade
async function completeActivity() {
    if (currentActivity === 'writing') {
        const input = document.getElementById('writing-input');
        if (input && input.value.length < 20) {
            alert('Mínimo 20 caracteres!');
            return;
        }
    }
    const btn = document.getElementById('complete-btn');
    setLoading(btn, true, 'Enviando...');
    try {
        const data = contentData[currentActivity];
        if (authToken && currentUser) {
            await fetch(`${API_URL}/progress/activity`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    activity_type: currentActivity,
                    activity_name: data.title,
                    xp_earned: data.xp
                })
            });
        }
        activitiesCompleted++;
        localStorage.setItem('ptt-activities', activitiesCompleted);
        updateProgressUI();
        closeModal();
        const successModal = document.getElementById('success-modal');
        const successActivity = document.getElementById('success-activity');
        const successXp = document.getElementById('success-xp');
        if (successModal) successModal.classList.remove('hidden');
        if (successActivity) successActivity.innerText = data.title;
        if (successXp) successXp.innerText = `+${data.xp} XP`;
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao salvar progresso.');
    } finally {
        setLoading(btn, false, 'CONCLUIR');
    }
}

// Fechar sucesso
function closeSuccessModal() {
    const modal = document.getElementById('success-modal');
    if (modal) modal.classList.add('hidden');
}

// Selecionar opção
function selectOption(element, isCorrect) {
    const parent = element.parentElement;
    if (!parent) return;
    parent.querySelectorAll('.option-btn').forEach(btn => {
        btn.classList.remove('border-green-500', 'bg-green-50', 'border-red-500', 'bg-red-50', 'pop', 'shake');
        btn.classList.add('border-gray-200');
    });
    if (isCorrect) {
        element.classList.remove('border-gray-200');
        element.classList.add('border-green-500', 'bg-green-50', 'pop');
    } else {
        element.classList.remove('border-gray-200');
        element.classList.add('border-red-500', 'bg-red-50', 'shake');
    }
}

// Speech Recognition
function initSpeechRecognition() {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'en-US';
        recognition.onresult = (event) => {
            const status = document.getElementById('recording-status');
            if (status) status.innerText = `Você disse: "${event.results[0][0].transcript}"`;
        };
    }
}

// Toggle recording
function toggleRecording() {
    if (!recognition) { alert('Use Chrome para reconhecimento de voz'); return; }
    if (isRecording) { stopRecording(); }
    else {
        recognition.start();
        isRecording = true;
        const btn = document.getElementById('record-btn');
        const status = document.getElementById('recording-status');
        if (btn) btn.classList.replace('bg-red-500', 'bg-gray-500');
        if (status) status.innerText = 'Ouvindo...';
    }
}

// Stop recording
function stopRecording() {
    if (recognition && isRecording) {
        recognition.stop();
        isRecording = false;
        const btn = document.getElementById('record-btn');
        if (btn) btn.classList.replace('bg-gray-500', 'bg-red-500');
    }
}

// Play audio
function playAudio() {
    const utterance = new SpeechSynthesisUtterance('She has been reading for hours');
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
}

// Helpers
function showError(el, msg) { if (el) { el.innerText = msg; el.classList.remove('hidden'); } }
function hideError(el) { if (el) el.classList.add('hidden'); }
function setLoading(btn, loading, text) {
    if (!btn) return;
    if (loading) { btn.classList.add('loading'); btn.innerText = text; }
    else { btn.innerHTML = `<i class="ph-fill ph-check-circle text-xl"></i><span>${text}</span>`; }
}