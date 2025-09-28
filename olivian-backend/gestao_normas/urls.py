from django.urls import path
from .views import (
    NormaListCreateView, NormaDetailView, ClienteListCreateView, UserRegistrationView,
    MinhasNormasListAPIView, GerenciarFuncionariosView, RevisaoSecundariaHistoricoCreateAPIView,
    NotificacaoListAPIView, NotificacaoDetailAPIView, PasswordResetAPIView, PasswordResetConfirmAPIView, 
    DashboardMetricsAPIView, UserProfileAPIView, FavoritarNormaAPIView, ComentarioListCreateAPIView, 
    AuditoriaListCreateView, CertificacaoListCreateView, CentroDeCustoListCreateView, ComentarioDetailAPIView, 
    NormaVinculosView,
    # NOVAS VIEWS IMPORTADAS
    AdminPermissoesListUpdateView, AdminPermissoesBulkUpdateView 
)

urlpatterns = [
    # Rotas de Normas
    path('normas/', NormaListCreateView.as_view(), name='norma-list-create'),
    path('normas/<int:pk>/', NormaDetailView.as_view(), name='norma-detail'),
    path('minhas-normas/', MinhasNormasListAPIView.as_view(), name='minhas-normas'),
    path('normas/<int:pk>/favoritar/', FavoritarNormaAPIView.as_view(), name='norma-favoritar'),
    path('normas/<int:norma_pk>/comentarios/', ComentarioListCreateAPIView.as_view(), name='adicionar-comentario'),
    path('normas/<int:norma_id>/vinculos/', NormaVinculosView.as_view(), name='norma-vinculos'),

    # Rotas de Usuário e Autenticação
    path('cadastrar-usuario/', UserRegistrationView.as_view(), name='cadastrar-usuario'),
    path('redefinir-senha/solicitar/', PasswordResetAPIView.as_view(), name='password-reset-request'),
    path('redefinir-senha/confirmar/', PasswordResetConfirmAPIView.as_view(), name='password-reset-confirm'),
    path('user/profile/', UserProfileAPIView.as_view(), name='user-profile'),
    
    # Rotas de Clientes e Estrutura
    path('clientes/', ClienteListCreateView.as_view(), name='cliente-list-create'),
    path('auditorias/', AuditoriaListCreateView.as_view(), name='auditorias-list-create'),
    path('certificacoes/', CertificacaoListCreateView.as_view(), name='certificacoes-list-create'),
    path('centros-de-custo/', CentroDeCustoListCreateView.as_view(), name='centros-de-custo-list-create'),
    
    # Rotas de Comentários e Histórico
    path('revisoes-secundarias/', RevisaoSecundariaHistoricoCreateAPIView.as_view(), name='revisoes-secundarias'),
    path('comentarios/<int:pk>/', ComentarioDetailAPIView.as_view(), name='comentario-detail'),

    # Rotas de Notificações
    path('notificacoes/', NotificacaoListAPIView.as_view(), name='notificacoes-list'),
    path('notificacoes/<int:pk>/', NotificacaoDetailAPIView.as_view(), name='notificacoes-detail'),
    
    # Rotas de Dashboard
    path('dashboard/metrics/', DashboardMetricsAPIView.as_view(), name='dashboard-metrics'),

    # Rotas de Administração de Usuários (Antiga e Novas)
    path('gerenciar-funcionarios/', GerenciarFuncionariosView.as_view(), name='gerenciar-funcionarios'),
    
    # NOVAS ROTAS DE PERMISSÕES
    path('admin-permissoes/', AdminPermissoesListUpdateView.as_view(), name='admin-permissoes-list'),
    path('admin-permissoes/bulk-update/', AdminPermissoesBulkUpdateView.as_view(), name='admin-permissoes-bulk-update'),
]