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

    // --- FUNÇÃO PRINCIPAL DE RENDERIZAÇÃO COM LÓGICA ANINHADA (CORRIGIDA) ---
    function renderizarComentarios(comentarios, parentId = null, nestingLevel = 0) {
        // 🎯 CRÍTICO: Usa a lógica de filtro PLANA, que é a mais segura para evitar falhas de serialização complexa.
        const comentariosFiltrados = comentarios.filter(c => {
            // Se c.comentario_pai é um objeto {id: X} ou um ID simples, extrai-o. Se é null, mantém null.
            const comentarioPaiId = c.comentario_pai ? (c.comentario_pai.id || c.comentario_pai) : null;
            
            // Compara o ID extraído com o parentId (que é null no nível raiz ou um ID de comentário nos filhos)
            return comentarioPaiId === parentId;
        });
        
        let htmlContent = '';
        
        const nomeNormaCompleto = `${document.getElementById('norma-organizacao').textContent} ${document.getElementById('norma-titulo').textContent}`;

        comentariosFiltrados.forEach(comentario => {
            const dataFormatada = new Date(comentario.data_criacao).toLocaleString('pt-BR');
            
            // Lógica do Botão Responder/Editar/Excluir
            let actionsHtml = `<button class="action-btn btn-reply" title="Responder ao comentário" data-comment-id="${comentario.id}">Responder</button>`;

            if (infoUsuario && comentario.usuario === infoUsuario.id) {
                actionsHtml += `
                    <button class="action-btn btn-edit" title="Alterar" data-comment-id="${comentario.id}">&#x270E;</button>
                    <button class="action-btn btn-delete" title="Excluir" data-comment-id="${comentario.id}">&#x1F5D1;</button>`;
            }
            
            // LÓGICA DE VISIBILIDADE E RECÚO
            let indentStyle = '';
            let comentarioDescricaoHtml = '';
            let normaHtml = '';
            
            if (nestingLevel === 0) {
                // Se for RAIZ (Comentário Principal): EXIBE TUDO
                normaHtml = `<span class="nome-norma">${nomeNormaCompleto}</span>`;
                if (comentario.descricao && comentario.descricao.trim() !== '') {
                    comentarioDescricaoHtml = `<div class="comentario-descricao">${comentario.descricao}</div>`;
                }
            } else {
                // Se for RESPOSTA (Filho): ESCONDE TUDO E APLICA RECÚO
                // Margem para recuo (30px) e margem top (10px) para separação
                indentStyle = `style="margin-left: ${nestingLevel * 30}px; padding-left: 0px; margin-top: 10px;"`; 
            }


            // 2. Chamada recursiva para renderizar as respostas deste comentário
            // 🎯 CRÍTICO: Usa a lista COMPLETA de comentários para continuar a recursão, garantindo que o Neto seja buscado.
            const respostasHtml = renderizarComentarios(comentarios, comentario.id, nestingLevel + 1);

            // 3. Estrutura HTML do comentário individual
            const comentarioItemHtml = `
                <div class="comentario-item" data-comment-id="${comentario.id}" data-parent-id="${comentario.comentario_pai || 'null'}" ${indentStyle}>
                    <div class="comentario-header">
                        <span class="comentario-autor">${comentario.usuario_nome || 'Utilizador'}</span>
                        <span class="comentario-data">${dataFormatada}</span>
                    </div>
                    ${normaHtml}
                    
                    ${comentarioDescricaoHtml}
                    
                    <div class="comentario-texto">${comentario.comentario}</div>
                    
                    <div class="comentario-actions">${actionsHtml}</div>
                </div>
            `;

            // 4. Agrupamento em Contêiner de Thread (Apenas para o nível raiz)
            if (parentId === null) {
                // O comentário raiz se torna o CONTÊINER de toda a thread
                htmlContent += `
                    <div class="thread-container" data-thread-id="${comentario.id}">
                        ${comentarioItemHtml}
                        ${respostasHtml} 
                    </div>
                `;
            } else {
                // Os filhos são injetados diretamente
                htmlContent += comentarioItemHtml;
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
            // Renderiza apenas os comentários raiz (parentId = null)
            listaComentariosContainer.innerHTML = renderizarComentarios(comentarios, null, 0); 
        }
    }


    // --- FUNÇÃO PARA PREENCHER FORMULÁRIO PARA EDIÇÃO (MANTIDA) ---
    function prepareEdit(commentId) {
        const itemToEdit = listaComentariosContainer.querySelector(`.comentario-item[data-comment-id="${commentId}"]`);
        if (!itemToEdit) return;
        
        const comentarioDescricaoElement = itemToEdit.querySelector('.comentario-descricao');
        const descricao = comentarioDescricaoElement ? comentarioDescricaoElement.textContent.trim() : ''; 
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

    // --- FUNÇÃO PARA PREPARAR FORMULÁRIO PARA RESPOSTA ---
    function prepareReply(commentId) {
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

    // --- EVENT LISTENERS ---
    if (openBtnIcon) openBtnIcon.addEventListener('click', openModal);
    closeButtons.forEach(button => button.addEventListener('click', closeModal));
    window.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });

    // --- MANIPULADOR DE SUBMISSÃO (FINAL CORREÇÃO DE PAYLOAD) ---
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
        
        // 💡 CRÍTICO: Corpo de dados limpo. Inclui o ID da Norma na requisição para a View processar
        let bodyData = { 
            comentario: comentario, 
            norma: normaAtualId, 
        };
        
        // 1. Define a URL e o método
        if (mode === 'edit' && commentId) {
            url = `${API_BASE_URL}/comentarios/${commentId}/`;
            method = 'PUT';
            // Em PUT, envia a descrição
            bodyData.descricao = descricao; 

        } else { // 'create' ou 'reply'
            url = `${API_BASE_URL}/normas/${normaAtualId}/comentarios/`;
            method = 'POST';
            
            // 2. Trata a Descrição e o Comentário Pai
            if (mode === 'reply' && commentPaiId) {
                bodyData.comentario_pai = commentPaiId; 
                bodyData.descricao = ''; // Descrição deve ser vazia em respostas
            } else { // 'create'
                bodyData.descricao = descricao;
                // Garante que comentario_pai não seja enviado se for create
                delete bodyData.comentario_pai; 
            }
        }

        const data = await fetchData(url, { 
            method: method, 
            body: JSON.stringify(bodyData)
        });
        
        // --- LÓGICA DE ATUALIZAÇÃO PÓS-SUCESSO ---
        if (data) {
            resetCommentFormState(); 
            
            // Atualiza a tela
            await carregarComentariosDoPopup();
            await carregarDetalhesNorma(normaAtualId);
            await carregarMetricas();
        } else {
            alert(`Erro ao ${mode === 'edit' ? 'alterar' : 'guardar'} comentário. Verifique a API.`);
        }
    });

    listaComentariosContainer.addEventListener('click', async (event) => {
        const target = event.target.closest('.action-btn'); 
        if (!target) return;

        const commentItem = target.closest('.comentario-item');
        if (!commentItem) return;
        
        const commentId = commentItem.dataset.commentId;

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