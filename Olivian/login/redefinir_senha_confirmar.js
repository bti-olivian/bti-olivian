document.addEventListener('DOMContentLoaded', () => {
    const formConfirmarSenha = document.getElementById('formConfirmarSenha');
    const novaSenhaInput = document.getElementById('novaSenha');
    const confirmarNovaSenhaInput = document.getElementById('confirmarNovaSenha');

    formConfirmarSenha.addEventListener('submit', async (event) => {
        event.preventDefault();

        const novaSenha = novaSenhaInput.value;
        const confirmarNovaSenha = confirmarNovaSenhaInput.value;

        if (novaSenha !== confirmarNovaSenha) {
            alert('As senhas não coincidem!');
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const uid = urlParams.get('uid');
        const token = urlParams.get('token');

        if (!uid || !token) {
            alert('O link de redefinição de senha é inválido.');
            return;
        }

        const resetData = {
            new_password: novaSenha,
            uid: uid,
            token: token
        };

        try {
            const response = await fetch('http://127.0.0.1:8000/api/redefinir-senha/confirmar/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(resetData),
            });

            if (response.ok) {
                const data = await response.json();
                alert('Sua senha foi redefinida com sucesso!');
                window.location.href = 'login.html';
            } else {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Erro ao redefinir a senha.');
            }
        } catch (error) {
            alert('Erro: ' + error.message);
        }
    });
});