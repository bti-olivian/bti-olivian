from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.db.models import Prefetch
import os
from django.core.exceptions import ValidationError
from django.contrib.auth.password_validation import validate_password
from datetime import date
from .permissions import IsOwnerOrReadOnly
from rest_framework import generics

# --- IMPORTS DE MODELS ---
from .models import (
    Norma,
    Cliente,
    User,
    PerfilUsuario,
    RevisaoSecundariaHistorico,
    Notificacao,
    NormaCliente,
    Comentario,
    Auditoria,
    Certificacao,
    CentroDeCusto
)

# --- IMPORTS DE SERIALIZERS (REMOVIDO PermissoesUsuarioSerializer) ---
from .serializers import (
    AuditoriaSerializer,
    AuditoriaVinculadaSerializer,
    CentroDeCustoSerializer,
    CentroDeCustoVinculadoSerializer,
    CertificacaoSerializer,
    CertificacaoVinculadaSerializer,
    ClienteSerializer,
    ComentarioSerializer,
    CustomEmailLoginSerializer,
    NormaSerializer,
    NotificacaoSerializer,
    PasswordResetConfirmSerializer,
    PerfilUsuarioAdminSerializer,
    PerfilUsuarioSerializer, # AGORA ESTE SERIALIZER FAZ O TRABALHO
    RevisaoSecundariaHistoricoSerializer,
    UserRegistrationSerializer,
)

class NormaListCreateView(generics.ListCreateAPIView):
    queryset = Norma.objects.all()
    serializer_class = NormaSerializer
    permission_classes = [IsAuthenticated]

class NormaDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Norma.objects.all()
    serializer_class = NormaSerializer

class ClienteListCreateView(generics.ListCreateAPIView):
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer

class UserRegistrationView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]

class MinhasNormasListAPIView(generics.ListAPIView):
    serializer_class = NormaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        usuario_logado = self.request.user
        try:
            # Pre-busca os dados necessarios para evitar N+1 queries
            perfil_do_usuario = PerfilUsuario.objects.select_related('cliente').get(usuario=usuario_logado)
            
            # Aqui, voce ja tem o cliente do usuario.
            # Agora, busque as normas do cliente e pre-carregue a relacao com NormaCliente.
            return Norma.objects.filter(
                normacliente__cliente=perfil_do_usuario.cliente
            ).prefetch_related(
                'normacliente_set'
            )
        except PerfilUsuario.DoesNotExist:
            return Norma.objects.none()

# CORREÇÃO: Atualizada para usar a nova permissão como checagem de administrador
class GerenciarFuncionariosView(generics.ListAPIView):
    serializer_class = PerfilUsuarioSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        usuario_logado = self.request.user
        try:
            perfil_do_usuario = PerfilUsuario.objects.get(usuario=usuario_logado)
        except PerfilUsuario.DoesNotExist:
            raise PermissionDenied("Seu perfil de usuario nao esta configurado. Acesso negado.")

        # ATUALIZAÇÃO DA PERMISSÃO
        if not perfil_do_usuario.pode_gerenciar_auditorias:
            raise PermissionDenied("Voce nao tem permissao para gerenciar funcionarios.")

        cliente_do_usuario = perfil_do_usuario.cliente
        return PerfilUsuario.objects.filter(cliente=cliente_do_usuario)

