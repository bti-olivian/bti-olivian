// olivian-frontend/shared/header.js

document.addEventListener('DOMContentLoaded', () => {
    // CORREÇÃO CRÍTICA: Usar a chave 'access' unificada
    const accessToken = localStorage.getItem('access'); 
    
    // Fallback: Se o token for null ou undefined, use a chave antiga como backup
    // (Melhor garantir que a tela de login salve na chave 'access' daqui para frente)
    if (!accessToken) {
        const fallbackToken = localStorage.getItem('accessToken');
        if (!fallbackToken) {
            console.error('Utilizador não autenticado. Token "access" ou "accessToken" ausente.');
            
            // Redireciona para o login se não houver token.
            // O uso de window.location.origin garante o caminho absoluto.
            if (!window.location.pathname.includes('/login/')) {
                window.location.href = window.location.origin + '/olivian-frontend/login/login.html';
            }
            return;
        }
        // Se o fallback funcionar, continua com ele
        return loadHeaderAndProfile(fallbackToken);
    }
    
    // Se o token principal ('access') for encontrado, continua
    loadHeaderAndProfile(accessToken);
});

// Nova função para modularizar o carregamento do cabeçalho
function loadHeaderAndProfile(token) {
    // 1. Encontra o container do cabeçalho na página atual
    const headerContainer = document.getElementById('header-container');
    if (!headerContainer) {
        // console.error('Elemento #header-container não encontrado na página.');
        return;
    }

    // 2. Carrega o HTML do cabeçalho
    fetch('../shared/header.html')
        .then(response => response.text())
        .then(html => {
            headerContainer.innerHTML = html;

            // 3. Após o HTML ser inserido, busca os dados do perfil
            fetchUserProfile(token);
        });
}


function fetchUserProfile(token) {
    fetch('http://127.0.0.1:8000/api/user/profile/', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        // Lógica de tratamento de erro para token expirado
        if (response.status === 401 || response.status === 403) {
            console.error('Token expirado ou inválido. Redirecionando para login.');
            window.location.href = window.location.origin + '/olivian-frontend/login/login.html';
            return; // Interrompe o fluxo
        }
        if (!response.ok) throw new Error('Falha ao buscar perfil do usuário.');
        return response.json();
    })
    .then(profileData => {
        // 4. Preenche os dados no cabeçalho
        document.querySelector('.client-profile').style.opacity = 1;
        document.querySelector('.user-profile').style.opacity = 1;
        
        // --- Preenchimento do Cliente ---
        document.getElementById('client-name').textContent = profileData.cliente.empresa;
        // Assume que 'formatarCNPJ' é uma função global (definida em utils.js)
        document.getElementById('client-cnpj').textContent = typeof formatarCNPJ === 'function' 
            ? formatarCNPJ(profileData.cliente.cnpj) 
            : profileData.cliente.cnpj; 

        // --- Preenchimento do Usuário Logado (Saudação) ---
        const nomeParaSaudacao = profileData.nome_completo && profileData.nome_completo.trim() 
            ? profileData.nome_completo 
            : profileData.email; 

        document.getElementById('user-name').textContent = `Olá, ${nomeParaSaudacao}`;
        document.getElementById('user-email').textContent = profileData.email;
        
        const dataAtual = new Date();
        document.getElementById('user-date').textContent = `${dataAtual.toLocaleDateString('pt-BR')} - ${dataAtual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    })
    .catch(error => console.error('Erro ao carregar dados do cabeçalho:', error));
}