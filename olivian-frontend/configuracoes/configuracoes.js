document.addEventListener('DOMContentLoaded', () => {

    // --- FUNÇÕES DE FORMATAÇÃO ---

    // Formata o CNPJ para o padrão XX.XXX.XXX/XXXX-XX
    const formatarCNPJ = (cnpj) => {
        if (!cnpj) return 'Não informado';
        // Remove qualquer caractere que não seja número
        const cnpjLimpo = cnpj.replace(/\D/g, '');
        // Aplica a máscara
        return cnpjLimpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    };

    // Formata o CEP para o padrão XXXXX-XXX
    const formatarCEP = (cep) => {
        if (!cep) return 'Não informado';
        const cepLimpo = cep.replace(/\D/g, '');
        return cepLimpo.replace(/(\d{5})(\d{3})/, '$1-$2');
    };

    // Formata o Telefone para o padrão (XX) XXXXX-XXXX
    const formatarTelefone = (telefone) => {
        if (!telefone) return 'Não informado';
        const telefoneLimpo = telefone.replace(/\D/g, '');
        return telefoneLimpo.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    };

    // --- FUNÇÃO PRINCIPAL PARA CARREGAR OS DADOS ---

    async function carregarDadosEmpresariais() {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            console.error('Usuário não autenticado.');
            return;
        }

        try {
            const response = await fetch('http://127.0.0.1:8000/api/user/profile/', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                const cliente = data.cliente;

                const formatarData = (dataString) => {
                    if (!dataString) return 'N/A';
                    const dataObj = new Date(dataString + 'T00:00:00');
                    return dataObj.toLocaleDateString('pt-BR');
                };

                // Preenche os campos no HTML, aplicando as máscaras de formatação
                document.getElementById('empresa-razao-social').textContent = cliente.empresa || 'Não informado';
                document.getElementById('empresa-cnpj').textContent = formatarCNPJ(cliente.cnpj);
                document.getElementById('empresa-endereco').textContent = cliente.endereco || 'Não informado';
                document.getElementById('empresa-bairro').textContent = cliente.bairro || 'Não informado';
                document.getElementById('empresa-cidade').textContent = cliente.cidade || 'Não informado';
                document.getElementById('empresa-estado').textContent = cliente.estado || 'Não informado';
                document.getElementById('empresa-cep').textContent = formatarCEP(cliente.cep);
                document.getElementById('empresa-telefone').textContent = formatarTelefone(cliente.telefone);
                document.getElementById('empresa-vigencia-inicio').textContent = formatarData(cliente.vigencia_contratual_inicio);
                document.getElementById('empresa-vigencia-fim').textContent = formatarData(cliente.vigencia_contratual_fim);
            } else {
                console.error('Falha ao carregar dados da empresa:', await response.json());
            }
        } catch (error) {
            console.error('Erro de conexão com o servidor:', error);
        }
    }

    // Chama a função para carregar os dados quando a página for carregada
    carregarDadosEmpresariais();
});

