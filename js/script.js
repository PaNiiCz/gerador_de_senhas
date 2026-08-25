/**
 * Luminous Password Generator
 * Script principal com todas as funcionalidades
 */

// ============================================
// CONFIGURAÇÕES
// ============================================
const CHARS = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

const MIN_LENGTH = 8;
const MAX_LENGTH = 32;

// ============================================
// DOM ELEMENTS
// ============================================
const elements = {
    passwordText: document.getElementById('passwordText'),
    lengthSlider: document.getElementById('lengthSlider'),
    lengthLabel: document.getElementById('lengthLabel'),
    generateBtn: document.getElementById('generateBtn'),
    copyBtn: document.getElementById('copyBtn'),
    strengthFill: document.getElementById('strengthFill'),
    strengthLabel: document.getElementById('strengthLabel')
};

// ============================================
// CONTROLE DE ANIMAÇÃO
// ============================================
let typingTimeout = null;
let generationId = 0;

// ============================================
// FUNÇÕES AUXILIARES
// ============================================
function getRandomChar(str) {
    return str[Math.floor(Math.random() * str.length)];
}

function shuffleString(str) {
    const arr = str.split('');
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join('');
}

// ============================================
// VALIDAR TAMANHO DO SLIDER
// ============================================
function validateSliderValue() {
    let value = parseInt(elements.lengthSlider.value);
    
    if (isNaN(value) || value < MIN_LENGTH) {
        value = MIN_LENGTH;
    } else if (value > MAX_LENGTH) {
        value = MAX_LENGTH;
    }
    
    elements.lengthSlider.value = value;
    elements.lengthLabel.textContent = value;
    
    return value;
}

// ============================================
// GERAR SENHA
// ============================================
function generatePassword() {
    // Cancela animação anterior
    if (typingTimeout) {
        clearTimeout(typingTimeout);
        typingTimeout = null;
    }
    
    generationId++;
    const currentGeneration = generationId;
    
    const length = validateSliderValue();
    
    const useUpper = document.getElementById('uppercase').checked;
    const useLower = document.getElementById('lowercase').checked;
    const useNumbers = document.getElementById('numbers').checked;
    const useSymbols = document.getElementById('symbols').checked;
    
    if (!useUpper && !useLower && !useNumbers && !useSymbols) {
        elements.passwordText.textContent = '⚠️ Selecione ao menos uma opção';
        elements.strengthFill.className = 'strength-fill';
        elements.strengthLabel.textContent = '—';
        return;
    }
    
    let pool = '';
    if (useUpper) pool += CHARS.uppercase;
    if (useLower) pool += CHARS.lowercase;
    if (useNumbers) pool += CHARS.numbers;
    if (useSymbols) pool += CHARS.symbols;
    
    let password = '';
    if (useUpper) password += getRandomChar(CHARS.uppercase);
    if (useLower) password += getRandomChar(CHARS.lowercase);
    if (useNumbers) password += getRandomChar(CHARS.numbers);
    if (useSymbols) password += getRandomChar(CHARS.symbols);
    
    for (let i = password.length; i < length; i++) {
        password += pool[Math.floor(Math.random() * pool.length)];
    }
    
    password = shuffleString(password);
    
    typePassword(password, currentGeneration);
}

