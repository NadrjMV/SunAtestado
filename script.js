document.addEventListener('DOMContentLoaded', () => {
    // --- COLE AQUI A CONFIGURAÇÃO DO SEU FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyBCQRLCLMPAupDP7vdUJ_pX_hUJeCAKUFc",
  authDomain: "sunatestado.firebaseapp.com",
  projectId: "sunatestado",
  storageBucket: "sunatestado.firebasestorage.app",
  messagingSenderId: "20789030796",
  appId: "1:20789030796:web:c432a88fcd590be60870a9",
  measurementId: "G-VKHEMFMVTG"
};

    // --- INICIALIZAÇÃO DO FIREBASE E SERVIÇOS ---
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // --- CHAVES DE API DE SERVIÇOS EXTERNOS ---
    const IMGBB_API_KEY = "4b8aff2ad8f33855b83acaa37cd3a274";
    const EMAILJS_PUBLIC_KEY = "PTWkWiWOl0jsBOyp9";
    const EMAILJS_SERVICE_ID = "service_aqui6j7";
    const EMAILJS_TEMPLATE_ID = "template_xxx3jc5";
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

    // --- ELEMENTOS GLOBAIS DO DOM ---
    const views = { login: document.getElementById('login-view'), register: document.getElementById('register-view'), app: document.getElementById('app-view'), admin: document.getElementById('admin-view') };
    let currentUserData = null; // Armazena os dados do usuário logado (do Firestore)

    // --- FUNÇÃO DE NAVEGAÇÃO (CORREÇÃO) ---
    function navigateTo(viewName) {
        Object.values(views).forEach(view => view.style.display = 'none');
        if (views[viewName]) {
            views[viewName].style.display = 'block';
        }
    }

    // --- LÓGICA DE TEMA ---
    const themeToggles = [document.getElementById('theme-toggle'), document.getElementById('admin-theme-toggle')];
    const applyTheme = (theme) => { document.documentElement.classList.toggle('dark-mode', theme === 'dark'); themeToggles.forEach(t => { if(t) t.checked = theme === 'dark' }); };
    const handleThemeChange = () => { const newTheme = document.documentElement.classList.contains('dark-mode') ? 'light' : 'dark'; localStorage.setItem('theme', newTheme); applyTheme(newTheme); };
    themeToggles.forEach(toggle => { if(toggle) toggle.addEventListener('change', handleThemeChange) });
    applyTheme(localStorage.getItem('theme') || 'light');

    // --- OBSERVADOR DE ESTADO DE AUTENTICAÇÃO ---
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                currentUserData = { uid: user.uid, ...userDoc.data() };
                initializeApp();
            } else {
                auth.signOut();
            }
        } else {
            currentUserData = null;
            navigateTo('login');
        }
    });

    // --- FUNÇÕES DE AUTENTICAÇÃO COM FIREBASE ---
    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        auth.signInWithEmailAndPassword(email, password)
            .catch(error => {
                console.error("Erro de login:", error);
                alert("Email ou senha inválidos.");
            });
    });

    const registerForm = document.getElementById('register-form');
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const password = document.getElementById('register-password').value;
        if (password !== document.getElementById('register-confirm-password').value) {
            alert('As senhas não coincidem!');
            return;
        }
        const email = document.getElementById('register-email').value;
        const fullName = document.getElementById('register-fullname').value;
        const re = document.getElementById('register-re').value;
        const phone = document.getElementById('register-phone').value;

        auth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                return db.collection('users').doc(userCredential.user.uid).set({
                    fullName,
                    email,
                    re,
                    phone,
                    role: 'vigilante'
                });
            })
            .then(() => {
                alert('Cadastro realizado com sucesso! Faça o login para continuar.');
                registerForm.reset();
                navigateTo('login');
            })
            .catch(error => {
                console.error("Erro de cadastro:", error);
                if (error.code === 'auth/email-already-in-use') {
                    alert('Este email já está cadastrado.');
                } else {
                    alert('Ocorreu um erro ao cadastrar. Verifique os dados e tente novamente.');
                }
            });
    });

    [document.getElementById('logout-button'), document.getElementById('admin-logout-button')].forEach(btn => { if(btn) btn.addEventListener('click', () => auth.signOut()) });
    document.getElementById('show-register').addEventListener('click', (e) => { e.preventDefault(); navigateTo('register'); });
    document.getElementById('show-login').addEventListener('click', (e) => { e.preventDefault(); navigateTo('login'); });
    document.querySelector('.forgot-password-link').addEventListener('click', (e) => {
        e.preventDefault();
        const email = prompt("Por favor, insira seu email para redefinir a senha:");
        if (email) {
            auth.sendPasswordResetEmail(email)
                .then(() => alert("Email de redefinição de senha enviado!"))
                .catch(error => alert("Erro ao enviar email: " + error.message));
        }
    });
    
    // --- LÓGICA DA APLICAÇÃO PRINCIPAL ---
    function initializeApp() {
        if (!currentUserData) return;
        document.getElementById('admin-panel-button').style.display = currentUserData.role === 'admin' ? 'inline-block' : 'none';
        document.getElementById('welcome-message').textContent = `Olá, ${currentUserData.fullName.split(' ')[0]}!`;
        document.getElementById('registrationId').value = currentUserData.re;
        document.getElementById('email').value = currentUserData.email;
        document.getElementById('phone').value = currentUserData.phone;
        navigateTo('app');
        setupSignaturePad();
    }

    // --- LÓGICA DO PAINEL ADMIN ---
    document.getElementById('admin-panel-button').addEventListener('click', () => renderAdminPanel());
    document.getElementById('user-view-button').addEventListener('click', () => navigateTo('app'));

    async function renderAdminPanel() {
        navigateTo('admin');
        const userListDiv = document.getElementById('user-list');
        userListDiv.innerHTML = 'Carregando vigilantes...';
        try {
            const snapshot = await db.collection('users').where('role', '==', 'vigilante').get();
            userListDiv.innerHTML = '';
            if (snapshot.empty) {
                userListDiv.innerHTML = '<p>Nenhum vigilante cadastrado.</p>';
                return;
            }
            snapshot.forEach(doc => {
                const user = { id: doc.id, ...doc.data() };
                const userItem = document.createElement('div');
                userItem.className = 'user-list-item';
                userItem.innerHTML = `<div class="user-info"><p class="user-name">${user.fullName}</p><p class="user-email">${user.email}</p></div><div class="list-item-arrow">›</div>`;
                userItem.addEventListener('click', () => openSubmissionsModal(user));
                userListDiv.appendChild(userItem);
            });
        } catch (error) {
            console.error("Erro ao buscar vigilantes:", error);
            userListDiv.innerHTML = '<p>Ocorreu um erro ao carregar os dados.</p>';
        }
    }

    // --- LÓGICA DOS MODAIS ---
    const submissionsModal = document.getElementById('submissions-modal');
    const detailsModal = document.getElementById('details-modal');

    async function openSubmissionsModal(user) {
        document.getElementById('submissions-modal-title').textContent = `Atestados de ${user.fullName}`;
        const submissionsListDiv = document.getElementById('submissions-list');
        submissionsListDiv.innerHTML = 'Carregando atestados...';
        submissionsModal.classList.add('active');
        try {
            const snapshot = await db.collection('submissions').where('userId', '==', user.id).orderBy('timestamp', 'desc').get();
            submissionsListDiv.innerHTML = '';
            if (snapshot.empty) {
                submissionsListDiv.innerHTML = '<p>Nenhum atestado enviado por este usuário.</p>';
                return;
            }
            snapshot.forEach(doc => {
                const submission = { id: doc.id, ...doc.data() };
                const item = document.createElement('div');
                item.className = 'submission-list-item';
                item.innerHTML = `<div class="submission-info"><p class="submission-id">REQ#${submission.req_id}</p><p class="submission-date">Data de Início: ${submission.data_inicio}</p></div><div class="list-item-arrow">›</div>`;
                item.addEventListener('click', () => openDetailsModal(submission, user));
                submissionsListDiv.appendChild(item);
            });
        } catch (error) {
            console.error("Erro ao buscar atestados:", error);
            submissionsListDiv.innerHTML = '<p>Ocorreu um erro ao carregar os atestados.</p>';
        }
    }

    function openDetailsModal(submission, user) {
        document.getElementById('details-modal-title').textContent = `Detalhes da Solicitação REQ#${submission.req_id}`;
        document.getElementById('details-content').innerHTML = `
            <h3>Detalhes do Colaborador</h3><p>Nome:<strong>${user.fullName}</strong></p><p>RE:<strong>${user.re}</strong></p>
            <h3>Detalhes do Afastamento</h3><p>Data de Início:<strong>${submission.data_inicio}</strong></p><p>Dias Afastado:<strong>${submission.dias_afastado}</strong></p><p>Filial:<strong>${submission.filial}</strong></p><p>CRM Médico:<strong>${submission.crm_medico}</strong></p><p>Observações:<strong>${submission.observacoes}</strong></p>
            <h3>Atestado Médico</h3><img src="${submission.medical_certificate_image}" alt="Atestado Médico">
            <h3>Assinatura</h3><img src="${submission.signature_image}" alt="Assinatura">`;
        detailsModal.classList.add('active');
    }

    document.querySelectorAll('.modal-close-button').forEach(btn => btn.addEventListener('click', () => btn.closest('.modal-overlay').classList.remove('active')));

    // --- LÓGICA DE UPLOAD E SUBMISSÃO ---
    const leaveRequestForm = document.getElementById('leave-request-form');
    let medicalCertificateDataUrl = '';
    
    function compressImage(file, callback) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                const maxWidth = 800, maxHeight = 800;
                if (width > height) { if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; } } else { if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; } }
                canvas.width = width; canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                callback(canvas.toDataURL('image/jpeg', 0.7));
            };
        };
    }
    document.getElementById('medicalProof').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            document.querySelector('.file-name').textContent = file.name;
            compressImage(file, (compressedDataUrl) => {
                document.getElementById('image-preview').innerHTML = `<img src="${compressedDataUrl}" alt="Prévia">`;
                medicalCertificateDataUrl = compressedDataUrl;
            });
        }
    });

    let signaturePad, ctx, hasSigned = false;
    function setupSignaturePad() {
        signaturePad = document.getElementById('signature-pad');
        if (!signaturePad) return;
        ctx = signaturePad.getContext('2d');
        const resizeCanvas = () => { const ratio = Math.max(window.devicePixelRatio || 1, 1); signaturePad.width = signaturePad.offsetWidth * ratio; signaturePad.height = signaturePad.offsetHeight * ratio; ctx.scale(ratio, ratio); };
        window.addEventListener('resize', resizeCanvas); resizeCanvas();
        ctx.strokeStyle = '#000000'; ctx.lineWidth = 2;
        let isDrawing = false;
        const getPos = (e) => { const rect = signaturePad.getBoundingClientRect(); const evt = e.touches ? e.touches[0] : e; return { x: evt.clientX - rect.left, y: evt.clientY - rect.top }; };
        const startDrawing = (e) => { isDrawing = true; hasSigned = true; const pos = getPos(e); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); };
        const draw = (e) => { if (!isDrawing) return; e.preventDefault(); const pos = getPos(e); ctx.lineTo(pos.x, pos.y); ctx.stroke(); };
        const stopDrawing = () => { isDrawing = false; ctx.beginPath(); };
        ['mousedown', 'touchstart'].forEach(event => signaturePad.addEventListener(event, startDrawing));
        ['mousemove', 'touchmove'].forEach(event => signaturePad.addEventListener(event, draw));
        ['mouseup', 'mouseout', 'touchend'].forEach(event => signaturePad.addEventListener(event, stopDrawing));
        document.getElementById('clear-signature-button').addEventListener('click', () => { ctx.clearRect(0, 0, signaturePad.width, signaturePad.height); hasSigned = false; });
    }

    async function uploadImageToHost(base64Image) {
        if (!base64Image) return null;
        const apiUrl = `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`;
        const formData = new FormData();
        formData.append('image', base64Image.split(',')[1]);
        try {
            const response = await fetch(apiUrl, { method: 'POST', body: formData });
            const result = await response.json();
            return result.success ? result.data.url : null;
        } catch (error) { return null; }
    }
    
    leaveRequestForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        let isFormValid = true; // Validação simplificada, ajuste se necessário
        if (!hasSigned) { isFormValid = false; document.getElementById('signature-error').style.display = 'block'; } else { document.getElementById('signature-error').style.display = 'none'; }
        
        if (isFormValid) {
            const submitButton = document.getElementById('submit-button');
            submitButton.classList.add('loading');
            submitButton.disabled = true;

            try {
                const signatureImageUrl = await uploadImageToHost(signaturePad.toDataURL('image/jpeg', 0.95));
                const certificateImageUrl = await uploadImageToHost(medicalCertificateDataUrl);
                if (!signatureImageUrl || !certificateImageUrl) throw new Error("Falha no upload de imagens.");
                
                const reqId = Math.floor(100000 + Math.random() * 900000);
                
                const submissionData = {
                    userId: currentUserData.uid,
                    req_id: reqId,
                    data_inicio: document.getElementById('startDate').value,
                    dias_afastado: document.getElementById('daysOff').value,
                    filial: document.getElementById('branch').value,
                    crm_medico: document.getElementById('crm').value,
                    observacoes: document.getElementById('observations').value || "Nenhuma.",
                    medical_certificate_image: certificateImageUrl,
                    signature_image: signatureImageUrl,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                };

                await db.collection('submissions').add(submissionData);
                const templateParams = { ...submissionData, ...currentUserData };
                await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
                
                showSuccessModal(reqId);
                resetForm();

            } catch (error) {
                console.error('FALHA NO PROCESSO DE ENVIO...', error);
                alert('Ocorreu um erro ao enviar a solicitação.');
            } finally {
                submitButton.classList.remove('loading');
                submitButton.disabled = false;
            }
        }
    });

    // --- Funções Auxiliares Finais ---
    function showSuccessModal(reqId) { document.getElementById('req-id').textContent = reqId; document.getElementById('success-modal').classList.add('active'); }
    function resetForm() {
        leaveRequestForm.reset();
        document.querySelector('.file-name').textContent = 'Nenhum arquivo selecionado';
        document.getElementById('image-preview').innerHTML = '';
        medicalCertificateDataUrl = '';
        if (ctx) ctx.clearRect(0, 0, signaturePad.width, signaturePad.height);
        hasSigned = false;
        initializeApp();
    }
    [document.getElementById('current-year'), document.getElementById('current-year-admin')].forEach(el => { if(el) el.textContent = new Date().getFullYear(); });
});