document.addEventListener('DOMContentLoaded', () => {
    const accessToken = localStorage.getItem('accessToken');

    // --- INICIALIZA OS DROPDOWNS ESTILIZADOS ---
    const configChoices = {
        removeItemButton: true, // Adiciona um 'X' para remover itens selecionados
        placeholder: true,
        placeholderValue: 'Selecione o Acervo Técnico',
        searchPlaceholderValue: 'Buscar por norma...',
        noResultsText: 'Nenhum resultado encontrado',
        itemSelectText: 'Pressione para selecionar',
    };

    const normasAuditoriaSelect = new Choices('#normas_auditoria', configChoices);
    const normasCertificacaoSelect = new Choices('#normas_certificacao', configChoices);
    const normasCentroCustoSelect = new Choices('#normas_centro_custo', configChoices);

    // --- FORMULÁRIOS ---
    const auditoriaForm = document.getElementById('auditoriaForm');
    const certificacaoForm = document.getElementById('certificacaoForm');
    const centroCustoForm = document.getElementById('centroCustoForm');

    // Função para buscar as normas e preencher os seletores
    async function carregarNormasNosSeletores() {
        if (!accessToken) return;
        try {
            const response = await fetch('http://127.0.0.1:8000/api/minhas-normas/', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (response.ok) {
                const normas = await response.json();

                // Prepara os dados no formato que a biblioteca Choices.js espera
                const choicesData = normas.map(norma => ({
                    value: norma.id,
                    label: `${norma.norma}`
                }));

                // Usa a API da biblioteca para definir as opções
                normasAuditoriaSelect.setChoices(choicesData, 'value', 'label', true);
                normasCertificacaoSelect.setChoices(choicesData, 'value', 'label', true);
                normasCentroCustoSelect.setChoices(choicesData, 'value', 'label', true);
            }
        } catch (error) {
            console.error("Erro ao carregar normas:", error);
        }
    }

    // Função genérica para enviar dados de formulário
    async function handleFormSubmit(event, url, choicesInstance) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);

        const data = {};
        formData.forEach((value, key) => {
            // Ignora o campo 'normas' do FormData, pois vamos pegá-lo da instância do Choices
            if (key !== 'normas') {
                data[key] = value;
            }
        });

        // Pega os valores selecionados diretamente da instância do Choices.js
        data.normas = choicesInstance.getValue(true);

        // Validação para garantir que pelo menos uma norma foi selecionada
        if (!data.normas || data.normas.length === 0) {
            alert('Por favor, selecione pelo menos uma norma no Acervo Técnico.');
            return;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                alert(`${form.querySelector('h3').textContent} salvo(a) com sucesso!`);
                form.reset();
                choicesInstance.clearStore(); // Limpa a seleção do dropdown
            } else {
                const errorData = await response.json();
                console.error('Erro ao salvar:', errorData);
                alert(`Erro ao salvar. Verifique os campos e tente novamente.`);
            }
        } catch (error) {
            console.error('Erro de conexão:', error);
            alert('Erro de conexão com o servidor.');
        }
    }

    // Adiciona os "ouvintes" de evento para cada formulário
    auditoriaForm.addEventListener('submit', (e) => handleFormSubmit(e, 'http://127.0.0.1:8000/api/auditorias/', normasAuditoriaSelect));
    certificacaoForm.addEventListener('submit', (e) => handleFormSubmit(e, 'http://127.0.0.1:8000/api/certificacoes/', normasCertificacaoSelect));
    centroCustoForm.addEventListener('submit', (e) => handleFormSubmit(e, 'http://127.0.0.1:8000/api/centros-de-custo/', normasCentroCustoSelect));

    // Carrega as normas e os dados da empresa quando a página é aberta
    carregarNormasNosSeletores();
    // ... (sua função carregarDadosEmpresariais continua aqui)
});

document.addEventListener('DOMContentLoaded', () => {
    const accessToken = localStorage.getItem('accessToken');

    // --- Seletores dos Elementos da Página ---
    const addAuditoriaBtn = document.getElementById('add-auditoria-btn');
    const addCertificacaoBtn = document.getElementById('add-certificacao-btn');
    const addCentroCustoBtn = document.getElementById('add-centro-custo-btn');

    const modalAuditoria = document.getElementById('modal-auditoria');
    const modalCertificacao = document.getElementById('modal-certificacao');
    const modalCentroCusto = document.getElementById('modal-centro-custo');
    
    const auditoriaForm = document.getElementById('auditoriaForm');
    const certificacaoForm = document.getElementById('certificacaoForm');
    const centroCustoForm = document.getElementById('centroCustoForm');

    // Função genérica para buscar dados de uma API
    async function fetchData(url) {
        if (!accessToken) return [];
        try {
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (response.ok) return await response.json();
        } catch (error) {
            console.error(`Erro ao buscar dados de ${url}:`, error);
        }
        return [];
    }

    // Função genérica para renderizar a lista de nomes na página principal
    function renderItemList(items, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        if (items.length > 0) {
            items.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'item-name';
                itemDiv.textContent = item.nome;
                container.appendChild(itemDiv);
            });
        } else {
            container.innerHTML = '<p style="font-size: 0.8em; color: #888;">Nenhum item adicionado.</p>';
        }
    }

    // Função genérica para renderizar a lista detalhada dentro de um popup
    function renderPopupList(items, containerId, type) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        if (items.length > 0) {
            items.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'popup-item';
                let details = `<p><strong>Descrição:</strong> ${item.descricao || 'N/A'}</p>`;
                
                if (type === 'auditoria') {
                    details += `<p><strong>Data:</strong> ${new Date(item.data_auditoria).toLocaleDateString('pt-BR')}</p>`;
                } else if (type === 'certificacao') {
                    details += `<p><strong>Início:</strong> ${new Date(item.data_inicio).toLocaleDateString('pt-BR')}</p>`;
                    details += `<p><strong>Término:</strong> ${new Date(item.data_termino).toLocaleDateString('pt-BR')}</p>`;
                }

                itemDiv.innerHTML = `<h4>${item.nome}</h4>${details}`;
                container.appendChild(itemDiv);
            });
        } else {
            container.innerHTML = '<p>Nenhum item cadastrado.</p>';
        }
    }

    // Função genérica para controlar a abertura e fecho dos popups
    function setupModal(button, modal) {
        if (button) {
            button.addEventListener('click', () => modal.style.display = 'flex');
        }
        const closeBtn = modal.querySelector('.close-button');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => modal.style.display = 'none');
        }
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    // --- Carregamento e Renderização Inicial ---
    async function initializePage() {
        const [auditorias, certificacoes, centrosDeCusto] = await Promise.all([
            fetchData('http://127.0.0.1:8000/api/auditorias/'),
            fetchData('http://127.0.0.1:8000/api/certificacoes/'),
            fetchData('http://127.0.0.1:8000/api/centros-de-custo/')
        ]);

        renderItemList(auditorias, 'lista-auditorias');
        renderItemList(certificacoes, 'lista-certificacoes');
        renderItemList(centrosDeCusto, 'lista-centros-de-custos');

        renderPopupList(auditorias, 'lista-auditorias-popup', 'auditoria');
        // Adicione os containers correspondentes no HTML para as linhas abaixo funcionarem
        renderPopupList(certificacoes, 'lista-certificacoes-popup', 'certificacao');
        renderPopupList(centrosDeCusto, 'lista-centros-de-custos-popup');
    }

    // --- Configuração dos Popups ---
    setupModal(addAuditoriaBtn, modalAuditoria);
    setupModal(addCertificacaoBtn, modalCertificacao);
    setupModal(addCentroCustoBtn, modalCentroCusto);

    // --- Inicialização da página ---
    initializePage();
    // Chame aqui a sua função existente para carregar os dados empresariais
    carregarDadosEmpresariais(); 
});