// ============================================
// EFEITO DE DIGITAÇÃO
// ============================================
function typePassword(password, generationIdRef) {
    elements.passwordText.textContent = '';
    elements.passwordText.style.opacity = '1';
    elements.passwordText.classList.remove('typing');
    
    elements.generateBtn.disabled = true;
    elements.generateBtn.style.opacity = '0.6';
    elements.generateBtn.textContent = '⏳ Gerando...';
    
    let index = 0;
    const speed = Math.max(15, 70 - password.length);
    
    function typeChar() {
        if (generationIdRef !== generationId) {
            return;
        }
        
        if (index < password.length) {
            elements.passwordText.textContent += password[index];
            index++;
            
            elements.passwordText.style.borderRight = '2px solid rgba(255,255,255,0.3)';
            elements.passwordText.classList.add('typing');
            
            typingTimeout = setTimeout(typeChar, speed);
        } else {
            elements.passwordText.style.borderRight = 'none';
            elements.passwordText.classList.remove('typing');
            
            if (generationIdRef === generationId) {
                updateStrength(password);
                
                elements.generateBtn.disabled = false;
                elements.generateBtn.style.opacity = '1';
                elements.generateBtn.textContent = '✦ Gerar';
                
                elements.passwordText.style.transition = 'text-shadow 0.3s';
                elements.passwordText.style.textShadow = '0 0 20px rgba(255,255,255,0.2)';
                setTimeout(() => {
                    elements.passwordText.style.textShadow = '0 0 10px rgba(255,255,255,0.05)';
                }, 300);
            }
        }
    }
    
    typeChar();
}

// ============================================
// INDICADOR DE FORÇA
// ============================================
function updateStrength(password) {
    let score = 0;
    
    if (password.length >= 16) score += 2;
    else if (password.length >= 12) score += 1;
    
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 2;
    
    let level, label;
    if (score >= 6) {
        level = 'strong';
        label = 'Forte';
    } else if (score >= 4) {
        level = 'medium';
        label = 'Média';
    } else {
        level = 'weak';
        label = 'Fraca';
    }
    
    elements.strengthFill.className = 'strength-fill ' + level;
    elements.strengthLabel.textContent = label;
}

// ============================================
// COPIAR SENHA
// ============================================
async function copyPassword() {
    const text = elements.passwordText.textContent;
    
    if (!text || text.includes('Clique') || text.includes('⚠️') || text === '') {
        return;
    }
    
    try {
        await navigator.clipboard.writeText(text);
        elements.copyBtn.textContent = '✓ Copiado!';
        elements.copyBtn.style.borderColor = 'rgba(68, 255, 136, 0.3)';
        setTimeout(() => {
            elements.copyBtn.textContent = '📋 Copiar';
            elements.copyBtn.style.borderColor = 'rgba(255, 255, 255, 0.08)';
        }, 2000);
    } catch (err) {
        alert('Não foi possível copiar. Tente manualmente.');
    }
}

// ============================================
// DEBOUNCE DO SLIDER
// ============================================
let sliderTimeout = null;

function handleSliderChange() {
    let value = parseInt(elements.lengthSlider.value);
    
    if (value < MIN_LENGTH) {
        elements.lengthSlider.value = MIN_LENGTH;
        value = MIN_LENGTH;
    } else if (value > MAX_LENGTH) {
        elements.lengthSlider.value = MAX_LENGTH;
        value = MAX_LENGTH;
    }
    
    elements.lengthLabel.textContent = value;
    
    if (sliderTimeout) {
        clearTimeout(sliderTimeout);
    }
    
    elements.passwordText.style.opacity = '0.5';
    
    sliderTimeout = setTimeout(() => {
        generatePassword();
        sliderTimeout = null;
    }, 200);
}

// ============================================
// EVENTOS
// ============================================
elements.generateBtn.addEventListener('click', generatePassword);
elements.copyBtn.addEventListener('click', copyPassword);
elements.lengthSlider.addEventListener('input', handleSliderChange);

document.querySelectorAll('.options input').forEach(checkbox => {
    checkbox.addEventListener('change', generatePassword);
});

// ============================================
// SHORTCUTS
// ============================================
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        if (!elements.generateBtn.disabled) {
            elements.generateBtn.click();
        }
    }
});

// ============================================
// INICIALIZAÇÃO
// ============================================
elements.lengthSlider.value = 16;
elements.lengthLabel.textContent = '16';

setTimeout(() => {
    generatePassword();
}, 300);

console.log('🔐 Luminous Password Generator carregado!');
console.log(`📏 Limites: ${MIN_LENGTH} - ${MAX_LENGTH} caracteres`);