# ----------------------------------------------------
# NOVA VIEW: Listar e Atualizar Permissões de Administradores
# ----------------------------------------------------
class AdminPermissoesListUpdateView(generics.ListAPIView):
    # Use o serializer mais completo para a tela de admin
    serializer_class = PerfilUsuarioAdminSerializer
    permission_classes = [IsAuthenticated] # O Super-Admin pode ser verificado no get_queryset

    def get_queryset(self):
        usuario_logado = self.request.user
        
        try:
            perfil_do_usuario = PerfilUsuario.objects.get(usuario=usuario_logado)
        except PerfilUsuario.DoesNotExist:
            raise PermissionDenied("Seu perfil de usuário não está configurado. Acesso negado.")

        # REGRA DE NEGÓCIO CRÍTICA: Somente um Super-Admin pode ver/editar
        # Usando 'pode_gerenciar_auditorias' como o check de Super-Admin
        if not perfil_do_usuario.pode_gerenciar_auditorias:
            raise PermissionDenied("Você não tem permissão para administrar usuários.")

        cliente_do_usuario = perfil_do_usuario.cliente
        # Retorna todos os perfis do cliente, exceto o do usuário logado (para evitar que ele tire as próprias permissões)
        return PerfilUsuario.objects.filter(cliente=cliente_do_usuario).select_related('usuario').exclude(usuario=usuario_logado)


class AdminPermissoesBulkUpdateView(APIView):
    """
    View para receber a lista completa de perfis e atualizar as permissões em massa.
    """
    permission_classes = [IsAuthenticated]

    def put(self, request, *args, **kwargs):
        usuario_logado = self.request.user
        
        try:
            perfil_do_admin = PerfilUsuario.objects.get(usuario=usuario_logado)
        except PerfilUsuario.DoesNotExist:
            return Response({"detail": "Perfil de administrador não encontrado."}, status=status.HTTP_404_NOT_FOUND)

        # Verificação de Permissão: Somente quem pode administrar acessa este endpoint
        if not perfil_do_admin.pode_gerenciar_auditorias: # Use uma das novas permissões como Super-Admin check
            return Response({"detail": "Você não tem permissão para modificar acessos."}, status=status.HTTP_403_FORBIDDEN)
        
        # O payload deve ser uma lista de objetos com 'user_id' e os campos de permissão
        data = request.data
        if not isinstance(data, list):
            return Response({"detail": "Payload deve ser uma lista de usuários."}, status=status.HTTP_400_BAD_REQUEST)

        # Mapeia as permissões que o ADMIN logado PODE conceder (só pode conceder o que ele tem)
        permissoes_admin = {
            'pode_gerenciar_auditorias': perfil_do_admin.pode_gerenciar_auditorias,
            'pode_gerenciar_certificacoes': perfil_do_admin.pode_gerenciar_certificacoes,
            'pode_gerenciar_centros_de_custo': perfil_do_admin.pode_gerenciar_centros_de_custo,
            'pode_gerenciar_comentarios': perfil_do_admin.pode_gerenciar_comentarios,
            'pode_gerenciar_precos': perfil_do_admin.pode_gerenciar_precos,
            'pode_gerenciar_favoritos': perfil_do_admin.pode_gerenciar_favoritos,
        }
        
        # Itera sobre os dados recebidos para aplicar as alterações
        updates = []
        for item in data:
            user_id = item.get('user_id')
            if not user_id:
                continue

            try:
                perfil = PerfilUsuario.objects.select_related('usuario').get(usuario__id=user_id, cliente=perfil_do_admin.cliente)
                
                # Impede que o admin logado altere o próprio perfil neste endpoint
                if perfil.usuario == usuario_logado:
                    continue 

                campos_alterados = {}
                permissao_atualizada = False
                
                # Verifica e aplica apenas as permissões que o ADMIN logado PODE modificar
                for campo, pode_modificar in permissoes_admin.items():
                    if campo in item and pode_modificar:
                        valor_novo = item[campo]
                        valor_atual = getattr(perfil, campo)
                        
                        if valor_novo != valor_atual:
                            campos_alterados[campo] = valor_novo
                            permissao_atualizada = True
                
                if permissao_atualizada:
                    for campo, valor in campos_alterados.items():
                        setattr(perfil, campo, valor)
                    updates.append(perfil)
                    
            except PerfilUsuario.DoesNotExist:
                # Ignora usuários que não existem ou não pertencem ao cliente
                continue

        # Salva as alterações no banco de dados
        # O bulk_update é mais eficiente para atualizar múltiplos objetos
        PerfilUsuario.objects.bulk_update(updates, list(permissoes_admin.keys()))

        return Response({"detail": f"{len(updates)} perfis de usuários atualizados com sucesso."}, status=status.HTTP_200_OK)

