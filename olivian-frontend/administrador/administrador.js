// A URL base da sua API
const API_BASE_URL = 'http://localhost:8000/api';

// =========================================================
// FUNÇÃO POP-UP CUSTOMIZADO (Substitui alert())
// =========================================================

function showCustomAlert(message) {
    const overlay = document.getElementById('custom-alert-overlay');
    const messageElement = document.getElementById('alert-message');
    const okButton = document.getElementById('alert-ok-btn');

    if (!overlay || !messageElement || !okButton) {
        // Fallback: se o custom popup não existir, usa o alert nativo
        alert(message);
        return;
    }

    messageElement.textContent = message;
    overlay.classList.remove('hidden');

    // Listener para fechar o pop-up
    okButton.onclick = () => {
        overlay.classList.add('hidden');
    };
    
    // Fecha também se clicar fora do conteúdo
    overlay.onclick = (e) => {
        if (e.target.id === 'custom-alert-overlay') {
            overlay.classList.add('hidden');
        }
    };
}

// =========================================================
// LÓGICA PRINCIPAL DA PÁGINA
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    // Seletores necessários para ambas as telas
    const tbody = document.getElementById('tbody-usuarios');
    const filterUser = document.getElementById('filter-user');
    const alterarBtn = document.getElementById('alterar-acessos');
    const aplicarBtn = document.getElementById('aplicar-alteracoes');
    // REMOVIDO: const cancelarBtn, pois o botão foi removido do HTML
    const tableContainer = document.querySelector('.permissoes-container');
    const columnHeaders = document.querySelectorAll('.column-with-hover');
    
    // ELEMENTOS ESTRUTURAIS (cruciais para o fluxo ADM/Comum)
    const boasVindasElement = document.getElementById('boas-vindas-admin'); 
    const resumoPermissoesElement = document.getElementById('minhas-permissoes-resumo'); 
    const tabelaGerenciamentoContainer = document.getElementById('tabela-gerenciamento-container'); 

    // Variáveis globais para gerenciar o estado
    let originalData = [];
    let usersData = [];
    const permissoesAdmin = [
        'pode_gerenciar_auditorias', 
        'pode_gerenciar_certificacoes', 
        'pode_gerenciar_centros_de_custo', 
        'pode_gerenciar_comentarios', 
        'pode_gerenciar_precos', 
        'pode_gerenciar_favoritos'
    ];

    // =========================================================
    // FUNÇÕES DE UTILIDADE E ESTADO
    // =========================================================

    function getAuthHeaders() {
        const token = localStorage.getItem('access');
        if (!token || token === 'undefined' || token === 'null') {
            console.error("Token de autenticação ausente. Falha na requisição.");
            return null;
        }
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }
    
    /**
     * Define o estado de edição (usado apenas para ADM).
     */
    function setEditable(isEditable) {
        if (!tableContainer || !alterarBtn || !aplicarBtn) return;
        
        tableContainer.classList.toggle('permissions-blocked', !isEditable);
        document.querySelectorAll('.permission-checkbox, .select-all-row, .select-all-column').forEach(checkbox => {
            if (checkbox) {
                checkbox.disabled = !isEditable;
            }
        });
        
        // Exibe os botões de controle
        aplicarBtn.style.display = isEditable ? 'inline-block' : 'none';
        alterarBtn.style.display = isEditable ? 'none' : 'inline-block';
    }


    // =========================================================
    // FUNÇÕES DE RENDERIZAÇÃO
    // =========================================================

    // FUNÇÕES DE RENDERIZAÇÃO ADM (Múltiplos Usuários)
    function renderColumnHeaders() {
        const columnHeaders = document.querySelectorAll('.column-with-hover');
        columnHeaders.forEach((header) => {
            const oldLabel = header.querySelector('.column-select-control');
            if (oldLabel) {
                const oldCheckbox = oldLabel.querySelector('.select-all-column');
                if (oldCheckbox) oldCheckbox.removeEventListener('change', handleColumnSelect);
                oldLabel.remove();
            }

            const label = document.createElement('label');
            label.classList.add('custom-checkbox', 'column-select-control');
            const hiddenCheckbox = document.createElement('input');
            hiddenCheckbox.type = 'checkbox';
            hiddenCheckbox.classList.add('hidden-checkbox', 'select-all-column');
            const displaySpan = document.createElement('span');
            displaySpan.classList.add('checkbox-display');

            label.appendChild(hiddenCheckbox);
            label.appendChild(displaySpan);
            header.appendChild(label);
            
            hiddenCheckbox.addEventListener('change', handleColumnSelect);
            hiddenCheckbox.disabled = true;
            
            header.classList.add('column-with-hover');
        });
    }

    function renderTable(data) {
        tbody.innerHTML = '';
        data.forEach((user) => {
            const row = tbody.insertRow();
            row.dataset.userId = user.user_id;

            row.insertCell().innerHTML = `
                <label class="custom-checkbox">
                    <input type="checkbox" class="hidden-checkbox select-all-row" data-user-id="${user.user_id}" disabled>
                    <span class="checkbox-display"></span>
                </label>
            `;

            const cellUser = row.insertCell();
            const userNameDisplay = user.nome_completo && user.nome_completo.trim() ? user.nome_completo : user.username;
            
            // Ícone Font Awesome
            cellUser.innerHTML = `
                <div class="user-display">
                    <i class="fa-solid fa-user user-icon-fa"></i>
                    <span class="user-name">${userNameDisplay}</span>
                </div>
            `;

            permissoesAdmin.forEach(permissao => {
                const cellPermission = row.insertCell();
                const isChecked = user[permissao];

                cellPermission.innerHTML = `
                    <label class="custom-checkbox">
                        <input type="checkbox" class="hidden-checkbox permission-checkbox" 
                               data-user-id="${user.user_id}" 
                               data-permission="${permissao}"
                               ${isChecked ? 'checked' : ''} disabled>
                        <span class="checkbox-display"></span>
                    </label>
                `;
            });
        });
        addCheckboxListeners();
    }
    
    // FUNÇÃO DE RENDERIZAÇÃO COMUM (Única Linha)
    function renderSelfPermissionTable(userProfile) {
        tbody.innerHTML = '';
        
        document.querySelectorAll('th[data-permissao]').forEach(th => th.classList.remove('column-with-hover'));
        document.querySelectorAll('th .custom-checkbox').forEach(el => el.remove());

        const userData = { user_id: userProfile.id, nome_completo: userProfile.nome_completo, username: userProfile.email, ...userProfile.permissoes };
        const row = tbody.insertRow();
        
        row.insertCell().innerHTML = ''; 
        
        const cellUser = row.insertCell();
        const userNameDisplay = userData.nome_completo && userData.nome_completo.trim() ? userData.nome_completo : userData.username;
        
        // Ícone Font Awesome
        cellUser.innerHTML = `
            <div class="user-display">
                <i class="fa-solid fa-user user-icon-fa"></i>
                <span class="user-name">${userNameDisplay}</span>
            </div>
        `;

        permissoesAdmin.forEach(permissao => {
            const cellPermission = row.insertCell();
            const isChecked = userData[permissao];
            
            cellPermission.innerHTML = isChecked 
                ? '<span style="color: #4CAF50; font-size: 1.2em;">●</span>'
                : '<span style="color: #ccc; font-size: 1.2em;">○</span>';
            cellPermission.style.textAlign = 'center';
        });
    }

    // FUNÇÕES DE LISTENERS
    function addCheckboxListeners() {
        tbody.querySelectorAll('.permission-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const userId = parseInt(e.target.dataset.userId);
                const permission = e.target.dataset.permission;
                const userInState = usersData.find(u => u.user_id === userId);
                if (userInState) userInState[permission] = e.target.checked;
            });
        });
        tbody.querySelectorAll('.select-all-row').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const row = e.target.closest('tr');
                const isChecked = e.target.checked;
                const userId = parseInt(e.target.dataset.userId);
                const userInState = usersData.find(u => u.user_id === userId);
                if (!userInState) return;
                row.querySelectorAll('.permission-checkbox').forEach(permissionCb => {
                    permissionCb.checked = isChecked;
                    userInState[permissionCb.dataset.permission] = isChecked;
                });
            });
        });
    }

    function handleColumnSelect(e) {
        const isChecked = e.target.checked;
        const permissionKey = e.target.closest('[data-permissao]').dataset.permissao;
        usersData.forEach(user => {
            user[permissionKey] = isChecked;
            const row = tbody.querySelector(`tr[data-user-id="${user.user_id}"]`);
            if (row && row.style.display !== 'none') {
                const checkbox = row.querySelector(`.permission-checkbox[data-permission="${permissionKey}"]`);
                if (checkbox) checkbox.checked = isChecked;
            }
        });
    }

    function filterTable() {
        if (!filterUser) return;
        const userValue = filterUser.value.toLowerCase();
        tbody.querySelectorAll('tr').forEach(row => {
            const userNameElement = row.cells[1];
            const userName = userNameElement.textContent.toLowerCase();
            row.style.display = userName.includes(userValue) ? '' : 'none';
        });
        setEditable(aplicarBtn && aplicarBtn.style.display === 'inline-block'); 
    }


    // =========================================================
    // FUNÇÕES DE COMUNICAÇÃO COM A API E FLUXO DINÂMICO
    // =========================================================

    /**
     * Define o fluxo da página (ADM ou Comum) e atualiza o cabeçalho.
     */
    async function initPage() {
        const headers = getAuthHeaders();
        if (!headers) return;

        try {
            const response = await fetch(`${API_BASE_URL}/user/profile/`, { method: 'GET', headers: headers });
            if (!response.ok) {
                if (boasVindasElement) boasVindasElement.textContent = "Erro ao Carregar Permissões";
                return;
            }

            const userProfile = await response.json();
            const permissoes = userProfile.permissoes;
            const nomeCompleto = userProfile.nome_completo && userProfile.nome_completo.trim() ? userProfile.nome_completo.trim() : userProfile.email;
            
            const isSuperAdmin = permissoes.pode_gerenciar_auditorias === true; 
            
            // 1. Atualiza o TÍTULO DA PÁGINA
            if (boasVindasElement) boasVindasElement.innerHTML = `${nomeCompleto} ${isSuperAdmin ? '<span style="font-size: 0.9em; color: #9D3972; font-weight: 500;">(ADM)</span>' : ''}`;
            
            // 2. LÓGICA DINÂMICA: ADM vs COMUM
            if (isSuperAdmin) {
                // MODO ADM: Exibe a interface de gerenciamento
                if (tabelaGerenciamentoContainer) tabelaGerenciamentoContainer.style.display = 'block';
                if (filterUser) {
                    filterUser.style.display = 'inline-block';
                    filterUser.readOnly = false;
                    filterUser.placeholder = 'Digite o nome do usuário';
                }
                if (resumoPermissoesElement) resumoPermissoesElement.style.display = 'none';

                fetchAdminUsers(); // Carrega lista completa para ADM
            } else {
                // MODO COMUM: Exibe a visualização de permissão própria (e oculta controles ADM)
                if (tabelaGerenciamentoContainer) tabelaGerenciamentoContainer.style.display = 'block'; 
                if (filterUser) filterUser.style.display = 'none'; 
                if (alterarBtn) alterarBtn.style.display = 'none'; 
                if (aplicarBtn) aplicarBtn.style.display = 'none';
                if (resumoPermissoesElement) resumoPermissoesElement.style.display = 'none';
                
                renderSelfPermissionTable(userProfile); // Renderiza apenas a linha própria
            }

        } catch (error) {
            console.error("Erro fatal na inicialização da página:", error);
            if (boasVindasElement) {
                boasVindasElement.textContent = "Usuário Não Identificado";
            }
        }
    }


    /**
     * Carrega os usuários para a tabela de gerenciamento (apenas ADM).
     */
    async function fetchAdminUsers() {
        const headers = getAuthHeaders();
        if (!headers) return;

        try {
            const response = await fetch(`${API_BASE_URL}/admin-permissoes/`, { method: 'GET', headers: headers });
            
            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData.detail || 'Erro ao carregar lista de usuários.';
                
                if (response.status === 403) {
                    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#dc3545; padding: 20px;">${errorMessage}</td></tr>`;
                    if (alterarBtn) alterarBtn.style.display = 'none';
                    setEditable(false);
                    return;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            originalData = JSON.parse(JSON.stringify(data));
            usersData = data;

            renderColumnHeaders();
            renderTable(usersData);
            
            // Inicia no modo de visualização 
            setEditable(false);
            
            // Garante que o botão 'Alterar Acessos' esteja visível no modo de visualização ADM
            if (alterarBtn) alterarBtn.style.display = 'inline-block'; 

        } catch (error) {
            console.error("Erro na requisição da API:", error);
            if (tabelaGerenciamentoContainer) tabelaGerenciamentoContainer.style.display = 'none';
        }
    }

    /**
     * Função para aplicar alterações em massa (PUT na API)
     */
    async function applyBulkUpdate() {
        const headers = getAuthHeaders();
        if (!headers) return;
        
        const payload = usersData.map(user => {
            const data = { user_id: user.user_id };
            permissoesAdmin.forEach(p => { data[p] = user[p]; });
            return data;
        });

        try {
            const response = await fetch(`${API_BASE_URL}/admin-permissoes/bulk-update/`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                // Substituto do alert() nativo em caso de erro
                showCustomAlert(errorData.detail || 'Erro ao aplicar alterações.');
                throw new Error(errorData.detail || 'Erro ao aplicar alterações.');
            }

            await fetchAdminUsers();
            // SUBSTITUIÇÃO AQUI: Chamando o pop-up customizado em caso de sucesso
            showCustomAlert('Alterações aplicadas com sucesso! 🎉'); 
            setEditable(false);
            if(filterUser) filterUser.value = '';
            filterTable();

        } catch (error) {
            console.error("Erro no envio do PUT:", error);
            // O showCustomAlert já foi chamado acima em caso de erro de API
            if (!error.message.includes('Erro ao aplicar alterações')) {
                 showCustomAlert(`Falha ao salvar as alterações: ${error.message}`);
            }
            setEditable(true);
        }
    }

    
    // =========================================================
    // TRATAMENTO DE EVENTOS DE BOTÕES
    // =========================================================

    if (alterarBtn) alterarBtn.addEventListener('click', () => {
        setEditable(true);
    });

    if (aplicarBtn) aplicarBtn.addEventListener('click', applyBulkUpdate);

    // --- Inicialização ---
    if(filterUser) filterUser.addEventListener('input', filterTable);
    initPage();
});