document.addEventListener('DOMContentLoaded', () => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
        console.error('Usuário não autenticado.');
        return;
    }

    // --- SELETORES DOS ELEMENTOS DA PÁGINA ---
    const addAuditoriaBtn = document.getElementById('add-auditoria-btn');
    const addCertificacaoBtn = document.getElementById('add-certificacao-btn');
    const addCentroCustoBtn = document.getElementById('add-centro-custo-btn');

    const modalAuditoria = document.getElementById('modal-auditoria');
    const modalCertificacao = document.getElementById('modal-certificacao');
    const modalCentroCusto = document.getElementById('modal-centro-custo');
    
    const auditoriaForm = document.getElementById('auditoriaForm');
    const certificacaoForm = document.getElementById('certificacaoForm');
    const centroCustoForm = document.getElementById('centroCustoForm');

    // --- INICIALIZA OS DROPDOWNS ESTILIZADOS COM CHOICES.JS ---
    const configChoices = {
        removeItemButton: true,
        placeholder: true,
        placeholderValue: 'Selecione uma ou mais normas',
        searchPlaceholderValue: 'Buscar no acervo...',
        noResultsText: 'Nenhum resultado encontrado',
        itemSelectText: 'Pressione para selecionar',
    };

    const normasAuditoriaSelect = new Choices('#normas_auditoria', configChoices);
    const normasCertificacaoSelect = new Choices('#normas_certificacao', configChoices);
    const normasCentroCustoSelect = new Choices('#normas_centro_custo', configChoices);

    // --- FUNÇÕES DE LÓGICA ---

    // Função genérica para buscar dados de uma API
    async function fetchData(url) {
        try {
            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
            if (response.ok) return await response.json();
        } catch (error) {
            console.error(`Erro ao buscar dados de ${url}:`, error);
        }
        return [];
    }

    // Função genérica para renderizar a lista de nomes na página principal
    function renderItemList(items, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        if (items.length > 0) {
            items.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'item-name';
                itemDiv.textContent = item.nome;
                container.appendChild(itemDiv);
            });
        } else {
            container.innerHTML = '<p style="font-size: 0.8em; color: #888;">Nenhum item adicionado.</p>';
        }
    }

    // Função genérica para renderizar a lista detalhada dentro de um popup
    function renderPopupList(items, containerId, type) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        if (items.length > 0) {
            items.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'popup-item';
                let details = `<p><strong>Descrição:</strong> ${item.descricao || 'N/A'}</p>`;
                if (type === 'auditoria') {
                    details += `<p><strong>Data:</strong> ${new Date(item.data_auditoria + 'T00:00:00').toLocaleDateString('pt-BR')}</p>`;
                } else if (type === 'certificacao') {
                    details += `<p><strong>Início:</strong> ${new Date(item.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')}</p>`;
                    details += `<p><strong>Término:</strong> ${new Date(item.data_termino + 'T00:00:00').toLocaleDateString('pt-BR')}</p>`;
                }
                itemDiv.innerHTML = `<h4>${item.nome}</h4>${details}`;
                container.appendChild(itemDiv);
            });
        } else {
            container.innerHTML = '<p>Nenhum item cadastrado.</p>';
        }
    }
    
    // Função para buscar as normas do cliente e preencher os seletores
    async function carregarNormasNosSeletores() {
        const normas = await fetchData('http://127.0.0.1:8000/api/minhas-normas/');
        const choicesData = normas.map(norma => ({
            value: norma.id,
            label: `${norma.norma}`
        }));
        normasAuditoriaSelect.setChoices(choicesData, 'value', 'label', false);
        normasCertificacaoSelect.setChoices(choicesData, 'value', 'label', false);
        normasCentroCustoSelect.setChoices(choicesData, 'value', 'label', false);
    }

    // Função genérica para enviar dados de formulário para uma API
    async function handleFormSubmit(event, url, choicesInstance) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        
        const data = {};
        formData.forEach((value, key) => {
            if (key !== 'normas') data[key] = value;
        });
        data.normas = choicesInstance.getValue(true);

        if (!data.normas || data.normas.length === 0) {
            alert('Por favor, selecione pelo menos uma norma no Acervo Técnico.');
            return;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                alert(`${form.querySelector('h3, h2').textContent} salvo(a) com sucesso!`);
                form.reset();
                choicesInstance.clearStore();
                initializePage(); // Recarrega todas as listas da página
            } else {
                const errorData = await response.json();
                console.error('Erro ao salvar:', errorData);
                alert(`Erro ao salvar. Verifique os campos e tente novamente.`);
            }
        } catch (error) {
            console.error('Erro de conexão:', error);
            alert('Erro de conexão com o servidor.');
        }
    }

    // Função genérica para controlar a abertura e fecho dos popups
    function setupModal(button, modal) {
        if (button) button.addEventListener('click', () => modal.style.display = 'flex');
        const closeBtn = modal.querySelector('.close-button');
        if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
        window.addEventListener('click', (event) => {
            if (event.target === modal) modal.style.display = 'none';
        });
    }

    // --- CARREGAMENTO INICIAL E ATRIBUIÇÃO DE EVENTOS ---
    async function initializePage() {
        const [auditorias, certificacoes, centrosDeCusto] = await Promise.all([
            fetchData('http://127.0.0.1:8000/api/auditorias/'),
            fetchData('http://127.0.0.1:8000/api/certificacoes/'),
            fetchData('http://127.0.0.1:8000/api/centros-de-custo/')
        ]);

        renderItemList(auditorias, 'lista-auditorias');
        renderItemList(certificacoes, 'lista-certificacoes');
        renderItemList(centrosDeCusto, 'lista-centros-de-custos');

        renderPopupList(auditorias, 'lista-auditorias-popup', 'auditoria');
        renderPopupList(certificacoes, 'lista-certificacoes-popup', 'certificacao');
        renderPopupList(centrosDeCusto, 'lista-centros-de-custos-popup');
    }

    // Configuração dos Popups
    setupModal(addAuditoriaBtn, modalAuditoria);
    setupModal(addCertificacaoBtn, modalCertificacao);
    setupModal(addCentroCustoBtn, modalCentroCusto);

    // Atribuição dos eventos de submissão aos formulários
    auditoriaForm.addEventListener('submit', (e) => handleFormSubmit(e, 'http://127.0.0.1:8000/api/auditorias/', normasAuditoriaSelect));
    certificacaoForm.addEventListener('submit', (e) => handleFormSubmit(e, 'http://127.0.0.1:8000/api/certificacoes/', normasCertificacaoSelect));
    centroCustoForm.addEventListener('submit', (e) => handleFormSubmit(e, 'http://127.0.0.1:8000/api/centros-de-custo/', normasCentroCustoSelect));

    // Inicialização da página
    carregarNormasNosSeletores();
    initializePage();
    // (Não se esqueça de adicionar aqui a sua função para carregar os dados empresariais se ela não estiver neste arquivo)
});