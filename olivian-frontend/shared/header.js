// olivian-frontend/shared/header.js

document.addEventListener('DOMContentLoaded', () => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
        console.error('Utilizador não autenticado.');
        // Redireciona para o login se não houver token em qualquer página
        // Ajuste o caminho se necessário
        if (!window.location.pathname.includes('/login/')) {
             window.location.href = '../login/login.html';
        }
        return;
    }

    // 1. Encontra o container do cabeçalho na página atual
    const headerContainer = document.getElementById('header-container');
    if (!headerContainer) {
        console.error('Elemento #header-container não encontrado na página.');
        return;
    }

    // 2. Carrega o HTML do cabeçalho
    fetch('../shared/header.html')
        .then(response => response.text())
        .then(html => {
            headerContainer.innerHTML = html;

            // 3. Após o HTML ser inserido, busca os dados do perfil
            fetchUserProfile(accessToken);
        });
});

function fetchUserProfile(token) {
    fetch('http://127.0.0.1:8000/api/user/profile/', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) throw new Error('Falha ao buscar perfil do usuário.');
        return response.json();
    })
    .then(profileData => {
        // 4. Preenche os dados no cabeçalho
        document.querySelector('.client-profile').style.opacity = 1;
        document.querySelector('.user-profile').style.opacity = 1;
        document.getElementById('client-name').textContent = profileData.cliente.empresa;

        // USA A FUNÇÃO DO ARQUIVO utils.js
        document.getElementById('client-cnpj').textContent = formatarCNPJ(profileData.cliente.cnpj); 

        document.getElementById('user-name').textContent = `Olá, ${profileData.nome_completo}`;
        document.getElementById('user-email').textContent = profileData.email;
        const dataAtual = new Date();
        document.getElementById('user-date').textContent = `${dataAtual.toLocaleDateString('pt-BR')} - ${dataAtual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    })
    .catch(error => console.error('Erro ao carregar dados do cabeçalho:', error));
}