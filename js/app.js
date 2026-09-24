/* =========================================================
   LÓGICA PRINCIPAL DO APLICATIVO - PONTO E ANTIFRAUDE
   ========================================================= */

// Banco de Dados Local Fallback (Mock) para Desenvolvimento/Demo Kiosk
const LOCAL_EMPLOYEES = {
    '1001': { matricula: '1001', cpf: '12345678901', nome: 'Carlos Eduardo Silva', cargo: 'Desenvolvedor Senior' },
    '1002': { matricula: '1002', cpf: '98765432100', nome: 'Ana Maria Souza', cargo: 'Analista de RH' },
    '1003': { matricula: '1003', cpf: '45678912300', nome: 'Roberto Santos', cargo: 'Gerente de Operações' },
    '12345678901': { matricula: '1001', cpf: '12345678901', nome: 'Carlos Eduardo Silva', cargo: 'Desenvolvedor Senior' },
    '98765432100': { matricula: '1002', cpf: '98765432100', nome: 'Ana Maria Souza', cargo: 'Analista de RH' },
    '45678912300': { matricula: '1003', cpf: '45678912300', nome: 'Roberto Santos', cargo: 'Gerente de Operações' }
};

// Estado Global
let selectedType = 'ENTRADA';
let html5QrCode = null;
let recentSessionLogs = [];

// Elementos DOM
const clockTimeElem = document.getElementById('clock-time');
const clockDateElem = document.getElementById('clock-date');
const employeeInput = document.getElementById('employee-id-input');
const btnBackspace = document.getElementById('btn-backspace');
const btnClear = document.getElementById('btn-clear');
const btnSubmit = document.getElementById('btn-submit');
const alertBox = document.getElementById('alert-box');
const alertMessage = document.getElementById('alert-message');
const suggestedTypeBadge = document.getElementById('suggested-type-badge');
const btnTypeEntrada = document.getElementById('btn-type-entrada');
const btnTypeSaida = document.getElementById('btn-type-saida');
const recentLogsList = document.getElementById('recent-logs-list');

// Modais
const qrModal = document.getElementById('qr-modal');
const btnOpenQr = document.getElementById('btn-open-qr');
const btnCloseQr = document.getElementById('btn-close-qr');

const ticketModal = document.getElementById('ticket-modal');
const btnCloseTicket = document.getElementById('btn-close-ticket');
const btnPrintTicket = document.getElementById('btn-print-ticket');

// Inicialização da Aplicação ao Carregar DOM
document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initKeypad();
    initTypeSelector();
    initModalHandlers();
    loadSessionLogs();

    // Suporte para digitação pelo teclado físico
    document.addEventListener('keydown', handlePhysicalKeyboard);
});

/* =========================================================
   1. RELÓGIO EM TEMPO REAL (DATA E HORA SINCRONIZADAS)
   ========================================================= */
function initClock() {
    function updateClock() {
        const now = new Date();

        // Formata Hora: HH:MM:SS
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        clockTimeElem.textContent = `${hours}:${minutes}:${seconds}`;

        // Formata Data por extenso em Português
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        clockDateElem.textContent = now.toLocaleDateString('pt-BR', options);
    }

    updateClock();
    setInterval(updateClock, 1000);
}

/* =========================================================
   2. TECLADO NUMÉRICO VIRTUAL E ENTRADA
   ========================================================= */
function initKeypad() {
    const keypadButtons = document.querySelectorAll('.keypad-btn[data-key]');
    keypadButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.getAttribute('data-key');
            if (employeeInput.value.length < 14) {
                employeeInput.value += key;
                checkEmployeeStatusAndLock();
            }
        });
    });

    btnBackspace.addEventListener('click', () => {
        employeeInput.value = employeeInput.value.slice(0, -1);
        checkEmployeeStatusAndLock();
    });

    btnClear.addEventListener('click', () => {
        employeeInput.value = '';
        clearAlert();
        resetSuggestedBadge();
    });

    btnSubmit.addEventListener('click', handleSubmitPonto);
}

// Preenchimento Rápido via Demo Items
window.quickFill = function(matricula) {
    employeeInput.value = matricula;
    checkEmployeeStatusAndLock();
};

function handlePhysicalKeyboard(e) {
    if (document.activeElement.tagName === 'INPUT' && document.activeElement !== employeeInput) return;

    if (e.key >= '0' && e.key <= '9') {
        if (employeeInput.value.length < 14) {
            employeeInput.value += e.key;
            checkEmployeeStatusAndLock();
        }
    } else if (e.key === 'Backspace') {
        employeeInput.value = employeeInput.value.slice(0, -1);
        checkEmployeeStatusAndLock();
    } else if (e.key === 'Enter') {
        handleSubmitPonto();
    } else if (e.key === 'Escape') {
        employeeInput.value = '';
        clearAlert();
        resetSuggestedBadge();
    }
}

/* =========================================================
   3. SELETOR DE TIPO (ENTRADA / SAÍDA) E ALTERNÂNCIA
   ========================================================= */
function initTypeSelector() {
    btnTypeEntrada.addEventListener('click', () => setType('ENTRADA'));
    btnTypeSaida.addEventListener('click', () => setType('SAIDA'));
}

