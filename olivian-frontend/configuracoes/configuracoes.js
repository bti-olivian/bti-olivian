document.addEventListener('DOMContentLoaded', async () => {
    // A verificação inicial de token deve estar aqui, mas a leitura do valor
    // é feita dentro do fetchData para garantir que o token mais recente seja usado.
    const initialAccessToken = localStorage.getItem('access');
    
    if (!initialAccessToken) {
        console.error('Usuário não autenticado.');
        window.location.href = '../login/login.html';
        return;
    }

    // --- VARIÁVEIS GLOBAIS DE CONTROLE E CACHE ---
    const BASE_URL = 'http://127.0.0.1:8000/api/';
    let currentEditingItem = { id: null, type: null };
    let cachedAuditorias = [];
    let cachedCertificacoes = [];
    let cachedCentrosDeCusto = [];
    let allNormas = []; // Cache das normas para Choices.js

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

    const auditoriaFormTitle = document.getElementById('auditoria-form-title');
    const listaAuditoriasPopup = document.getElementById('lista-auditorias-popup');
    const auditoriaSaveNewBtn = auditoriaForm ? auditoriaForm.querySelector('.save-new-btn') : null;
    const auditoriaEditModeActions = auditoriaForm ? auditoriaForm.querySelector('.edit-mode-actions') : null;
    const auditoriaCancelEditBtn = auditoriaForm ? auditoriaForm.querySelector('.cancel-edit-btn') : null;
    const auditoriaDeleteBtn = auditoriaForm ? auditoriaForm.querySelector('.delete-item-btn') : null;

    const certificacaoFormTitle = document.getElementById('certificacao-form-title');
    const listaCertificacoesPopup = document.getElementById('lista-certificacoes-popup');
    const certificacaoSaveNewBtn = certificacaoForm ? certificacaoForm.querySelector('.save-new-btn') : null;
    const certificacaoEditModeActions = certificacaoForm ? certificacaoForm.querySelector('.edit-mode-actions') : null;
    const certificacaoCancelEditBtn = certificacaoForm ? certificacaoForm.querySelector('.cancel-edit-btn') : null;
    const certificacaoDeleteBtn = certificacaoForm ? certificacaoForm.querySelector('.delete-item-btn') : null;

    const custoFormTitle = document.getElementById('custo-form-title');
    const listaCustosPopup = document.getElementById('lista-centros-de-custos-popup');
    const custoSaveNewBtn = centroCustoForm ? centroCustoForm.querySelector('.save-new-btn') : null;
    const custoEditModeActions = centroCustoForm ? centroCustoForm.querySelector('.edit-mode-actions') : null;
    const custoCancelEditBtn = centroCustoForm ? centroCustoForm.querySelector('.cancel-edit-btn') : null;
    const custoDeleteBtn = centroCustoForm ? centroCustoForm.querySelector('.delete-item-btn') : null;


    // --- FUNÇÕES DE FORMATAÇÃO ---
    const formatarData = (dataString) => {
        if (!dataString) return 'N/A';
        const dataObj = new Date(dataString + 'T00:00:00');
        return dataObj.toLocaleDateString('pt-BR');
    };

    const formatarParaInputDate = (dataString) => {
        if (!dataString) return '';
        const dataObj = new Date(dataString + 'T00:00:00');
        const ano = dataObj.getFullYear();
        const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
        const dia = String(dataObj.getDate()).padStart(2, '0');
        return `${ano}-${mes}-${dia}`;
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
    async function fetchData(url, method = 'GET', data = null) {
        // *** CORREÇÃO CRÍTICA: LÊ O TOKEN A CADA CHAMADA PARA GARANTIR VALIDADE ***
        const currentAccessToken = localStorage.getItem('access');
        
        if (!currentAccessToken) {
             console.warn(`Token de acesso ausente ao tentar buscar ${url}.`);
             // Permite que o código continue para cair no tratamento 401/403 se for o caso
             // (o que é improvável se o token inicial foi verificado no topo).
             return []; 
        }

        const options = {
            method: method,
            headers: { 
                'Authorization': `Bearer ${currentAccessToken}` 
            }
        };

        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
            options.headers['Content-Type'] = 'application/json';
        }

        try {
            const response = await fetch(url, options);

            if (response.ok) {
                return method === 'DELETE' ? true : await response.json();
            }

            // --- TRATAMENTO DE ERROS EXISTENTE ---
            if (response.status === 401 || response.status === 403) {
                alert('Sua sessão expirou ou não tem permissão. Por favor, faça o login novamente.');
                localStorage.removeItem('access');
                window.location.href = '../login/login.html';
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Falha na API (${response.status}) ao buscar/enviar ${url}.`, errorText);
            }
        } catch (error) {
            console.error(`Erro de conexão ao buscar dados de ${url}:`, error);
        }
        return method === 'DELETE' ? false : [];
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
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';

        const entitySlug = type.toLowerCase().replace(/\s/g, '-');

        if (items && items.length > 0) {
            items.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'list-item popup-item';
                itemDiv.setAttribute('data-id', item.id);
                itemDiv.setAttribute('data-type', entitySlug);

                let details = `<p><strong>Descrição:</strong> ${item.descricao || 'N/A'}</p>`;
                if (entitySlug === 'auditoria') {
                    details += `<p><strong>Data:</strong> ${formatarData(item.data_auditoria)}</p>`;
                } else if (entitySlug === 'certificacao') {
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

                itemDiv.innerHTML = `
                <div class="item-header">
                    <span class="item-name">${item.nome}</span>
                </div>
                ${details}
            `;
                container.appendChild(itemDiv);
            });
        } else {
            container.innerHTML = '<p>Nenhum item cadastrado.</p>';
        }
    }

    // Função para buscar as normas do cliente e preencher os seletores
    async function carregarNormasNosSeletores() {
        if (allNormas.length === 0) {
            const normas = await fetchData(`${BASE_URL}minhas-normas/`);
            if (!normas || normas.length === 0) {
                console.error("Não foi possível carregar as normas da API. Verifique a autenticação ou se a lista está vazia.");
                return;
            }
            allNormas = normas;
        }

        const choicesData = allNormas.map(norma => ({
            value: String(norma.id),
            label: `${norma.norma}`
        }));
        
        // Limpar a store do Choices.js completamente para evitar duplicatas ou erros de estado
        normasAuditoriaSelect.clearStore();
        normasCertificacaoSelect.clearStore();
        normasCentroCustoSelect.clearStore();


        // Adiciona as opções de normas aos 3 seletores. 
        normasAuditoriaSelect.setChoices(choicesData, 'value', 'label', true);
        normasCertificacaoSelect.setChoices(choicesData, 'value', 'label', true);
        normasCentroCustoSelect.setChoices(choicesData, 'value', 'label', true);
    }

    // --- FUNÇÕES DE MODO EDIÇÃO/NOVO ---

    function getChoicesInstance(type) {
        switch (type) {
            case 'auditoria': return normasAuditoriaSelect;
            case 'certificacao': return normasCertificacaoSelect;
            case 'centro-de-custo': return normasCentroCustoSelect;
            default: return null;
        }
    }

    async function toggleFormMode(elements, itemData, entityName) {
        const choicesInstance = getChoicesInstance(entityName);
        
        if (allNormas.length === 0) {
            await carregarNormasNosSeletores();
        }

        if (choicesInstance) {
            choicesInstance.clearChoices();
        }

        if (itemData) {
            // --- MODO EDIÇÃO ---
            elements.formTitle.textContent = 'Editar';
            elements.saveNewBtn.style.display = 'none';
            elements.editModeActions.style.display = 'flex';

            currentEditingItem = { id: itemData.id, type: entityName };

            elements.form.reset();
            elements.form.querySelector(`[name="nome"]`).value = itemData.nome || '';
            elements.form.querySelector(`[name="descricao"]`).value = itemData.descricao || '';


            // Campos específicos
            if (entityName === 'auditoria') {
                const dataInput = elements.form.querySelector(`[name="data_auditoria"]`);
                if (dataInput) dataInput.value = formatarParaInputDate(itemData.data_auditoria);
            } else if (entityName === 'certificacao') {
                const dataInicioInput = elements.form.querySelector(`[name="data_inicio"]`);
                const dataTerminoInput = elements.form.querySelector(`[name="data_termino"]`);
                if (dataInicioInput) dataInicioInput.value = formatarParaInputDate(itemData.data_inicio);
                if (dataTerminoInput) dataTerminoInput.value = formatarParaInputDate(itemData.data_termino);
            }

            if (choicesInstance) {
                const normasToSelect = itemData.normas ? itemData.normas.map(n => String(n.id)) : [];
                choicesInstance.setChoiceByValue(normasToSelect);
            }

        } else {
            // --- MODO NOVO ---
            elements.formTitle.textContent = 'Adicionar Nova';
            elements.form.reset();
            elements.saveNewBtn.style.display = 'block';
            elements.editModeActions.style.display = 'none';
            currentEditingItem = { id: null, type: null };
            
            if (choicesInstance) {
                choicesInstance.clearChoices();
            }
        }
    }

    // Lida com o clique na lista (AGORA LÊ DO CACHE DA MEMÓRIA)
    function setupListListeners(listElement, elements, entityName) {
        listElement.addEventListener('click', async (event) => {
            const listItem = event.target.closest('.list-item');

            if (listItem) {
                const itemId = parseInt(listItem.getAttribute('data-id'));

                let dataList;
                if (entityName === 'auditoria') dataList = cachedAuditorias;
                else if (entityName === 'certificacao') dataList = cachedCertificacoes;
                else if (entityName === 'centro-de-custo') dataList = cachedCentrosDeCusto;

                const itemData = dataList ? dataList.find(item => item.id === itemId) : null;

                if (itemData) {
                    listElement.querySelectorAll('.list-item').forEach(item => item.classList.remove('selected'));
                    listItem.classList.add('selected');

                    await toggleFormMode(elements, itemData, entityName);
                } else {
                    console.error('Não foi possível encontrar o item no cache da lista.');
                }
            }
        });
    }

    // Lida com as ações de Cancelar e Excluir
    function setupActionListeners(elements, entityName) {
        if (elements.cancelEditBtn) {
            elements.cancelEditBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await toggleFormMode(elements, null, entityName);
                const listElement = document.getElementById(`lista-${entityName.replace(/-/g, '_')}s-popup`);
                if (listElement) listElement.querySelectorAll('.list-item').forEach(item => item.classList.remove('selected'));
            });
        }

        if (elements.deleteBtn) {
            elements.deleteBtn.addEventListener('click', async () => {
                if (currentEditingItem.id && currentEditingItem.type === entityName) {
                    const confirmDelete = confirm(`Tem certeza que deseja EXCLUIR este(a) ${entityName.replace(/-/g, ' ')}?`);

                    if (confirmDelete) {
                        let detailUrlSlug = entityName + 's';
                        if (entityName === 'centro-de-custo') detailUrlSlug = 'centros-de-custo';
                        const apiUrl = `${BASE_URL}${detailUrlSlug}/${currentEditingItem.id}/`;

                        const success = await fetchData(apiUrl, 'DELETE');

                        if (success) {
                            alert(`${entityName.replace(/-/g, ' ')} excluído(a) com sucesso!`);
                            await toggleFormMode(elements, null, entityName);
                            initializePage();
                        } else {
                            alert(`Falha ao excluir o(a) ${entityName.replace(/-/g, ' ')}.`);
                        }
                    }
                }
            });
        }
    }


    // --- FUNÇÃO ALTERADA: Lida com POST (Novo) e PUT (Edição) ---
    async function handleFormSubmit(event, initialUrl, choicesInstance) {
        event.preventDefault();
        const form = event.target;

        let entityName = form.id.replace('Form', '').replace(/([A-Z])/g, '-$1').toLowerCase();
        if (entityName === 'centrocusto') entityName = 'centro-de-custo';

        const isEditing = currentEditingItem.id && currentEditingItem.type === entityName;

        const data = {};
        const formData = new FormData(form);
        formData.forEach((value, key) => {
            if (key !== 'normas') data[key] = value;
        });

        const normasIds = choicesInstance.getValue(true);
        if (!normasIds || normasIds.length === 0) {
            alert('Por favor, selecione pelo menos uma norma no Acervo Técnico.');
            return;
        }

        data.normas_ids = normasIds.map(id => parseInt(id, 10));

        let apiUrl = initialUrl;
        let method = 'POST';

        if (isEditing) {
            let detailUrlSlug = entityName + 's';
            if (entityName === 'centro-de-custo') detailUrlSlug = 'centros-de-custo';

            apiUrl = `${BASE_URL}${detailUrlSlug}/${currentEditingItem.id}/`;
            method = 'PUT';
        }

        try {
            const response = await fetch(apiUrl, {
                method: method,
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access')}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                alert(`Item ${isEditing ? 'alterado' : 'salvo'} com sucesso!`);
                form.reset();

                const elementsMap = {
                    'auditoria': auditoriaElements,
                    'certificacao': certificacaoElements,
                    'centro-de-custo': custoElements
                };
                await toggleFormMode(elementsMap[currentEditingItem.type || entityName], null, currentEditingItem.type || entityName);

                await initializePage();
                const modal = form.closest('.modal-overlay');
                if (modal) modal.style.display = 'none';
            } else {
                console.error('Falha na resposta do servidor:', response.status, response.statusText);
                let errorDetail = 'O servidor retornou um erro inesperado.';

                try {
                    const errorData = await response.json();
                    const firstErrorKey = Object.keys(errorData)[0];
                    errorDetail = `${firstErrorKey}: ${errorData[firstErrorKey][0]}`;
                } catch (jsonError) {
                    const errorText = await response.text();
                }

                alert(`Erro ao ${isEditing ? 'alterar' : 'salvar'}: ${errorDetail}`);
            }
        } catch (error) {
            console.error('Erro de conexão:', error);
            alert('Erro de conexão com o servidor. Verifique se o backend está rodando.');
        }
    }

    // Função genérica para controlar a abertura e fecho dos popups
    function setupModal(button, modal) {
        if (button && modal) {
            button.addEventListener('click', () => {
                modal.style.display = 'flex';
                if (modal.id === 'modal-auditoria') toggleFormMode(auditoriaElements, null, 'auditoria');
                if (modal.id === 'modal-certificacao') toggleFormMode(certificacaoElements, null, 'certificacao');
                if (modal.id === 'modal-centro-custo') toggleFormMode(custoElements, null, 'centro-de-custo');
            });
            const closeBtn = modal.querySelector('.close-button');
            if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
            window.addEventListener('click', (event) => {
                if (event.target === modal) modal.style.display = 'none';
            });
        }
    }

    // --- CARREGAMENTO INICIAL E ATRIBUIÇÃO DE EVENTOS ---
    async function initializePage() {
        // As normas já foram carregadas pelo carregarNormasNosSeletores no escopo DOMContentLoaded
        
        const [auditorias, certificacoes, centrosDeCusto, dadosEmpresa] = await Promise.all([
            fetchData('http://127.0.0.1:8000/api/auditorias/'),
            fetchData('http://127.0.0.1:8000/api/certificacoes/'),
            fetchData('http://127.0.0.1:8000/api/centros-de-custo/'),
            fetchData('http://127.0.0.1:8000/api/user/profile/')
        ]);

        cachedAuditorias = auditorias;
        cachedCertificacoes = certificacoes;
        cachedCentrosDeCusto = centrosDeCusto;

        renderItemList(auditorias, 'lista-auditorias');
        renderItemList(certificacoes, 'lista-certificacoes');
        renderItemList(centrosDeCusto, 'lista-centros-de-custos');

        renderPopupList(auditorias, 'lista-auditorias-popup', 'auditoria');
        renderPopupList(certificacoes, 'lista-certificacoes-popup', 'certificacao');
        renderPopupList(centrosDeCusto, 'lista-centros-de-custos-popup', 'centro-de-custo');


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

    // Mapeamento de elementos para inicialização
    const auditoriaElements = { form: auditoriaForm, formTitle: auditoriaFormTitle, saveNewBtn: auditoriaSaveNewBtn, editModeActions: auditoriaEditModeActions, cancelEditBtn: auditoriaCancelEditBtn, deleteBtn: auditoriaDeleteBtn };
    const certificacaoElements = { form: certificacaoForm, formTitle: certificacaoFormTitle, saveNewBtn: certificacaoSaveNewBtn, editModeActions: certificacaoEditModeActions, cancelEditBtn: certificacaoCancelEditBtn, deleteBtn: certificacaoDeleteBtn };
    const custoElements = { form: centroCustoForm, formTitle: custoFormTitle, saveNewBtn: custoSaveNewBtn, editModeActions: custoEditModeActions, cancelEditBtn: custoCancelEditBtn, deleteBtn: custoDeleteBtn };


    // --- ATRIBUIÇÃO DE EVENTOS DE LISTA E AÇÕES ---
    if (auditoriaForm) {
        auditoriaForm.addEventListener('submit', (e) => handleFormSubmit(e, 'http://127.0.0.1:8000/api/auditorias/', normasAuditoriaSelect));
        setupActionListeners(auditoriaElements, 'auditoria');
        setupListListeners(listaAuditoriasPopup, auditoriaElements, 'auditoria');
    }
    if (certificacaoForm) {
        certificacaoForm.addEventListener('submit', (e) => handleFormSubmit(e, 'http://127.0.0.1:8000/api/certificacoes/', normasCertificacaoSelect));
        setupActionListeners(certificacaoElements, 'certificacao');
        setupListListeners(listaCertificacoesPopup, certificacaoElements, 'certificacao');
    }
    if (centroCustoForm) {
        centroCustoForm.addEventListener('submit', (e) => handleFormSubmit(e, 'http://127.0.0.1:8000/api/centros-de-custo/', normasCentroCustoSelect));
        setupActionListeners(custoElements, 'centro-de-custo');
        setupListListeners(listaCustosPopup, custoElements, 'centro-de-custo');
    }


    // --- EXECUÇÃO INICIAL ---
    await carregarNormasNosSeletores(); 
    initializePage(); 
});