# ----------------------------------------------------
# FIM DAS NOVAS VIEWS
# ----------------------------------------------------


class RevisaoSecundariaHistoricoCreateAPIView(generics.CreateAPIView):
    queryset = RevisaoSecundariaHistorico.objects.all()
    serializer_class = RevisaoSecundariaHistoricoSerializer
    permission_classes = [IsAuthenticated]

class NotificacaoListAPIView(generics.ListAPIView):
    serializer_class = NotificacaoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Notificacao.objects.filter(usuario=self.request.user).order_by('-data_criacao')

class NotificacaoDetailAPIView(generics.RetrieveUpdateAPIView):
    queryset = Notificacao.objects.all()
    serializer_class = NotificacaoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Notificacao.objects.filter(usuario=self.request.user)

class CustomLoginAPIView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
        serializer = CustomEmailLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)
    
class PasswordResetAPIView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"detail": "Nao ha uma conta com este e-mail."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Gerar token e link de redefinicao
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        # O link do frontend que vai receber o token
        # Altere o dominio e a porta para o seu frontend
        reset_url = f"http://localhost:5501/login/redefinir_senha_confirmar.html?uid={uid}&token={token}"
        
        # O corpo do e-mail
        subject = "Redefinir sua senha da Olivian"
        message = f"""Ola {user.username},

Voce solicitou a redefinicao de sua senha. Clique no link abaixo para criar uma nova senha:

{reset_url}

Se voce nao solicitou esta redefinicao, por favor, ignore este e-mail.

Atenciosamente,
Equipe Olivian."""
        
        # Enviar o e-mail
        try:
            send_mail(subject, message, os.environ.get('EMAIL_HOST_USER', 'webmaster@localhost'), [user.email])
            return Response({"detail": "E-mail de redefinicao enviado com sucesso."})
        except Exception as e:
            return Response({"detail": f"Erro ao enviar o e-mail: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PasswordResetConfirmAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        try:
            serializer = PasswordResetConfirmSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            uidb64 = serializer.validated_data.get('uid')
            token = serializer.validated_data.get('token')
            new_password = serializer.validated_data.get('new_password')
            
            # Decodifica o UID e busca o usuario
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = get_user_model().objects.get(pk=uid)
            
            # Checa se o token e valido
            if user is not None and default_token_generator.check_token(user, token):
                # Valida a nova senha
                validate_password(new_password, user)
                
                # Salva a nova senha
                user.set_password(new_password)
                user.save()
                return Response({"detail": "Senha redefinida com sucesso."})
            else:
                return Response({"detail": "O link de redefinicao de senha e invalido ou expirou."}, status=status.HTTP_400_BAD_REQUEST)
        
        except (TypeError, ValueError, OverflowError, get_user_model().DoesNotExist):
            return Response({"detail": "O link de redefinicao de senha e invalido ou expirou."}, status=status.HTTP_400_BAD_REQUEST)
        except ValidationError as e:
            return Response({"detail": e.messages}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print(f"Erro inesperado no servidor: {e}")
            return Response({"detail": "Erro interno no servidor."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
class DashboardMetricsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            perfil_usuario = PerfilUsuario.objects.select_related('cliente').get(usuario=user)
            cliente = perfil_usuario.cliente

            normas = cliente.norma_set.all().prefetch_related(
                Prefetch(
                    'normacliente_set',
                    queryset=NormaCliente.objects.filter(cliente=cliente),
                    to_attr='norma_do_cliente'
                )
            )

            # --- Logica de Risco (ja existente) ---
            risco_nao_conformidade_count = 0
            for norma in normas:
                if norma.norma_do_cliente:
                    norma_cliente_obj = norma.norma_do_cliente[0]
                    if norma.revisao_atual and norma_cliente_obj.data_revisao_cliente:
                        if norma.revisao_atual > norma_cliente_obj.data_revisao_cliente:
                            risco_nao_conformidade_count += 1

            # --- Logica de Renovacao (ja existente) ---
            dias_para_renovacao = 0
            if cliente.vigencia_contratual_fim:
                hoje = date.today()
                diferenca = cliente.vigencia_contratual_fim - hoje
                dias_para_renovacao = diferenca.days
                if dias_para_renovacao < 0:
                    dias_para_renovacao = 0

            # --- Logica de Favoritos (ja existente) ---
            normas_favoritas_count = perfil_usuario.normas_favoritas.count()

            # =================================================================
            # NOVA LoGICA PARA CONTAR TODAS AS NORMAS COMENTADAS DO CLIENTE
            # =================================================================
            # A correção é feita na sua lógica original, garantindo a contagem correta
            normas_comentadas_count = Comentario.objects.filter(norma_cliente__cliente=cliente).count()

            metrics = {
                "total_normas": normas.count(),
                "normas_comentadas": normas_comentadas_count,
                "normas_favoritas": normas_favoritas_count,
                "dias_renovacao": dias_para_renovacao,
                "risco_nao_conformidade": risco_nao_conformidade_count,
            }
            return Response(metrics, status=status.HTTP_200_OK)

        except PerfilUsuario.DoesNotExist:
            return Response({"detail": "Perfil de usuario nao encontrado."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"Erro ao carregar as metricas: {e}")
            return Response({"detail": f"Erro ao carregar as metricas: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserProfileAPIView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        try:
            perfil_usuario = PerfilUsuario.objects.get(usuario=user)
            cliente = perfil_usuario.cliente
            
            # 1. Utiliza o PerfilUsuarioSerializer, que já inclui o objeto 'permissoes'
            perfil_data = PerfilUsuarioSerializer(perfil_usuario).data

            # 2. Constrói o objeto de resposta, injetando os dados do User e Cliente (que não estão no PerfilUsuarioSerializer)
            user_data = {
                "id": user.id,
                "nome_completo": f"{user.first_name} {user.last_name}".strip(),
                "email": user.email,
                "cliente": {
                    "id": cliente.id,
                    "empresa": cliente.empresa,
                    "cnpj": cliente.cnpj,
                    "endereco": cliente.endereco,
                    "bairro": cliente.bairro,
                    "cidade": cliente.cidade,
                    "estado": cliente.estado,
                    "cep": cliente.cep,
                    "telefone": cliente.telefone,
                    "vigencia_contratual_inicio": cliente.vigencia_contratual_inicio,
                    "vigencia_contratual_fim": cliente.vigencia_contratual_fim,
                },
                # 3. Injete as permissões (que já estão no perfil_data)
                "permissoes": perfil_data['permissoes']
            }
            return Response(user_data, status=status.HTTP_200_OK)
        except PerfilUsuario.DoesNotExist:
            return Response({"detail": "Perfil de usuario nao encontrado."}, status=status.HTTP_404_NOT_FOUND)

class FavoritarNormaAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            norma = Norma.objects.get(pk=pk)
            perfil_usuario = PerfilUsuario.objects.get(usuario=request.user)

            if norma in perfil_usuario.normas_favoritas.all():
                perfil_usuario.normas_favoritas.remove(norma)
                return Response({"status": "removida dos favoritos"}, status=status.HTTP_200_OK)
            else:
                perfil_usuario.normas_favoritas.add(norma)
                return Response({"status": "adicionada aos favoritos"}, status=status.HTTP_200_OK)

        except (Norma.DoesNotExist, PerfilUsuario.DoesNotExist):
            return Response({"error": "Norma ou Perfil nao encontrado"}, status=status.HTTP_404_NOT_FOUND)
        
class ComentarioListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = ComentarioSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        try:
            norma_pk = self.kwargs['norma_pk']
            cliente_do_usuario = self.request.user.perfilusuario.cliente
            norma_cliente = NormaCliente.objects.get(norma__pk=norma_pk, cliente=cliente_do_usuario)
            return Comentario.objects.filter(norma_cliente=norma_cliente).order_by('-data_criacao')
        except (PerfilUsuario.DoesNotExist, NormaCliente.DoesNotExist, AttributeError):
            return Comentario.objects.none()

    def create(self, request, *args, **kwargs):
        try:
            # PASSO 1: Encontrar a relacao Norma-Cliente correta
            norma_pk = self.kwargs['norma_pk']
            cliente_do_usuario = request.user.perfilusuario.cliente
            norma_cliente = NormaCliente.objects.get(norma__pk=norma_pk, cliente=cliente_do_usuario)

            # PASSO 2: Validar os dados do formulario (descricao, comentario)
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            # PASSO 3: Salvar o comentario, injetando o usuario e a norma_cliente
            serializer.save(usuario=request.user, norma_cliente=norma_cliente)

            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

        except PerfilUsuario.DoesNotExist:
            return Response(
                {"detail": "Nao foi possivel encontrar o perfil do seu usuario."},
                status=status.HTTP_400_BAD_REQUEST
            )
        except NormaCliente.DoesNotExist:
            return Response(
                {"detail": "A relacao entre esta Norma e o Cliente nao existe. Associe-os no painel de administracao primeiro."},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            # Para qualquer outro erro inesperado
            print(f"Erro inesperado ao criar comentario: {e}")
            return Response(
                {"detail": "Ocorreu um erro interno ao tentar salvar o comentario."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
class AuditoriaListCreateView(generics.ListCreateAPIView):
    serializer_class = AuditoriaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Auditoria.objects.filter(cliente=self.request.user.perfilusuario.cliente)

    def perform_create(self, serializer):
        serializer.save(cliente=self.request.user.perfilusuario.cliente)

class CertificacaoListCreateView(generics.ListCreateAPIView):
    serializer_class = CertificacaoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Certificacao.objects.filter(cliente=self.request.user.perfilusuario.cliente)

    def perform_create(self, serializer):
        serializer.save(cliente=self.request.user.perfilusuario.cliente)

class CentroDeCustoListCreateView(generics.ListCreateAPIView):
    serializer_class = CentroDeCustoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CentroDeCusto.objects.filter(cliente=self.request.user.perfilusuario.cliente)

    def perform_create(self, serializer):
        serializer.save(cliente=self.request.user.perfilusuario.cliente)

class ComentarioDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Comentario.objects.all()
    serializer_class = ComentarioSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]

# Adicionado para a tela de Acervo Técnico (Vínculos)
class NormaVinculosView(APIView):
    """
    View para listar auditorias, certificações e centros de custo
    vinculados a uma norma específica para o cliente logado.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, norma_id, format=None):
        if not hasattr(request.user, 'perfilusuario') or not request.user.perfilusuario.cliente:
            return Response({"error": "Usuário não tem um cliente associado."}, status=400)
            
        cliente = request.user.perfilusuario.cliente
        
        # Filtra os itens pelo cliente E pelo ID da norma
        auditorias = Auditoria.objects.filter(cliente=cliente, normas__id=norma_id)
        certificacoes = Certificacao.objects.filter(cliente=cliente, normas__id=norma_id)
        centros_de_custo = CentroDeCusto.objects.filter(cliente=cliente, normas__id=norma_id)

        auditorias_data = AuditoriaVinculadaSerializer(auditorias, many=True).data
        certificacoes_data = CertificacaoVinculadaSerializer(certificacoes, many=True).data
        centros_de_custo_data = CentroDeCustoVinculadoSerializer(centros_de_custo, many=True).data

        return Response({
            'auditorias': auditorias_data,
            'certificacoes': certificacoes_data,
            'centros_de_custo': centros_de_custo_data,
        })