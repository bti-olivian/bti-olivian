from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (Cliente, Norma, NormaCliente, PerfilUsuario, RevisaoSecundariaHistorico, Notificacao, Comentario, Auditoria, Certificacao, CentroDeCusto)
from datetime import date, datetime
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import password_validation
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers
from .models import Comentario # Assumindo que Comentario está importado

User = get_user_model()

# --- SERIALIZADORES DE PERFIL DE USUÁRIO (ATUALIZADOS) ---

# Serializador para o perfil de usuario (Versão atualizada para a tela de Admin)
class PerfilUsuarioAdminSerializer(serializers.ModelSerializer):
    # Campos que trazem dados do modelo User
    username = serializers.CharField(source='usuario.username', read_only=True)
    nome_completo = serializers.SerializerMethodField()
    user_id = serializers.IntegerField(source='usuario.id', read_only=True)

    class Meta:
        model = PerfilUsuario
        # Inclua todos os novos campos de permissão
        fields = [
            'user_id', 'username', 'nome_completo', 'cliente',
            'pode_gerenciar_auditorias',
            'pode_gerenciar_certificacoes',
            'pode_gerenciar_centros_de_custo',
            'pode_gerenciar_comentarios',
            'pode_gerenciar_precos',
            'pode_gerenciar_favoritos',
        ]
        # O campo 'cliente' é de leitura-somente para evitar alteração acidental de cliente.
        read_only_fields = ['cliente', 'username', 'nome_completo', 'user_id']

    def get_nome_completo(self, obj):
        # Concatena first_name e last_name do User
        return f"{obj.usuario.first_name} {obj.usuario.last_name}".strip()


# Serializador para o perfil de usuario (Versão para o usuário comum - AGORA INCLUI O OBJETO PERMISSÕES)
class PerfilUsuarioSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='usuario.username', read_only=True)
    email = serializers.EmailField(source='usuario.email', read_only=True)
    # NOVO CAMPO: Retorna todas as permissões em um objeto JSON
    permissoes = serializers.SerializerMethodField()

    class Meta:
        model = PerfilUsuario
        # CAMPOS ATUALIZADOS: Removendo as permissões da raiz, e adicionando 'permissoes'
        fields = [
            'username', 
            'email', 
            'cliente',
            'permissoes', # <--- NOVO CAMPO CALCULADO
        ]
        read_only_fields = ['cliente', 'username', 'email']

    def get_permissoes(self, obj):
        # Retorna um dicionário com todas as permissões booleanas
        return {
            'pode_gerenciar_auditorias': obj.pode_gerenciar_auditorias,
            'pode_gerenciar_certificacoes': obj.pode_gerenciar_certificacoes,
            'pode_gerenciar_centros_de_custo': obj.pode_gerenciar_centros_de_custo,
            'pode_gerenciar_comentarios': obj.pode_gerenciar_comentarios,
            'pode_gerenciar_precos': obj.pode_gerenciar_precos,
            'pode_gerenciar_favoritos': obj.pode_gerenciar_favoritos,
        }

# --- FIM DOS SERIALIZADORES DE PERFIL DE USUÁRIO ---


# Serializador para o modelo Norma
class NormaSerializer(serializers.ModelSerializer):
    sua_revisao = serializers.SerializerMethodField()
    status_atualizado = serializers.SerializerMethodField()
    is_favorita = serializers.SerializerMethodField()
    comentarios_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Norma
        # A API de detalhes usara apenas esses campos.
        fields = [
            'id', 'organizacao', 'norma', 'titulo', 'revisao_atual', 
            'idioma', 'formato', 
            'sua_revisao', 'status_atualizado', 'is_favorita', 'observacoes', 'comentarios_count'
        ]

    def get_comentarios_count(self, obj):
        # obj aqui e uma instancia de Norma
        request = self.context.get('request')
        if request and hasattr(request, "user") and request.user.is_authenticated:
            try:
                # Encontra a relacao NormaCliente para a norma atual e o usuario logado
                norma_cliente = NormaCliente.objects.get(norma=obj, cliente=request.user.perfilusuario.cliente)
                # Conta os comentarios dessa relacao especifica
                return norma_cliente.comentarios.count()
            except (NormaCliente.DoesNotExist, PerfilUsuario.DoesNotExist, AttributeError):
                return 0
        return 0
        
    def get_sua_revisao(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, "user") and request.user.is_authenticated:
            try:
                perfil_usuario = PerfilUsuario.objects.get(usuario=request.user)
                cliente = perfil_usuario.cliente
                norma_cliente = NormaCliente.objects.get(norma=obj, cliente=cliente)
                return norma_cliente.data_revisao_cliente
            except (PerfilUsuario.DoesNotExist, NormaCliente.DoesNotExist, AttributeError):
                return None
        return None

    def get_status_atualizado(self, obj):
        try:
            user = self.context['request'].user
            perfil_usuario = PerfilUsuario.objects.get(usuario=user)
            cliente = perfil_usuario.cliente
            norma_cliente = NormaCliente.objects.get(norma=obj, cliente=cliente)
            
            if obj.revisao_atual > norma_cliente.data_revisao_cliente:
                return "DESATUALIZADO"
            else:
                return "ATUALIZADO"
        except (PerfilUsuario.DoesNotExist, NormaCliente.DoesNotExist, AttributeError):
            return "Indefinido"
        
    def get_is_favorita(self, obj):
        user = self.context.get('request').user
        if user and user.is_authenticated:
            try:
                perfil = PerfilUsuario.objects.get(usuario=user)
                # Verifica se a norma (obj) existe na lista de favoritos do perfil
                return perfil.normas_favoritas.filter(pk=obj.pk).exists()
            except PerfilUsuario.DoesNotExist:
                return False
        return False


