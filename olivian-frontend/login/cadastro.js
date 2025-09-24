// Obtém os elementos do formulário usando os IDs
const formCadastro = document.getElementById('formCadastro');
const nomeCompletoInput = document.getElementById('nomeCompleto');
const emailCadastroInput = document.getElementById('emailCadastro');
const senhaInput = document.getElementById('senha');
const confirmarSenhaInput = document.getElementById('confirmarSenha');

// Adiciona um "ouvinte" para quando o formulário for enviado
formCadastro.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Pega os valores dos campos
    const nomeCompleto = nomeCompletoInput.value;
    const email = emailCadastroInput.value;
    const senha = senhaInput.value;
    const confirmarSenha = confirmarSenhaInput.value;

    // 1. Validação de senha
    if (senha !== confirmarSenha) {
        alert('As senhas não coincidem. Por favor, tente novamente.');
        return;
    }

    // A sua API de registro usa 'username', 'email' e 'password'. 
    // Usaremos o email como username para manter a consistência que ajustamos.
    const cadastroData = {
        username: email,
        email: email,
        password: senha
    };

    try {
        // 2. Faz a requisição POST para a API de cadastro
        const response = await fetch('http://127.0.0.1:8000/api/cadastrar-usuario/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(cadastroData),
        });

        const data = await response.json();

        // 3. Checa a resposta da API
        if (!response.ok) {
            // Se a API retornar um erro (ex: domínio não cadastrado)
            const errorMessage = data.email ? data.email[0] : 'Erro no cadastro. Por favor, verifique os dados.';
            throw new Error(errorMessage);
        }

        // 4. Cadastro bem-sucedido
        alert('Cadastro realizado com sucesso! Você já pode fazer login.');
        // Opcional: redireciona para a página de login
        window.location.href = 'login.html'; 

    } catch (error) {
        console.error('Erro no cadastro:', error.message);
        alert('Erro no cadastro: ' + error.message);
    }
});