document.addEventListener('DOMContentLoaded', (event) => {
    // === LÓGICA DO POP-UP DE NOTIFICAÇÃO ===
    const popup = document.getElementById('popup-notification');
    const popupMessage = popup.querySelector('p');

    // Função para mostrar o popup com uma mensagem específica
    function showPopup(message, isError = false) {
        popupMessage.textContent = message;
        
        // Remove as classes de estado e esconde o popup antes de mostrar
        popup.classList.remove('hidden', 'error', 'success');

        if (isError) {
            popup.classList.add('error');
        } else {
            popup.classList.add('success');
        }

        popup.classList.remove('hidden');

        // Faz o popup desaparecer automaticamente depois de 5 segundos
        setTimeout(() => {
            popup.classList.add('hidden');
        }, 5000); 
    }

    // === LÓGICA DE INTEGRAÇÃO FRONT-BACK ===
    const formLogin = document.getElementById('formLogin');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    formLogin.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = emailInput.value;
        const password = passwordInput.value;

        const loginData = {
            email: email, 
            password: password
        };

        try {
            const response = await fetch('http://127.0.0.1:8000/api/token/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(loginData),
            });
            
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('accessToken', data.access);
                localStorage.setItem('refreshToken', data.refresh);
                
                // Redireciona imediatamente após o sucesso
                window.location.href = '/acervo_tecnico/acervo_tecnico.html';
            } else {
                const errorData = await response.json();
                // Mostra o popup de erro
                showPopup(errorData.detail || 'Usuário e/ou senha incorretos.', true);
            }
        } catch (error) {
            showPopup('Erro de conexão. Por favor, tente novamente.', true);
        }
    });
});