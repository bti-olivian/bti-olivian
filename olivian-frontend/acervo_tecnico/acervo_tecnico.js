// A URL base da API continua a mesma
const API_BASE_URL = 'http://127.0.0.1:8000/api';

document.addEventListener('DOMContentLoaded', () => {
    // --- VARIÁVEIS GLOBAIS E SELETORES ---
    let todasAsNormas = [], normaAtualId = null, infoUsuario = null;

    const accessToken = localStorage.getItem('access'); 

    if (!accessToken) { 
        console.error('Utilizador não autenticado. Redirecionando para login.'); 
        window.location.href = '../login/login.html'; 
        return; 
    }

    const [modal, openBtnIcon, closeButtons, commentForm, commentCountSpan, listaComentariosContainer, filtroInput, listaNormasDiv, favoriteBtn, filtroFavoritasBtn, filtroTodasBtn, filtroDesatualizadasBtn, filtroComentadasBtn] = [
        document.getElementById('commentModal'), document.getElementById('openCommentModalIcon'), document.querySelectorAll('.close-button'),
        document.getElementById('commentForm'), document.getElementById('comment-count'), document.getElementById('lista-comentarios-popup'),
        document.getElementById('filtro-normas-input'), document.querySelector('.normas-list-container'), document.getElementById('favorite-btn'),
        document.getElementById('filtro-favoritas-btn'), document.getElementById('filtro-todas-btn'), document.getElementById('filtro-desatualizadas-btn'),
        document.getElementById('filtro-comentadas-btn')
    ];
    
    // --- FUNÇÃO PARA CONTROLAR VISIBILIDADE DO CAMPO DESCRIÇÃO ---
    function toggleDescriptionField(show) {
        const descriptionGroup = document.querySelector('#commentForm .form-group');
        if (descriptionGroup) {
            descriptionGroup.style.display = show ? 'block' : 'none';
        }
    }

    // --- FUNÇÃO PARA RESETAR O ESTADO DO FORMULÁRIO ---
    function resetCommentFormState() {
        commentForm.reset();
        commentForm.dataset.mode = 'create';
        delete commentForm.dataset.commentId;
        delete commentForm.dataset.commentPaiId; 
        
        const saveBtn = document.getElementById('saveCommentBtn');
        saveBtn.classList.remove('editing');
        saveBtn.textContent = 'SALVAR COMENTÁRIO'; 
        
        document.getElementById('commentDescription').placeholder = 'Ex: Projeto xyz'; 
        document.getElementById('commentText').placeholder = 'Digite aqui o seu comentário';
        
        toggleDescriptionField(true); 
    }

    // --- LÓGICA DO POPUP ---
    async function openModal() { 
        if (modal) { 
            if (!infoUsuario) await carregarDadosUsuario();

        // Garante que o ID da norma está atualizado (do último clique na lista)
        const normaAtual = todasAsNormas.find(n => n.id == normaAtualId);

        if (normaAtual && normaAtualId !== null) {
            // Atualiza o título do modal com os dados da norma atualmente selecionada
            const tituloNormaCompleto = `${normaAtual.norma}`; // Removemos a organização do título
            document.getElementById('norma-comentada-titulo').textContent = tituloNormaCompleto;
        } else {
             // Limpa ou define um fallback se nenhuma norma estiver selecionada
             document.getElementById('norma-comentada-titulo').textContent = '';
        }
        
        // Garante que os comentários corretos serão carregados
        await carregarComentariosDoPopup(); 
        
        modal.style.display = 'flex'; 
        } 
    }
    function closeModal() { 
        if (modal) modal.style.display = 'none'; 
        resetCommentFormState(); 
    }

    // --- FUNÇÕES DE API ---
    async function fetchData(url, options = {}) {
        try {
            const response = await fetch(url, { 
                ...options, 
                headers: { 
                    'Authorization': `Bearer ${accessToken}`, 
                    'Content-Type': 'application/json', 
                    ...options.headers 
                } 
            });
            if (response.status === 401 || response.status === 403) {
                console.error("Token expirado ou inválido. Redirecionando.");
                window.location.href = '../login/login.html';
                return null;
            }
            if (!response.ok) { 
                const errorText = await response.text();
                console.error(`Erro na API ${url} (Status: ${response.status}):`, errorText); 
                return null; 
            }
            return response.status === 204 ? true : await response.json();
        } catch (error) { 
            console.error(`Erro de conexão com ${url}:`, error); 
            return null; 
        }
    }
    
    // --- FUNÇÕES DE RENDERIZAÇÃO E LÓGICA PRINCIPAL ---
    
    function formatarCNPJ(cnpj) {
        if (!cnpj) return 'N/A';
        return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }

    async function carregarDadosUsuario() {
        const profileData = await fetchData(`${API_BASE_URL}/user/profile/`);
        if (profileData) {
            infoUsuario = profileData;
            document.querySelector('.client-profile').style.opacity = 1;
            document.querySelector('.user-profile').style.opacity = 1;
            document.getElementById('client-name').textContent = profileData.cliente.empresa;
            document.getElementById('client-cnpj').textContent = formatarCNPJ(profileData.cliente.cnpj);
            document.getElementById('user-name').textContent = `Olá, ${profileData.nome_completo}`;
            document.getElementById('user-email').textContent = profileData.email;
            const dataAtual = new Date();
            document.getElementById('user-date').textContent = `${dataAtual.toLocaleDateString('pt-BR')} - ${dataAtual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        }
    }

    async function carregarMetricas() {
        const metrics = await fetchData(`${API_BASE_URL}/dashboard/metrics/`);
        if (metrics) {
            document.querySelectorAll('.card-number').forEach(el => el.style.opacity = 1);
            document.getElementById('total-normas').textContent = metrics.total_normas;
            document.getElementById('normas-comentadas').textContent = metrics.normas_comentadas;
            document.getElementById('normas-favoritas').textContent = metrics.normas_favoritas;
            document.getElementById('dias-renovacao').textContent = metrics.dias_renovacao;
            document.getElementById('risco-nao-conformidade').textContent = metrics.risco_nao_conformidade;
        }
    }

    function renderizarListaNormas(normas) {
        listaNormasDiv.innerHTML = '';
        if (!normas || normas.length === 0) {
            listaNormasDiv.innerHTML = '<p style="text-align:center;font-size:12px;color:#888;">Nenhuma norma encontrada.</p>';
            return;
        }
        const lista = document.createElement('ul');
        lista.style.cssText = "padding:0; margin:0; list-style-type:none;";
        normas.forEach(norma => {
            const statusClass = norma.status_atualizado === "ATUALIZADO" ? 'status-atualizado' : 'status-desatualizado';
            const isFavoritaClass = norma.is_favorita ? 'favorita' : '';
            const listItem = document.createElement('li');
            listItem.className = 'norma-item';
            listItem.dataset.normaId = norma.id;
            listItem.innerHTML = `<div class="norma-item-content"><span class="fav-icon-list ${isFavoritaClass}"><svg class="favs-list-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></span><span class="status-bolinha ${statusClass}"></span><span class="norma-codigo">${norma.norma}</span></div>`;
            lista.appendChild(listItem);
        });
        listaNormasDiv.appendChild(lista);
        const itemAtivo = lista.querySelector(`.norma-item[data-norma-id='${normaAtualId}']`);
        if (itemAtivo) itemAtivo.classList.add('active');
    }
    
    async function carregarNormas() {
        const normas = await fetchData(`${API_BASE_URL}/minhas-normas/`);
        if (normas) {
            normas.sort((a, b) => `${a.organizacao} ${a.norma}`.localeCompare(`${b.organizacao} ${b.nomeNormaCompleto}`));
            todasAsNormas = normas;
            renderizarListaNormas(todasAsNormas);
            if (todasAsNormas.length > 0 && !normaAtualId) {
                await carregarDetalhesNorma(todasAsNormas[0].id);
            }
        }
    }

    async function carregarDetalhesNorma(normaId) {
        normaAtualId = normaId;
        const norma = await fetchData(`${API_BASE_URL}/normas/${normaId}/`);
        if (norma) {
            const formatarData = (data) => data ? new Date(data + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A';
            document.getElementById('norma-titulo').textContent = `${norma.norma}`;
            document.getElementById('norma-organizacao').textContent = norma.organizacao;
            document.getElementById('norma-descricao').textContent = norma.titulo || 'Descrição não disponível.';
            document.getElementById('norma-idioma').textContent = `Idioma: ${norma.idioma.charAt(0).toUpperCase() + norma.idioma.slice(1)}`;
            document.getElementById('norma-revisao-atual').textContent = `Revisão atual: ${formatarData(norma.revisao_atual)}`;
            document.getElementById('norma-sua-revisao').textContent = `Sua Revisão: ${formatarData(norma.sua_revisao)}`;
            const statusElement = document.getElementById('norma-status');
            const statusBolinha = document.getElementById('norma-status-bolinha');
            statusElement.textContent = norma.status_atualizado;
            statusBolinha.className = 'status-bolinha';
            statusBolinha.classList.add(norma.status_atualizado === "ATUALIZADO" ? 'status-atualizado' : 'status-desatualizado');
            statusElement.style.color = norma.status_atualizado === "ATUALIZADO" ? '#28a745' : '#dc3545';
            document.getElementById('norma-observacoes').textContent = norma.observacoes || 'Sem observações.';
            favoriteBtn.classList.toggle('favorita', norma.is_favorita);
            commentCountSpan.textContent = norma.comentarios_count;
            document.querySelector('.norma-details-container').style.display = 'block';
            document.querySelectorAll('.norma-item.active').forEach(i => i.classList.remove('active'));
            const itemAtivo = document.querySelector(`.norma-item[data-norma-id='${normaId}']`);
            if(itemAtivo) itemAtivo.classList.add('active');
        }
    }

    // --- FUNÇÃO PRINCIPAL DE RENDERIZAÇÃO COM LÓGICA ANINHADA (FINAL CORRIGIDA) ---
    function renderizarComentarios(comentarios, parentId = null, nestingLevel = 0) {
    const comentariosFiltrados = comentarios.filter(c => {
        const comentarioPaiId = c.comentario_pai ? (c.comentario_pai.id || c.comentario_pai) : null;
        return comentarioPaiId == parentId;
    });
    
    let htmlContent = '';
    
    comentariosFiltrados.forEach(comentario => {
        const dataFormatada = new Date(comentario.data_criacao).toLocaleString('pt-BR');
        
        let actionsHtml = `<button class="action-btn btn-reply" title="Responder ao comentário" data-comment-id="${comentario.id}">Responder</button>`;

        if (infoUsuario && comentario.usuario === infoUsuario.id) {
            actionsHtml += `
                <button class="action-btn btn-edit" title="Alterar" data-comment-id="${comentario.id}">&#x270E;</button>
                <button class="action-btn btn-delete" title="Excluir" data-comment-id="${comentario.id}">&#x1F5D1;</button>`;
        }
        
        let indentStyle = ''; 
        let indentStyleActions = ''; 
        
        // CÁLCULO DE RECÚO E LARGURA
        if (nestingLevel > 0) {
            // Lógica incremental para o recuo
            const baseMargin = 25; 
            const paddingIncremento = 30;
            const marginValue = baseMargin + ((nestingLevel - 1) * paddingIncremento);
            const widthAdjustValue = marginValue; 
            
            // 🎯 CRÍTICO: Variável CSS FIXA em 40px para o desenho da linha.
            const variableValueFixed = 40; 

            // FILHO/NETO: Injeta recuo/margem e largura calculada.
            const calculatedStyles = `padding-left: 12px; margin-left: ${marginValue}px; width: calc(100% - ${widthAdjustValue}px); --comment-reply-margin: ${variableValueFixed}px;`;
            indentStyle = `style="${calculatedStyles}"`;
            
            // Ações: Mesma lógica de margem/largura, mais alinhamento.
            indentStyleActions = `style="margin-left: ${marginValue}px; width: calc(100% - ${widthAdjustValue}px); margin-top: 0; text-align: right;"`; 

        } else {
             // PAI (Nível 0): Sem margem lateral de recuo.
             indentStyle = 'style="padding-left: 12px; margin-left: 0 !important; width: 100% !important; --comment-reply-margin: 20px;"'; 
             
             // Ações PAI: Largura total e alinhamento à direita.
             indentStyleActions = 'style="margin-left: 0 !important; width: 100% !important; text-align: right;"';
        }
        
        const respostasHtml = renderizarComentarios(comentarios, comentario.id, nestingLevel + 1);
        
        // ... (HTML do título PAI mantido) ...
        let tituloComentarioHtml = '';
        if (nestingLevel === 0 && comentario.descricao && comentario.descricao.trim() !== '') {
            tituloComentarioHtml = `<span class="comentario-titulo-pai"> &bull; ${comentario.descricao}</span>`;
        }

        const comentarioItemHtml = `
            <div class="comentario-item" data-comment-id="${comentario.id}" data-parent-id="${comentario.comentario_pai ? (comentario.comentario_pai.id || comentario.comentario_pai) : 'null'}" ${indentStyle}>
                <div class="comentario-header">
                    <span class="comentario-autor">${comentario.usuario_nome || 'Utilizador'}</span>
                    ${tituloComentarioHtml}
                    <span class="comentario-data">${dataFormatada}</span>
                </div>
                ${nestingLevel === 0 ? `<span class="nome-norma">${document.getElementById('norma-comentada-titulo').textContent}</span>` : ''}
                
                <div class="comentario-texto">${comentario.comentario}</div>
                
            </div>
        `;

        if (parentId === null) {
            // Comentário RAIZ
            htmlContent += `
                <div class="thread-container" data-thread-id="${comentario.id}" data-comment-id="${comentario.id}">
                    ${comentarioItemHtml}
                    <div class="comentario-actions" data-comment-id="${comentario.id}" ${indentStyleActions}>${actionsHtml}</div> 
                    ${respostasHtml} 
                </div>
            `;
        } else {
            htmlContent += comentarioItemHtml;
            // Ações FILHO/NETO: Usa o estilo mesclado
            htmlContent += `<div class="comentario-actions" data-comment-id="${comentario.id}" ${indentStyleActions}>${actionsHtml}</div>`;
            
            htmlContent += respostasHtml; 
        }

    });
    
    return htmlContent;
    }


    // --- FUNÇÃO CARREGAR COMENTÁRIOS DO POPUP (MANTIDA) ---
    async function carregarComentariosDoPopup() {
        resetCommentFormState(); 
        
        listaComentariosContainer.innerHTML = '<p>A carregar comentários...</p>';
        if (!normaAtualId) {
            listaComentariosContainer.innerHTML = '<p>Selecione uma norma para ver os comentários.</p>';
            return;
        }
        
        const comentariosResponse = await fetchData(`${API_BASE_URL}/normas/${normaAtualId}/comentarios/`);
        listaComentariosContainer.innerHTML = '';

        const comentarios = comentariosResponse && Array.isArray(comentariosResponse) ? comentariosResponse : (comentariosResponse && comentariosResponse.results ? comentariosResponse.results : null);

        if (!comentarios || comentarios.length === 0) {
            listaComentariosContainer.innerHTML = '<p style="text-align:center;color:#888;margin-top:20px;">Nenhum comentário para esta norma ainda.</p>';
        } else {
            
            // Separa os comentários raiz para ordenação
            const comentariosRaiz = comentarios.filter(c => c.comentario_pai === null || c.comentario_pai === undefined);
            const respostas = comentarios.filter(c => c.comentario_pai !== null && c.comentario_pai !== undefined);

            // Ordena as threads principais do MAIS NOVO (topo) para o MAIS ANTIGO (baixo)
            comentariosRaiz.sort((a, b) => new Date(b.data_criacao) - new Date(a.data_criacao));

            // Recombina para renderização (a função renderizarComentarios fará o threading)
            const listaFinal = [...comentariosRaiz, ...respostas];

            listaComentariosContainer.innerHTML = renderizarComentarios(listaFinal, null, 0); 
        }
    }


    // --- FUNÇÃO PARA PREENCHER FORMULÁRIO PARA EDIÇÃO (MANTIDA) ---
    function prepareEdit(commentId) {
        // Busca o item de comentário, não o bloco de ações
        const itemToEdit = listaComentariosContainer.querySelector(`.comentario-item[data-comment-id="${commentId}"]`);
        if (!itemToEdit) return;
        
        const comentarioDescricaoElement = itemToEdit.querySelector('.comentario-titulo-pai');
        // O valor da descrição está após " • "
        const descricao = comentarioDescricaoElement ? comentarioDescricaoElement.textContent.replace(' • ', '').trim() : ''; 
        const comentarioText = itemToEdit.querySelector('.comentario-texto').textContent.trim();
        
        document.getElementById('commentDescription').value = descricao;
        document.getElementById('commentText').value = comentarioText;
        
        commentForm.dataset.mode = 'edit';
        commentForm.dataset.commentId = commentId;
        delete commentForm.dataset.commentPaiId; 
        
        const saveBtn = document.getElementById('saveCommentBtn');
        saveBtn.textContent = 'Salvar Alteração';
        saveBtn.classList.add('editing');

        toggleDescriptionField(true); // Garante que o campo Descrição está visível
        document.querySelector('.modal-col-form').scrollIntoView({ behavior: 'smooth' });
    }

    // --- FUNÇÃO PARA PREPARAR FORMULÁRIO PARA RESPOSTA (MANTIDA) ---
    function prepareReply(commentId) {
        // Busca o item de comentário, não o bloco de ações
        const itemToEdit = listaComentariosContainer.querySelector(`.comentario-item[data-comment-id="${commentId}"]`);
        if (!itemToEdit) return;

        const parentAuthor = itemToEdit.querySelector('.comentario-autor').textContent.trim();

        resetCommentFormState();
        commentForm.dataset.mode = 'reply';
        commentForm.dataset.commentPaiId = commentId;
        
        // CRÍTICO: ESCONDE o campo Descrição
        toggleDescriptionField(false);
        
        document.getElementById('commentDescription').value = ''; 
        document.getElementById('commentText').placeholder = `Responda ao comentário de ${parentAuthor}...`;

        const saveBtn = document.getElementById('saveCommentBtn');
        saveBtn.textContent = 'ENVIAR RESPOSTA'; 
        
        document.querySelector('.modal-col-form').scrollIntoView({ behavior: 'smooth' });
    }

    async function toggleFavorito() {
        if (!normaAtualId) return;
        const response = await fetchData(`${API_BASE_URL}/normas/${normaAtualId}/favoritar/`, { method: 'POST' });
        if (response) {
            await carregarNormas();
            await carregarMetricas();
            await carregarDetalhesNorma(normaAtualId);
        }
    }

    // --- EVENT LISTENERS (MANTIDOS) ---
    if (openBtnIcon) openBtnIcon.addEventListener('click', openModal);
    closeButtons.forEach(button => button.addEventListener('click', closeModal));
    window.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });

    // --- MANIPULADOR DE SUBMISSÃO (MANTIDO) ---
    commentForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const descricao = document.getElementById('commentDescription').value;
        const comentario = document.getElementById('commentText').value;

        if (!comentario.trim()) { alert('O campo "Comentário" não pode estar vazio.'); return; }

        const mode = commentForm.dataset.mode || 'create';
        const commentId = commentForm.dataset.commentId;
        const commentPaiId = commentForm.dataset.commentPaiId; 
        
        let url = '';
        let method = '';
        
        let bodyData = { 
            comentario: comentario, 
            norma: normaAtualId, 
        };
        
        // 1. Define a URL e o método
        if (mode === 'edit' && commentId) {
            url = `${API_BASE_URL}/comentarios/${commentId}/`;
            method = 'PUT';
            bodyData.descricao = descricao; 

        } else { // 'create' ou 'reply'
            url = `${API_BASE_URL}/normas/${normaAtualId}/comentarios/`;
            method = 'POST';
            
            if (mode === 'reply' && commentPaiId) {
                bodyData.comentario_pai = commentPaiId; 
                bodyData.descricao = ''; 
            } else { // 'create'
                bodyData.descricao = descricao;
                delete bodyData.comentario_pai; 
            }
        }

        const data = await fetchData(url, { 
            method: method, 
            body: JSON.stringify(bodyData)
        });
        
        if (data) {
            resetCommentFormState(); 
            
            await carregarComentariosDoPopup();
            await carregarDetalhesNorma(normaAtualId);
            await carregarMetricas();
        } else {
            alert(`Erro ao ${mode === 'edit' ? 'alterar' : 'guardar'} comentário. Verifique a API.`);
        }
    });

    // --- Event Listener para Ações (Funcionalidade - MANTIDO) ---
    listaComentariosContainer.addEventListener('click', async (event) => {
        const target = event.target.closest('.action-btn'); 
        if (!target) return;

        // O ID é pego do bloco de ações, que sempre acompanha o comentário.
        const actionBlock = target.closest('.comentario-actions');
        if (!actionBlock) return;
        
        const commentId = actionBlock.dataset.commentId; // Pega o ID do bloco de ações

        if (target.classList.contains('btn-delete')) {
            if (confirm('Tem a certeza que deseja excluir este comentário?')) {
                const success = await fetchData(`${API_BASE_URL}/comentarios/${commentId}/`, { method: 'DELETE' });
                if (success) {
                    await carregarComentariosDoPopup();
                    await carregarDetalhesNorma(normaAtualId);
                    await carregarMetricas();
                } else {
                    alert('Não foi possível excluir o comentário.');
                }
            }
        } 
        else if (target.classList.contains('btn-edit')) {
            prepareEdit(commentId); 
        } 
        else if (target.classList.contains('btn-reply')) {
            prepareReply(commentId);
        }
    });

    listaNormasDiv.addEventListener('click', (event) => {
        const normaItem = event.target.closest('.norma-item');
        if (normaItem) carregarDetalhesNorma(normaItem.dataset.normaId);
    });

    filtroInput.addEventListener('input', () => {
        const termo = filtroInput.value.toLowerCase();
        const filtradas = todasAsNormas.filter(n => `${n.organizacao} ${n.norma} ${n.titulo || ''}`.toLowerCase().includes(termo));
        renderizarListaNormas(filtradas);
    });

    favoriteBtn.addEventListener('click', toggleFavorito);
    filtroFavoritasBtn.addEventListener('click', () => renderizarListaNormas(todasAsNormas.filter(n => n.is_favorita)));
    filtroTodasBtn.addEventListener('click', () => renderizarListaNormas(todasAsNormas));
    filtroDesatualizadasBtn.addEventListener('click', () => renderizarListaNormas(todasAsNormas.filter(n => n.status_atualizado === 'DESATUALIZADO')));
    filtroComentadasBtn.addEventListener('click', () => renderizarListaNormas(todasAsNormas.filter(n => n.comentarios_count > 0)));

    // --- INICIALIZAÇÃO DA PÁGINA ---
    async function init() {
        await carregarDadosUsuario();
        await carregarMetricas();
        await carregarNormas();
    }
    
    init();
});