function setType(type) {
    selectedType = type;
    btnTypeEntrada.classList.toggle('active', type === 'ENTRADA');
    btnTypeSaida.classList.toggle('active', type === 'SAIDA');
    checkEmployeeStatusAndLock();
}

function resetSuggestedBadge() {
    suggestedTypeBadge.className = 'badge badge-entrada';
    suggestedTypeBadge.innerHTML = '<i data-lucide="arrow-right-circle"></i> ENTRADA';
    if (window.lucide) lucide.createIcons();
}

/* =========================================================
   4. ESTRATÉGIA ANTIFRAUDE: CONSULTA DE ÚLTIMO REGISTRO E HASH
   ========================================================= */

// Procura último registro do funcionário no Supabase ou LocalStorage
async function getLastRecord(matricula) {
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('registros_ponto')
                .select('*')
                .eq('matricula', matricula)
                .order('data_hora', { ascending: false })
                .limit(1);

            if (!error && data && data.length > 0) {
                return data[0];
            }
        } catch (err) {
            console.warn("Erro ao buscar registros no Supabase:", err);
        }
    }

    // Fallback LocalStorage
    const localRecords = JSON.parse(localStorage.getItem('ponto_registros') || '[]');
    const userRecords = localRecords.filter(r => r.matricula === matricula);
    userRecords.sort((a, b) => new Date(b.data_hora) - new Date(a.data_hora));
    return userRecords[0] || null;
}

// Verifica regras temporais (120s) e lógica de sequenciamento
async function checkEmployeeStatusAndLock() {
    const inputVal = employeeInput.value.trim();
    clearAlert();

    if (inputVal.length < 3) {
        resetSuggestedBadge();
        return;
    }

    // Resolve Matrícula
    const emp = LOCAL_EMPLOYEES[inputVal];
    const matricula = emp ? emp.matricula : inputVal;

    const lastRecord = await getLastRecord(matricula);

    if (lastRecord) {
        const lastTime = new Date(lastRecord.data_hora).getTime();
        const nowTime = new Date().getTime();
        const diffSeconds = Math.floor((nowTime - lastTime) / 1000);

        // Bloqueio Antifraude: 120 segundos
        if (diffSeconds < CONFIG.MIN_INTERVAL_SECONDS) {
            const remaining = CONFIG.MIN_INTERVAL_SECONDS - diffSeconds;
            showAlert(`MÍNIMO DE 2 MINUTOS ENTRE REGISTROS! Aguarde ${remaining}s para registrar novamente.`, 'danger');
            btnSubmit.disabled = true;
            return;
        }

        // Determina próximo status lógico
        const expectedType = lastRecord.tipo === 'ENTRADA' ? 'SAIDA' : 'ENTRADA';

        // Atualiza Badge Sugerido
        if (expectedType === 'ENTRADA') {
            suggestedTypeBadge.className = 'badge badge-entrada';
            suggestedTypeBadge.innerHTML = '<i data-lucide="arrow-right-circle"></i> ENTRADA';
        } else {
            suggestedTypeBadge.className = 'badge badge-saida';
            suggestedTypeBadge.innerHTML = '<i data-lucide="arrow-right-circle"></i> SAÍDA';
        }
        if (window.lucide) lucide.createIcons();

        // Alerta de divergência caso o usuário selecione um tipo diferente do esperado
        if (selectedType !== expectedType) {
            showAlert(`Atenção: Seu último registro foi de ${lastRecord.tipo}. O sistema esperava uma ${expectedType}.`, 'warning');
        }
    } else {
        resetSuggestedBadge();
    }

    btnSubmit.disabled = false;
}

// Geração do Hash SHA-256 Antifraude (Primeiros 12 caracteres)
function generateAntifraudHash(matricula, tipo, isoTimestamp) {
    const rawString = `${matricula}${tipo}${isoTimestamp}${CONFIG.SYSTEM_SALT}`;
    // Usando biblioteca js-sha256 via CDN
    const fullHash = sha256(rawString);
    return fullHash.substring(0, 12).toUpperCase();
}

/* =========================================================
   5. REGISTRO DE PONTO E COMPROVANTE (SUBMIT)
   ========================================================= */
