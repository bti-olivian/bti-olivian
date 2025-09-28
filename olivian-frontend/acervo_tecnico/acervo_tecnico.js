// A URL base da API continua a mesma
const API_BASE_URL = 'http://127.0.0.1:8000/api';

document.addEventListener('DOMContentLoaded', () => {
    // --- VARIÁVEIS GLOBAIS E SELETORES ---
    let todasAsNormas = [], normaAtualId = null, infoUsuario = null;

    // CORREÇÃO CRÍTICA: Altera a chave para 'access' (assumindo que o login salva com esta chave)
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

    // --- LÓGICA DO POPUP ---
    async function openModal() { if (modal) { await carregarComentariosDoPopup(); modal.style.display = 'flex'; } }
    function closeModal() { if (modal) modal.style.display = 'none'; }

    // --- FUNÇÕES DE API ---
    async function fetchData(url, options = {}) {
        try {
            // Usa o accessToken obtido no início do script
            const response = await fetch(url, { 
                ...options, 
                headers: { 
                    'Authorization': `Bearer ${accessToken}`, // Chave de autorização constante
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
                console.error(`Erro na API ${url}:`, await response.text()); 
                return null; 
            }
            return response.status === 204 ? true : await response.json();
        } catch (error) { 
            console.error(`Erro de conexão com ${url}:`, error); 
            return null; 
        }
    }

    

    // --- FUNÇÕES DE RENDERIZAÇÃO E LÓGICA PRINCIPAL ---
    
    // Função auxiliar para formatar CNPJ (assumindo que você a definiu em outro lugar)
    function formatarCNPJ(cnpj) {
        if (!cnpj) return 'N/A';
        // Simplificado para teste. Se precisar da formatação completa, adicione a lógica aqui.
        return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }

    async function carregarDadosUsuario() {
        const profileData = await fetchData(`${API_BASE_URL}/user/profile/`);
        if (profileData) {
            infoUsuario = profileData;
            document.querySelector('.client-profile').style.opacity = 1;
            document.querySelector('.user-profile').style.opacity = 1;
            document.getElementById('client-name').textContent = profileData.cliente.empresa;
            // APLICA A FORMATAÇÃO DO CNPJ AQUI
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
            normas.sort((a, b) => `${a.organizacao} ${a.norma}`.localeCompare(`${b.organizacao} ${b.norma}`));
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

    async function carregarComentariosDoPopup() {
        listaComentariosContainer.innerHTML = '<p>A carregar comentários...</p>';
        if (!normaAtualId) {
            listaComentariosContainer.innerHTML = '<p>Selecione uma norma para ver os comentários.</p>';
            return;
        }
        const comentarios = await fetchData(`${API_BASE_URL}/normas/${normaAtualId}/comentarios/`);
        listaComentariosContainer.innerHTML = '';

        if (!comentarios || comentarios.length === 0) {
            listaComentariosContainer.innerHTML = '<p>Nenhum comentário para esta norma ainda.</p>';
        } else {
            comentarios.forEach(comentario => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'comment-item';
                itemDiv.dataset.commentId = comentario.id;
                const dataFormatada = new Date(comentario.data_criacao).toLocaleString('pt-BR');

                let actionsHtml = `
                    <button class="reply-btn" title="Comentar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>
                    </button>`;

                // Verifica se o comentário pertence ao usuário logado para mostrar botões de edição/exclusão
                if (infoUsuario && comentario.usuario === infoUsuario.id) {
                    actionsHtml += `
                        <button class="edit-btn" title="Alterar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                        </button>
                        <button class="delete-btn" title="Excluir">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>`;
                }

                itemDiv.innerHTML = `
                    <div class="comment-header">
                        <span class="comment-author">${comentario.usuario_nome || 'Utilizador'}</span>
                        <span class="comment-date">${dataFormatada}</span>
                    </div>
                    <div class="comment-body">
                        <p><strong>${comentario.descricao}</strong></p>
                        <p>${comentario.comentario}</p>
                    </div>
                    <div class="comment-actions">${actionsHtml}</div>
                `;
                listaComentariosContainer.appendChild(itemDiv);
            });
        }
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

    commentForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const descricao = document.getElementById('commentDescription').value;
        const comentario = document.getElementById('commentText').value;
        if (!comentario.trim()) { alert('O campo "Comentário" não pode estar vazio.'); return; }
        const data = await fetchData(`${API_BASE_URL}/normas/${normaAtualId}/comentarios/`, { method: 'POST', body: JSON.stringify({ descricao, comentario }) });
        if (data) {
            commentForm.reset();
            await carregarComentariosDoPopup();
            await carregarDetalhesNorma(normaAtualId);
            await carregarMetricas();
        } else {
            alert('Erro ao guardar comentário.');
        }
    });

    listaComentariosContainer.addEventListener('click', async (event) => {
        const target = event.target.closest('button'); 
        if (!target) return;

        const commentItem = target.closest('.comment-item');
        const commentId = commentItem.dataset.commentId;

        if (target.classList.contains('delete-btn')) {
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
        // Adicionar lógica para 'edit-btn' e 'reply-btn' aqui se necessário
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