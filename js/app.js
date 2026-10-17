/**
 * app.js — telas (bloqueio, abas, cofre), bloqueio automático e área de transferência
 */
const AUTO_LOCK_MS = 5 * 60 * 1000;   // 5 minutos parado = bloqueia
const CLIPBOARD_MS = 20 * 1000;       // limpa a área de transferência em 20s

const ui = {
    card: document.getElementById('appCard'),
    tabs: document.getElementById('tabs'),
    tabBtns: document.querySelectorAll('.tab[data-tab]'),
    lockBtn: document.getElementById('lockBtn'),

    viewLock: document.getElementById('view-lock'),
    viewGenerator: document.getElementById('view-generator'),
    viewVault: document.getElementById('view-vault'),

    lockHint: document.getElementById('lockHint'),
    lockTitle: document.getElementById('lockTitle'),
    masterInput: document.getElementById('masterInput'),
    masterConfirm: document.getElementById('masterConfirm'),
    unlockBtn: document.getElementById('unlockBtn'),
    lockMsg: document.getElementById('lockMsg'),

    saveBtn: document.getElementById('saveBtn'),

    listMode: document.getElementById('vaultListMode'),
    formMode: document.getElementById('vaultFormMode'),
    vaultList: document.getElementById('vaultList'),
    vaultMsg: document.getElementById('vaultMsg'),
    newBtn: document.getElementById('newBtn'),
    exportBtn: document.getElementById('exportBtn'),
    importBtn: document.getElementById('importBtn'),
    importFile: document.getElementById('importFile'),

    fTitle: document.getElementById('fTitle'),
    fSite: document.getElementById('fSite'),
    fUser: document.getElementById('fUser'),
    fPass: document.getElementById('fPass'),
    fShow: document.getElementById('fShow'),
    fGen: document.getElementById('fGen'),
    fSave: document.getElementById('fSave'),
    fCancel: document.getElementById('fCancel')
};

let isNewVault = false;
let editingId = null;
let autoLockTimer = null;
let clipTimer = null;
let vaultMsgTimer = null;

// ============================================
// TROCA DE TELAS
// ============================================
function showView(name) {
    ui.card.dataset.view = name;
    ui.viewLock.hidden = name !== 'lock';
    ui.viewGenerator.hidden = name !== 'generator';
    ui.viewVault.hidden = name !== 'vault';
    ui.tabs.hidden = name === 'lock';
    ui.tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === name));
}

ui.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        showView(btn.dataset.tab);
        if (btn.dataset.tab === 'vault') closeForm();
    });
});

// ============================================
// TELA DE BLOQUEIO
// ============================================
function setupLockScreen() {
    ui.masterInput.value = '';
    ui.masterConfirm.value = '';
    ui.lockMsg.textContent = '';
    ui.masterConfirm.hidden = !isNewVault;

    if (isNewVault) {
        ui.lockTitle.textContent = 'Criar senha mestra';
        ui.lockHint.textContent = 'Esta senha abre o cofre e NÃO pode ser recuperada. Use uma frase longa (12+ caracteres) e não esqueça.';
        ui.unlockBtn.textContent = 'Criar cofre';
        ui.masterInput.placeholder = 'Nova senha mestra';
    } else {
        ui.lockTitle.textContent = 'Cofre bloqueado';
        ui.lockHint.textContent = 'Digite a senha mestra para abrir.';
        ui.unlockBtn.textContent = 'Desbloquear';
        ui.masterInput.placeholder = 'Senha mestra';
    }
}

function lockMessage(text) {
    ui.lockMsg.textContent = text;
}

async function handleUnlock() {
    const pass = ui.masterInput.value;
    lockMessage('');

    if (isNewVault) {
        if (pass.length < 12) return lockMessage('Use pelo menos 12 caracteres (dica: uma frase longa).');
        if (pass !== ui.masterConfirm.value) return lockMessage('As senhas não conferem.');
    } else if (!pass) {
        return;
    }

    ui.unlockBtn.disabled = true;
    ui.unlockBtn.textContent = 'Verificando...';

    try {
        if (isNewVault) await Vault.create(pass);
        else await Vault.unlock(pass);

        isNewVault = false;
        ui.masterInput.value = '';
        ui.masterConfirm.value = '';
        enterApp();
    } catch (err) {
        lockMessage(err.message === 'WRONG_PASSWORD'
            ? 'Senha mestra incorreta.'
            : 'Não foi possível abrir o cofre.');
    } finally {
        ui.unlockBtn.disabled = false;
        ui.unlockBtn.textContent = isNewVault ? 'Criar cofre' : 'Desbloquear';
    }
}

