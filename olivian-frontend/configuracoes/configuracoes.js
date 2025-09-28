document.addEventListener('DOMContentLoaded', () => {
    // CORRIGIDO: Agora verifica a chave 'access' para ser consistente com o resto da aplicação.
    const accessToken = localStorage.getItem('access');
    
    if (!accessToken) {
        console.error('Usuário não autenticado.');
        window.location.href = '../login/login.html';
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

    // --- FUNÇÕES DE FORMATAÇÃO ---
    const formatarData = (dataString) => {
        if (!dataString) return 'N/A';
        const dataObj = new Date(dataString + 'T00:00:00');
        return dataObj.toLocaleDateString('pt-BR');
    };

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

    // Função genérica para buscar dados de uma API com tratamento de erro de autenticação
    async function fetchData(url) {
        try {
            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
            
            if (response.ok) return await response.json();
            
            // --- TRATAMENTO DE ERROS CORRIGIDO ---
            if (response.status === 401 || response.status === 403) {
                // Erros de Autenticação/Sessão Expirada: Redireciona para o login
                alert('Sua sessão expirou ou não tem permissão. Por favor, faça o login novamente.');
                // ALERTA: Removendo o token 'access'
                localStorage.removeItem('access'); 
                window.location.href = '../login/login.html';
                return; 
            } 
            
            // Outros erros (404, 500): Não redireciona, apenas loga.
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Falha na API (${response.status}) ao buscar ${url}. Verifique o terminal do Django.`, errorText);
            }
        } catch (error) {
            // Erros de rede (servidor offline, etc.)
            console.error(`Erro de conexão ao buscar dados de ${url}:`, error);
        }
        return [];
    }
    
    // Função genérica para renderizar a lista de nomes na página principal
    function renderItemList(items, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        if (items && items.length > 0) {
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
        // ***** LINHA DE DEPURAÇÃO ADICIONADA AQUI *****
        console.log(`Dados para a lista '${containerId}':`, items);

        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        if (items && items.length > 0) {
            items.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'popup-item';

                let details = `<p><strong>Descrição:</strong> ${item.descricao || 'N/A'}</p>`;
                if (type === 'auditoria') {
                    details += `<p><strong>Data:</strong> ${formatarData(item.data_auditoria)}</p>`;
                } else if (type === 'certificacao') {
                    details += `<p><strong>Início:</strong> ${formatarData(item.data_inicio)}</p>`;
                    details += `<p><strong>Término:</strong> ${formatarData(item.data_termino)}</p>`;
                }

                if (item.normas && item.normas.length > 0) {
                    details += '<strong>Normas:</strong><ul class="normas-list">';
                    item.normas.forEach(norma => {
                        details += `<li>${norma.norma}</li>`;
                    });
                    details += '</ul>';
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
        // A API /api/minhas-normas/ é onde o ProgrammingError está ocorrendo
        const normas = await fetchData('http://127.0.0.1:8000/api/minhas-normas/'); 
        if (normas && normas.length > 0) {
            const choicesData = normas.map(norma => ({
                value: norma.id,
                label: `${norma.norma}`
            }));
            normasAuditoriaSelect.setChoices(choicesData, 'value', 'label', false);
            normasCertificacaoSelect.setChoices(choicesData, 'value', 'label', false);
            normasCentroCustoSelect.setChoices(choicesData, 'value', 'label', false);
        }
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
        
        const normasIds = choicesInstance.getValue(true);
        if (!normasIds || normasIds.length === 0) {
            alert('Por favor, selecione pelo menos uma norma no Acervo Técnico.');
            return;
        }

        data.normas_ids = normasIds.map(id => parseInt(id, 10));

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                alert('Item salvo com sucesso!');
                form.reset();
                choicesInstance.clearStore();
                initializePage();
                const modal = form.closest('.modal-overlay');
                if(modal) modal.style.display = 'none';
            } else {
                console.error('Falha na resposta do servidor:', response.status, response.statusText);
                let errorDetail = 'O servidor retornou um erro, mas não foi possível obter os detalhes.';
                
                // Tenta ler o JSON de erro (comum em DRF)
                try {
                    const errorData = await response.json();
                    console.error('Detalhe do erro (JSON):', errorData);
                    const firstErrorKey = Object.keys(errorData)[0];
                    errorDetail = `${firstErrorKey}: ${errorData[firstErrorKey][0]}`;
                } catch (jsonError) {
                    console.error('A resposta de erro não é JSON. Lendo como texto.');
                    const errorText = await response.text();
                    console.error('Detalhe do erro (Texto):', errorText);
                    errorDetail = 'O servidor retornou um erro inesperado. Verifique o console do navegador (F12) para o traceback completo.';
                }
                
                alert(`Erro ao salvar: ${errorDetail}`);
            }
        } catch (error) {
            console.error('Erro de conexão:', error);
            alert('Erro de conexão com o servidor. Verifique se o backend está rodando e se não há problemas de rede ou CORS.');
        }
    }

    // Função genérica para controlar a abertura e fecho dos popups
    function setupModal(button, modal) {
        if (button && modal) {
            button.addEventListener('click', () => modal.style.display = 'flex');
            const closeBtn = modal.querySelector('.close-button');
            if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
            window.addEventListener('click', (event) => {
                if (event.target === modal) modal.style.display = 'none';
            });
        }
    }
    
    // --- CARREGAMENTO INICIAL E ATRIBUIÇÃO DE EVENTOS ---
    async function initializePage() {
        const [auditorias, certificacoes, centrosDeCusto, dadosEmpresa] = await Promise.all([
            fetchData('http://127.0.0.1:8000/api/auditorias/'),
            fetchData('http://127.0.0.1:8000/api/certificacoes/'),
            fetchData('http://127.0.0.1:8000/api/centros-de-custo/'),
            fetchData('http://127.0.0.1:8000/api/user/profile/')
        ]);

        renderItemList(auditorias, 'lista-auditorias');
        renderItemList(certificacoes, 'lista-certificacoes');
        renderItemList(centrosDeCusto, 'lista-centros-de-custos');

        renderPopupList(auditorias, 'lista-auditorias-popup', 'auditoria');
        renderPopupList(certificacoes, 'lista-certificacoes-popup', 'certificacao');
        renderPopupList(centrosDeCusto, 'lista-centros-de-custos-popup');
        
        if (dadosEmpresa && dadosEmpresa.cliente) {
            const cliente = dadosEmpresa.cliente;
            const formatarCNPJ = (cnpj) => !cnpj ? 'Não informado' : cnpj.replace(/\D/g, '').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
            const formatarCEP = (cep) => !cep ? 'Não informado' : cep.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2');
            const formatarTelefone = (tel) => !tel ? 'Não informado' : tel.replace(/\D/g, '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
            
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
        }
    }

    // Configuração dos Popups
    setupModal(addAuditoriaBtn, modalAuditoria);
    setupModal(addCertificacaoBtn, modalCertificacao);
    setupModal(addCentroCustoBtn, modalCentroCusto);

    // Atribuição dos eventos de submissão aos formulários
    if (auditoriaForm) auditoriaForm.addEventListener('submit', (e) => handleFormSubmit(e, 'http://127.0.0.1:8000/api/auditorias/', normasAuditoriaSelect));
    if (certificacaoForm) certificacaoForm.addEventListener('submit', (e) => handleFormSubmit(e, 'http://127.0.0.1:8000/api/certificacoes/', normasCertificacaoSelect));
    if (centroCustoForm) centroCustoForm.addEventListener('submit', (e) => handleFormSubmit(e, 'http://127.0.0.1:8000/api/centros-de-custo/', normasCentroCustoSelect));

    // Inicialização da página
    carregarNormasNosSeletores();
    initializePage();
});