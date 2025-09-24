from django.urls import path
from .views import (
    NormaListCreateView, NormaDetailView, ClienteListCreateView, UserRegistrationView,
    MinhasNormasListAPIView, GerenciarFuncionariosView, RevisaoSecundariaHistoricoCreateAPIView,
    NotificacaoListAPIView, NotificacaoDetailAPIView, PasswordResetAPIView, PasswordResetConfirmAPIView, DashboardMetricsAPIView, UserProfileAPIView, FavoritarNormaAPIView, ComentarioListCreateAPIView, AuditoriaListCreateView, CertificacaoListCreateView, CentroDeCustoListCreateView, ComentarioDetailAPIView
)

urlpatterns = [
    path('normas/', NormaListCreateView.as_view(), name='norma-list-create'),
    path('normas/<int:pk>/', NormaDetailView.as_view(), name='norma-detail'),
    path('clientes/', ClienteListCreateView.as_view(), name='cliente-list-create'),
    path('cadastrar-usuario/', UserRegistrationView.as_view(), name='cadastrar-usuario'),
    path('minhas-normas/', MinhasNormasListAPIView.as_view(), name='minhas-normas'),
    path('gerenciar-funcionarios/', GerenciarFuncionariosView.as_view(), name='gerenciar-funcionarios'),
    path('revisoes-secundarias/', RevisaoSecundariaHistoricoCreateAPIView.as_view(), name='revisoes-secundarias'),
    path('notificacoes/', NotificacaoListAPIView.as_view(), name='notificacoes-list'),
    path('notificacoes/<int:pk>/', NotificacaoDetailAPIView.as_view(), name='notificacoes-detail'),
    path('redefinir-senha/solicitar/', PasswordResetAPIView.as_view(), name='password-reset-request'),
    path('redefinir-senha/confirmar/', PasswordResetConfirmAPIView.as_view(), name='password-reset-confirm'),
    path('dashboard/metrics/', DashboardMetricsAPIView.as_view(), name='dashboard-metrics'),
    path('user/profile/', UserProfileAPIView.as_view(), name='user-profile'),
    path('normas/<int:pk>/favoritar/', FavoritarNormaAPIView.as_view(), name='norma-favoritar'),
    path('normas/<int:norma_pk>/comentarios/', ComentarioListCreateAPIView.as_view(), name='adicionar-comentario'),
    path('auditorias/', AuditoriaListCreateView.as_view(), name='auditorias-list-create'),
    path('certificacoes/', CertificacaoListCreateView.as_view(), name='certificacoes-list-create'),
    path('centros-de-custo/', CentroDeCustoListCreateView.as_view(), name='centros-de-custo-list-create'),
    path('comentarios/<int:pk>/', ComentarioDetailAPIView.as_view(), name='comentario-detail'),
]