ui.unlockBtn.addEventListener('click', handleUnlock);
[ui.masterInput, ui.masterConfirm].forEach(inp => {
    inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') handleUnlock();
    });
});

function enterApp() {
    showView('generator');
    closeForm();
    renderList();
    generatePassword();       // função do script.js
    resetAutoLock();
}

async function lockApp() {
    answerConfirm(false);
    Vault.lock();
    clearTimeout(autoLockTimer);

    // para qualquer animação do gerador e limpa a senha da tela
    generationId++;
    clearTimeout(typingTimeout);
    elements.passwordText.textContent = 'Clique em Gerar';

    ui.vaultList.textContent = '';
    clearForm();
    closeForm();

    isNewVault = !(await Vault.exists());
    setupLockScreen();
    showView('lock');
    ui.masterInput.focus();
}

ui.lockBtn.addEventListener('click', lockApp);

// ============================================
// BLOQUEIO AUTOMÁTICO
// ============================================
function resetAutoLock() {
    clearTimeout(autoLockTimer);
    if (ui.card.dataset.view === 'lock') return;
    autoLockTimer = setTimeout(lockApp, AUTO_LOCK_MS);
}

['mousemove', 'keydown', 'click'].forEach(evt => {
    document.addEventListener(evt, resetAutoLock);
});

// ============================================
// ÁREA DE TRANSFERÊNCIA
// ============================================
function scheduleClipboardClear() {
    clearTimeout(clipTimer);
    clipTimer = setTimeout(() => {
        navigator.clipboard.writeText('').catch(() => {});
    }, CLIPBOARD_MS);
}

async function copySecret(text) {
    try {
        await navigator.clipboard.writeText(text);
        scheduleClipboardClear();
        vaultMessage('Copiado! Será limpo da área de transferência em 20s.', true);
    } catch (err) {
        vaultMessage('Não foi possível copiar.');
    }
}

// ============================================
// COFRE: MENSAGENS, LISTA E FORMULÁRIO
// ============================================
function vaultMessage(text, ok = false) {
    ui.vaultMsg.textContent = text;
    ui.vaultMsg.classList.toggle('ok', ok);
    clearTimeout(vaultMsgTimer);
    if (text) vaultMsgTimer = setTimeout(() => { ui.vaultMsg.textContent = ''; }, 4000);
}

function makeBtn(label, title, handler) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'icon-btn';
    b.textContent = label;
    b.title = title;
    b.addEventListener('click', handler);
    return b;
}

function renderList() {
    const items = Vault.list().sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
    ui.vaultList.textContent = '';

    if (!items.length) {
        const p = document.createElement('p');
        p.className = 'empty';
        p.textContent = 'Nenhuma senha salva ainda.';
        ui.vaultList.appendChild(p);
        return;
    }

    items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'entry';

        const info = document.createElement('div');
        info.className = 'entry-info';
        const t = document.createElement('strong');
        t.textContent = item.title;
        const s = document.createElement('span');
        s.textContent = [item.site, item.user].filter(Boolean).join(' · ');
        info.append(t, s);

        const actions = document.createElement('div');
        actions.className = 'entry-actions';
        actions.append(
            makeBtn('📋', 'Copiar senha', () => copySecret(item.password)),
            makeBtn('✎', 'Editar', () => openForm(item)),
            makeBtn('🗑', 'Apagar', () => deleteEntry(item))
        );

        row.append(info, actions);
        ui.vaultList.appendChild(row);
    });
}

function clearForm() {
    editingId = null;
    ui.fTitle.value = '';
    ui.fSite.value = '';
    ui.fUser.value = '';
    ui.fPass.value = '';
    ui.fPass.type = 'password';
}

function openForm(item, presetPassword) {
    clearForm();
    if (item) {
        editingId = item.id;
        ui.fTitle.value = item.title;
        ui.fSite.value = item.site || '';
        ui.fUser.value = item.user || '';
        ui.fPass.value = item.password;
    } else if (presetPassword) {
        ui.fPass.value = presetPassword;
    }
    ui.listMode.hidden = true;
    ui.formMode.hidden = false;
    ui.fTitle.focus();
}