# Serializador para o modelo Cliente
class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = '__all__'

# Serializador para o registro de usuario
class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['email', 'password']
    
    def create(self, validated_data):
        email = validated_data['email']
        dominio = email.split('@')[1]
        try:
            cliente = Cliente.objects.get(dominio=dominio)
        except Cliente.DoesNotExist:
            raise serializers.ValidationError({"email": "O dominio de e-mail nao pertence a um cliente cadastrado."})

        user = User.objects.create_user(
            username=email, 
            email=email,
            password=validated_data['password']
        )
        
        PerfilUsuario.objects.create(usuario=user, cliente=cliente)
        return user

# Serializador para o historico de revisao secundaria
class RevisaoSecundariaHistoricoSerializer(serializers.ModelSerializer):
    class Meta:
        model = RevisaoSecundariaHistorico
        fields = '__all__'

    def create(self, validated_data):
        historico = super().create(validated_data)
        if historico.tipo_revisao == 'ammendment':
            norma = historico.norma
            norma.revisao_atual = historico.data
            norma.save()
        return historico

# Serializador para o modelo Notificacao
class NotificacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacao
        fields = '__all__'

# Serializador personalizado para login com e-mail
class CustomEmailLoginSerializer(serializers.Serializer):
    email = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True, required=True)
    token = serializers.CharField(read_only=True)
    
    def validate(self, data):
        email = data.get('email')
        password = data.get('password')
        
        if email and password:
            try:
                user = User.objects.get(email__iexact=email)
                if not user.check_password(password):
                    raise serializers.ValidationError("Nao ha conta ativa com as credenciais fornecidas.")
            except User.DoesNotExist:
                raise serializers.ValidationError("Nao ha conta ativa com as credenciais fornecidas.")
        else:
            raise serializers.ValidationError("E-mail e senha sao campos obrigatorios.")
        
        refresh = RefreshToken.for_user(user)
        return {
            'email': user.email,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }
    
class PasswordResetConfirmSerializer(serializers.Serializer):
    new_password = serializers.CharField(
        style={'input_type': 'password'},
        label=_("New password"),
    )
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)

    def validate_new_password(self, value):
        password_validation.validate_password(value)
        return value
    
# Em gestao_normas/serializers.py

# Seu serializers.py

# Seu serializers.py

# Seu serializers.py

# Seu serializers.py

class ComentarioSerializer(serializers.ModelSerializer):
    # Traz o nome do usuario que fez o comentario (apenas para leitura)
    usuario_nome = serializers.CharField(source='usuario.get_full_name', read_only=True)
    
    # 🎯 CORREÇÃO CRÍTICA 1: Garante que o usuário seja retornado como ID.
    # Isso é fundamental para que o Front-end possa comparar o autor.
    usuario = serializers.PrimaryKeyRelatedField(read_only=True) 
    
    # 🎯 CORREÇÃO CRÍTICA 2: Garante que o comentario_pai seja retornado como ID numérico.
    comentario_pai = serializers.PrimaryKeyRelatedField(queryset=Comentario.objects.all(), allow_null=True, required=False)

    # 🚀 CAMPO RECURSIVO: Este campo aparecerá na API e conterá a lista de respostas.
    respostas = serializers.SerializerMethodField()
    
    class Meta:
        model = Comentario
        # Incluímos 'respostas' no fields
        fields = [
            'id', 'norma_cliente', 'usuario', 'usuario_nome', 
            'comentario_pai', 'descricao', 'comentario', 
            'data_criacao', 'respostas'
        ]

        # 'usuario' e 'norma_cliente' são definidos pela View
        read_only_fields = ['usuario', 'norma_cliente']
        
    def get_usuario_nome(self, obj):
        # Garante que o nome completo seja retornado
        return obj.usuario.get_full_name()
    
    # 🎯 NOVO MÉTODO CRÍTICO: Define o conteúdo do campo 'respostas'
    def get_respostas(self, obj):
        # O obj.respostas.all() usa o related_name que definimos no model para buscar os filhos.
        # Recursivamente, serializa esses filhos usando a mesma classe ComentarioSerializer.
        
        # 💡 CRÍTICO: Usamos 'obj.respostas.all()' que busca os filhos DESTE objeto.
        # Passamos a lista de filhos para o Serializer, garantindo que o neto seja incluído no payload.
        serializer = ComentarioSerializer(obj.respostas.all(), many=True)
        return serializer.data

# No final de gestao_normas/serializers.py

class AuditoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Auditoria
        fields = ['id', 'nome', 'descricao', 'data_auditoria', 'normas']

class CertificacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certificacao
        fields = ['id', 'nome', 'descricao', 'data_inicio', 'data_termino', 'normas']

class CentroDeCustoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CentroDeCusto
        fields = ['id', 'nome', 'descricao', 'normas']

# Adicionado para a tela de Acervo Técnico (Vínculos)
class AuditoriaVinculadaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Auditoria
        fields = ['nome', 'data_auditoria']

class CertificacaoVinculadaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certificacao
        fields = ['nome', 'data_termino']

class CentroDeCustoVinculadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CentroDeCusto
        fields = ['nome']