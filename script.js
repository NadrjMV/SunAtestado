document.addEventListener('DOMContentLoaded', () => {
    // --- CHAVES DE API ---
    const IMGBB_API_KEY = "4b8aff2ad8f33855b83acaa37cd3a274";
    const EMAILJS_PUBLIC_KEY = "PTWkWiWOl0jsBOyp9";
    const EMAILJS_SERVICE_ID = "service_aqui6j7";
    const EMAILJS_TEMPLATE_ID = "template_xxx3jc5";

    // --- ELEMENTOS GLOBAIS ---
    const themeToggle = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    const views = {
        login: document.getElementById('login-view'),
        register: document.getElementById('register-view'),
        app: document.getElementById('app-view')
    };

    // --- INICIALIZAÇÃO DO EMAILJS ---
    (function() { emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY }); })();

    // --- FUNÇÃO DE NAVEGAÇÃO ---
    function navigateTo(viewName) { Object.values(views).forEach(view => view.style.display = 'none'); views[viewName].style.display = 'block'; }

    // --- LÓGICA DO TEMA ---
    const savedTheme = localStorage.getItem('theme') || 'light';
    htmlElement.classList.toggle('dark-mode', savedTheme === 'dark');
    themeToggle.checked = savedTheme === 'dark';
    themeToggle.addEventListener('change', () => { const newTheme = themeToggle.checked ? 'dark' : 'light'; localStorage.setItem('theme', newTheme); htmlElement.classList.toggle('dark-mode', newTheme === 'dark'); });

    // --- SIMULAÇÃO DE BANCO DE DADOS E SESSÃO ---
    const db = { getUsers: () => JSON.parse(localStorage.getItem('users')) || [], saveUsers: (users) => localStorage.setItem('users', JSON.stringify(users)), getCurrentUser: () => JSON.parse(localStorage.getItem('currentUser')), setCurrentUser: (user) => localStorage.setItem('currentUser', JSON.stringify(user)), logoutUser: () => localStorage.removeItem('currentUser') };

    // --- LÓGICA DE AUTENTICAÇÃO ---
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    loginForm.addEventListener('submit', (e) => { e.preventDefault(); const email = document.getElementById('login-email').value; const password = document.getElementById('login-password').value; const user = db.getUsers().find(u => u.email === email && u.password === password); if (user) { db.setCurrentUser(user); initializeApp(); } else { alert('Email ou senha inválidos.'); } });
    registerForm.addEventListener('submit', (e) => { e.preventDefault(); const password = document.getElementById('register-password').value; if (password !== document.getElementById('register-confirm-password').value) { alert('As senhas não coincidem!'); return; } const newUser = { fullName: document.getElementById('register-fullname').value, email: document.getElementById('register-email').value, re: document.getElementById('register-re').value, phone: document.getElementById('register-phone').value, password: password }; let users = db.getUsers(); if (users.some(u => u.email === newUser.email)) { alert('Este email já está cadastrado.'); return; } users.push(newUser); db.saveUsers(users); alert('Cadastro realizado com sucesso! Faça o login para continuar.'); registerForm.reset(); navigateTo('login'); });
    document.getElementById('logout-button').addEventListener('click', () => { db.logoutUser(); navigateTo('login'); });
    document.getElementById('show-register').addEventListener('click', (e) => { e.preventDefault(); navigateTo('register'); });
    document.getElementById('show-login').addEventListener('click', (e) => { e.preventDefault(); navigateTo('login'); });
    document.querySelector('.forgot-password-link').addEventListener('click', (e) => { e.preventDefault(); alert('Um link para recuperação de senha foi enviado para o seu email (simulação).'); });

    // --- LÓGICA DA APLICAÇÃO PRINCIPAL ---
    const leaveRequestForm = document.getElementById('leave-request-form');
    const inputs = document.querySelectorAll('#leave-request-form input, #leave-request-form select, #leave-request-form textarea');
    const fileInput = document.getElementById('medicalProof');
    let medicalCertificateDataUrl = '';

    function initializeApp() {
        const user = db.getCurrentUser();
        if (user) {
            document.getElementById('welcome-message').textContent = `Olá, ${user.fullName.split(' ')[0]}!`;
            document.getElementById('registrationId').value = user.re;
            document.getElementById('email').value = user.email;
            document.getElementById('phone').value = user.phone;
            navigateTo('app');
            setupSignaturePad();
        } else {
            navigateTo('login');
        }
    }
    
    function validateField(field) { if (field.readOnly) return true; const group = field.closest('.form-group'); group.classList.remove('error', 'success'); let isValid = field.checkValidity(); if (isValid) { if (field.value.trim()) group.classList.add('success'); } else { group.classList.add('error'); group.querySelector('.error-message').textContent = field.validationMessage; } return isValid; }
    inputs.forEach(input => input.addEventListener('input', () => validateField(input)));

    function compressImage(file, maxWidth, maxHeight, quality, callback) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width; let height = img.height;
                if (width > height) { if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; } } else { if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; } }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                callback(dataUrl);
            };
        };
        reader.onerror = (error) => { console.error('Erro ao ler o arquivo:', error); alert('Não foi possível carregar a imagem.'); };
    }

    document.querySelector('.file-upload-button').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
        const fileNameSpan = document.querySelector('.file-name');
        const imagePreview = document.getElementById('image-preview');
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            fileNameSpan.textContent = file.name;
            validateField(fileInput);
            if (file.type.startsWith('image/')) {
                compressImage(file, 800, 800, 0.7, (compressedDataUrl) => {
                    imagePreview.innerHTML = `<img src="${compressedDataUrl}" alt="Prévia do atestado">`;
                    medicalCertificateDataUrl = compressedDataUrl;
                });
            } else {
                imagePreview.innerHTML = ''; medicalCertificateDataUrl = '';
                alert('Por favor, anexe um arquivo de imagem (JPG ou PNG).');
            }
        } else {
            fileNameSpan.textContent = 'Nenhum arquivo selecionado';
        }
    });

    // --- LÓGICA DO CAMPO DE ASSINATURA ---
    let signaturePad, ctx, isDrawing = false, hasSigned = false;
    function setupSignaturePad() {
        signaturePad = document.getElementById('signature-pad');
        if (!signaturePad) return;
        ctx = signaturePad.getContext('2d');
        const resizeCanvas = () => { const ratio = Math.max(window.devicePixelRatio || 1, 1); signaturePad.width = signaturePad.offsetWidth * ratio; signaturePad.height = signaturePad.offsetHeight * ratio; ctx.scale(ratio, ratio); };
        window.addEventListener('resize', resizeCanvas); resizeCanvas();
        ctx.strokeStyle = '#000000'; ctx.lineWidth = 2;
        const getPos = (e) => { const rect = signaturePad.getBoundingClientRect(); const evt = e.touches ? e.touches[0] : e; return { x: evt.clientX - rect.left, y: evt.clientY - rect.top }; };
        const startDrawing = (e) => { isDrawing = true; hasSigned = true; const pos = getPos(e); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); };
        const draw = (e) => { if (!isDrawing) return; e.preventDefault(); const pos = getPos(e); ctx.lineTo(pos.x, pos.y); ctx.stroke(); };
        const stopDrawing = () => { isDrawing = false; ctx.beginPath(); };
        signaturePad.addEventListener('mousedown', startDrawing); signaturePad.addEventListener('mousemove', draw); signaturePad.addEventListener('mouseup', stopDrawing); signaturePad.addEventListener('mouseout', stopDrawing);
        signaturePad.addEventListener('touchstart', startDrawing); signaturePad.addEventListener('touchmove', draw); signaturePad.addEventListener('touchend', stopDrawing);
        document.getElementById('clear-signature-button').addEventListener('click', () => { ctx.clearRect(0, 0, signaturePad.width, signaturePad.height); hasSigned = false; });
    }

    // --- NOVA FUNÇÃO PARA UPLOAD DE IMAGEM PARA O IMGBB ---
    async function uploadImageToHost(base64Image) {
        if (!base64Image) return null;
        const apiUrl = `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`;
        const pureBase64 = base64Image.split(',')[1];
        const formData = new FormData();
        formData.append('image', pureBase64);
        try {
            const response = await fetch(apiUrl, { method: 'POST', body: formData });
            const result = await response.json();
            if (result.success) {
                return result.data.url;
            } else {
                console.error('Falha no upload para o ImgBB:', result);
                return null;
            }
        } catch (error) {
            console.error('Erro de rede ao fazer upload:', error);
            return null;
        }
    }
    
    // --- Submissão do formulário com UPLOAD e ENVIO DE EMAIL ---
    leaveRequestForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        let isFormValid = true;
        inputs.forEach(input => { if (!validateField(input)) isFormValid = false; });
        const signatureError = document.getElementById('signature-error');
        if (!hasSigned) { isFormValid = false; signatureError.style.display = 'block'; signaturePad.closest('.form-group').classList.add('error'); } else { signatureError.style.display = 'none'; signaturePad.closest('.form-group').classList.remove('error'); }
        
        if (isFormValid) {
            const submitButton = document.getElementById('submit-button');
            submitButton.classList.add('loading');
            submitButton.disabled = true;

            try {
                const signatureImageBase64 = signaturePad.toDataURL('image/jpeg', 0.95);
                const signatureImageUrl = await uploadImageToHost(signatureImageBase64);
                const certificateImageUrl = await uploadImageToHost(medicalCertificateDataUrl);

                if (!signatureImageUrl || !certificateImageUrl) {
                    throw new Error("Falha ao fazer upload de uma ou mais imagens.");
                }
                
                // Gera o ID da Requisição
                const reqId = Math.floor(100000 + Math.random() * 900000);

                const user = db.getCurrentUser();
                const templateParams = {
                    req_id: reqId, // Adiciona o ID aqui
                    nome_completo: user.fullName,
                    re_matricula: user.re,
                    email_contato: user.email,
                    telefone: user.phone,
                    data_inicio: document.getElementById('startDate').value,
                    dias_afastado: document.getElementById('daysOff').value,
                    filial: document.getElementById('branch').value,
                    crm_medico: document.getElementById('crm').value,
                    observacoes: document.getElementById('observations').value || "Nenhuma observação.",
                    ano_atual: new Date().getFullYear(),
                    medical_certificate_image: certificateImageUrl,
                    signature_image: signatureImageUrl,
                };

                await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
                
                console.log('EMAIL ENVIADO COM SUCESSO!');
                showSuccessModal(reqId); // Passa o ID para o modal
                resetForm();

            } catch (error) {
                console.error('FALHA NO PROCESSO DE ENVIO...', error);
                alert('Ocorreu um erro ao enviar a solicitação. Verifique sua conexão e tente novamente.');
            } finally {
                submitButton.classList.remove('loading');
                submitButton.disabled = false;
            }
        }
    });

    // --- Funções Auxiliares ---
    const successModal = document.getElementById('success-modal');
    function showSuccessModal(reqId) { // Recebe o ID
        document.getElementById('req-id').textContent = reqId; // Usa o ID recebido
        successModal.classList.add('active');
    }
    document.getElementById('close-modal').addEventListener('click', () => successModal.classList.remove('active'));
    function resetForm() {
        leaveRequestForm.reset();
        document.querySelectorAll('.form-group').forEach(g => g.classList.remove('success', 'error'));
        document.querySelector('.file-name').textContent = 'Nenhum arquivo selecionado';
        document.getElementById('image-preview').innerHTML = '';
        medicalCertificateDataUrl = '';
        if (ctx) ctx.clearRect(0, 0, signaturePad.width, signaturePad.height);
        hasSigned = false;
        initializeApp();
    }
    document.getElementById('current-year').textContent = new Date().getFullYear();
    initializeApp();
});