function closeForm() {
    clearForm();
    ui.formMode.hidden = true;
    ui.listMode.hidden = false;
}

function randomPassword(length = 20) {
    const pool = CHARS.uppercase + CHARS.lowercase + CHARS.numbers + CHARS.symbols;
    let pw = getRandomChar(CHARS.uppercase) + getRandomChar(CHARS.lowercase)
           + getRandomChar(CHARS.numbers) + getRandomChar(CHARS.symbols);
    for (let i = pw.length; i < length; i++) pw += pool[secureInt(pool.length)];
    return shuffleString(pw);
}

async function saveEntry() {
    const item = {
        title: ui.fTitle.value.trim(),
        site: ui.fSite.value.trim(),
        user: ui.fUser.value.trim(),
        password: ui.fPass.value
    };

    if (!item.title) return vaultMessage('Dê um título (ex: Instagram).');
    if (!item.password) return vaultMessage('A senha não pode ficar vazia.');

    try {
        if (editingId) await Vault.update(editingId, item);
        else await Vault.add(item);
        closeForm();
        renderList();
        vaultMessage('Salvo e criptografado.', true);
    } catch (err) {
        vaultMessage('Não foi possível salvar.');
    }
}

async function deleteEntry(item) {
    const ok = await askConfirm('Apagar "' + item.title + '"? Isso não pode ser desfeito.', 'Apagar');
    if (!ok) return;
    await Vault.remove(item.id);
    renderList();
}

ui.newBtn.addEventListener('click', () => openForm(null));
ui.fCancel.addEventListener('click', closeForm);
ui.fSave.addEventListener('click', saveEntry);
ui.fShow.addEventListener('click', () => {
    ui.fPass.type = ui.fPass.type === 'password' ? 'text' : 'password';
});
ui.fGen.addEventListener('click', () => {
    ui.fPass.value = randomPassword(20);
    ui.fPass.type = 'text';
});

// Botão "Salvar" do gerador: manda a senha gerada para o formulário do cofre
ui.saveBtn.addEventListener('click', () => {
    const pw = elements.passwordText.textContent;
    if (elements.generateBtn.disabled || !pw || pw.includes('⚠️') || pw.includes('Clique')) return;
    showView('vault');
    openForm(null, pw);
});

// ============================================
// BACKUP (arquivo já criptografado)
// ============================================
ui.exportBtn.addEventListener('click', async () => {
    const text = await Vault.exportRaw();
    if (!text) return vaultMessage('Nada para exportar.');
    const blob = new Blob([text], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cofre-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

ui.importBtn.addEventListener('click', () => ui.importFile.click());

ui.importFile.addEventListener('change', async () => {
    const file = ui.importFile.files[0];
    ui.importFile.value = '';
    if (!file) return;

    const ok = await askConfirm('Isso SUBSTITUI o cofre atual pelo backup. Depois você abre com a senha mestra do backup. Continuar?', 'Substituir');
    if (!ok) return;

    try {
        await Vault.importRaw(await file.text());
        await lockApp();
    } catch (err) {
        vaultMessage('Arquivo de backup inválido.');
    }
});

// ============================================
// CONFIRMAÇÃO PRÓPRIA (substitui o confirm() do Windows)
// ============================================
let confirmResolver = null;

function askConfirm(message, yesLabel = 'Sim') {
    return new Promise(resolve => {
        confirmResolver = resolve;
        document.getElementById('confirmText').textContent = message;
        document.getElementById('confirmYes').textContent = yesLabel;
        document.getElementById('confirmOverlay').hidden = false;
        document.getElementById('confirmNo').focus();
    });
}

function answerConfirm(value) {
    document.getElementById('confirmOverlay').hidden = true;
    if (confirmResolver) {
        confirmResolver(value);
        confirmResolver = null;
    }
}

document.getElementById('confirmYes').addEventListener('click', () => answerConfirm(true));
document.getElementById('confirmNo').addEventListener('click', () => answerConfirm(false));

document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !document.getElementById('confirmOverlay').hidden) {
        answerConfirm(false);
    }
});

// ============================================
// INICIALIZAÇÃO
// ============================================
(async function init() {
    isNewVault = !(await Vault.exists());
    setupLockScreen();
    showView('lock');
    ui.masterInput.focus();
})();