async function handleSubmitPonto() {
    const inputVal = employeeInput.value.trim();

    if (!inputVal) {
        showAlert('Por favor, digite sua Matrícula ou CPF.', 'danger');
        return;
    }

    // Identifica Funcionário
    let employee = LOCAL_EMPLOYEES[inputVal];
    let matricula = inputVal;
    let nomeFuncionario = 'Funcionário Cadastrado';

    if (employee) {
        matricula = employee.matricula;
        nomeFuncionario = employee.nome;
    } else {
        nomeFuncionario = `Matrícula: ${matricula}`;
    }

    // Dupla verificação do bloqueio antifraude 120s
    const lastRecord = await getLastRecord(matricula);
    const nowIso = new Date().toISOString();
    const nowTime = new Date(nowIso).getTime();

    if (lastRecord) {
        const lastTime = new Date(lastRecord.data_hora).getTime();
        const diffSeconds = Math.floor((nowTime - lastTime) / 1000);
        if (diffSeconds < CONFIG.MIN_INTERVAL_SECONDS) {
            showAlert(`Registro Bloqueado! Intervalo de 2 minutos não cumprido (${diffSeconds}s decorridos).`, 'danger');
            return;
        }
    }

    // Gera Hash Antifraude Determinístico
    const hash12 = generateAntifraudHash(matricula, selectedType, nowIso);

    const recordPayload = {
        matricula: matricula,
        tipo: selectedType,
        data_hora: nowIso,
        hash_verificacao: hash12,
        origem: 'TABLET_KIOSK'
    };

    // Grava no Supabase
    let savedSuccess = false;
    if (supabaseClient) {
        try {
            const { error } = await supabaseClient.from('registros_ponto').insert([recordPayload]);
            if (!error) savedSuccess = true;
        } catch (e) {
            console.warn("Erro inserindo no Supabase:", e);
        }
    }

    // Sempre armazena no LocalStorage para redundância Kiosk
    saveLocalRecord(recordPayload);

    // Confetti Feedback Visual Discreto
    if (window.confetti) {
        confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 }
        });
    }

    // Exibe Ticket Digital Modal
    showTicketModal({
        matricula: matricula,
        nome: nomeFuncionario,
        tipo: selectedType,
        data_hora: new Date(nowIso).toLocaleString('pt-BR'),
        hash: hash12,
        isoTimestamp: nowIso
    });

    // Atualiza Lista de Registros Recentes da Sessão
    addSessionLog(recordPayload, nomeFuncionario);

    // Limpa Inputs
    employeeInput.value = '';
    clearAlert();
    resetSuggestedBadge();
}

function saveLocalRecord(payload) {
    const localRecords = JSON.parse(localStorage.getItem('ponto_registros') || '[]');
    localRecords.push(payload);
    localStorage.setItem('ponto_registros', JSON.stringify(localRecords));
}

function addSessionLog(record, nome) {
    recentSessionLogs.unshift({ ...record, nome });
    renderSessionLogs();
}

function renderSessionLogs() {
    if (recentSessionLogs.length === 0) {
        recentLogsList.innerHTML = '<div class="empty-list">Nenhum registro efetuado nesta sessão.</div>';
        return;
    }

    recentLogsList.innerHTML = recentSessionLogs.map(log => `
        <div class="log-item ${log.tipo}">
            <div class="log-info">
                <strong>${log.tipo} - ${log.matricula}</strong>
                <span class="log-hash">HASH: ${log.hash_verificacao}</span>
            </div>
            <div class="log-time">
                ${new Date(log.data_hora).toLocaleTimeString('pt-BR')}
            </div>
        </div>
    `).join('');
}

function loadSessionLogs() {
    const localRecords = JSON.parse(localStorage.getItem('ponto_registros') || '[]');
    recentSessionLogs = localRecords.slice(-5).reverse();
    renderSessionLogs();
}

/* =========================================================
   6. EXIBIÇÃO DE ALERTAS E MODAIS (TICKET & QR CODE)
   ========================================================= */
function showAlert(message, type = 'warning') {
    alertMessage.textContent = message;
    alertBox.className = `alert-box alert-${type}`;
}

function clearAlert() {
    alertBox.className = 'alert-box hidden';
    alertMessage.textContent = '';
}

function showTicketModal(data) {
    document.getElementById('ticket-matricula').textContent = data.matricula;
    document.getElementById('ticket-nome').textContent = data.nome;

    const typeElem = document.getElementById('ticket-tipo');
    typeElem.textContent = data.tipo;
    typeElem.style.color = data.tipo === 'ENTRADA' ? '#16A34A' : '#D97706';

    document.getElementById('ticket-datahora').textContent = data.data_hora;
    document.getElementById('ticket-hash').textContent = data.hash;
    document.getElementById('ticket-generated-at').textContent = `Impresso em: ${new Date().toLocaleString('pt-BR')}`;

    ticketModal.classList.remove('hidden');
}

function initModalHandlers() {
    btnCloseTicket.addEventListener('click', () => {
        ticketModal.classList.add('hidden');
    });

    btnPrintTicket.addEventListener('click', () => {
        window.print();
    });

    // Leitor de QR Code
    btnOpenQr.addEventListener('click', openQrScanner);
    btnCloseQr.addEventListener('click', closeQrScanner);
}

function openQrScanner() {
    qrModal.classList.remove('hidden');
    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("qr-reader-container");
    }

    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 200, height: 200 } },
        (decodedText) => {
            employeeInput.value = decodedText;
            checkEmployeeStatusAndLock();
            closeQrScanner();
        },
        (errorMessage) => {
            // Ignorar erros normais de varredura contínua
        }
    ).catch(err => {
        showAlert("Não foi possível acessar a câmera do tablet/computador.", "danger");
        closeQrScanner();
    });
}

function closeQrScanner() {
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
            qrModal.classList.add('hidden');
        }).catch(() => {
            qrModal.classList.add('hidden');
        });
    } else {
        qrModal.classList.add('hidden');
    }
}
