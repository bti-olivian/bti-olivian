document.addEventListener('DOMContentLoaded', () => {
    const formRedefinir = document.getElementById('formRedefinir');
    const emailInput = document.getElementById('emailRedefinir');

    formRedefinir.addEventListener('submit', async (event) => {
        event.preventDefault();

        const email = emailInput.value;

        try {
            const response = await fetch('http://127.0.0.1:8000/api/redefinir-senha/solicitar/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: email }),
            });

            const data = await response.json();

            if (response.ok) {
                alert('Se o seu e-mail estiver cadastrado, você receberá um link para redefinir a senha.');
                window.location.href = 'login.html'; 
            } else {
                const errorMessage = data.detail || 'Erro ao solicitar a redefinição de senha.';
                throw new Error(errorMessage);
            }
        } catch (error) {
            alert('Erro: ' + error.message);
        }
    });
});