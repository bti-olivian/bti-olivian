from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (Cliente, Norma, NormaCliente, PerfilUsuario, RevisaoSecundariaHistorico, Notificacao, Comentario, Auditoria, Certificacao, CentroDeCusto)
from datetime import date, datetime
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import password_validation
from django.utils.translation import gettext_lazy as _

User = get_user_model()

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

# Em gestao_normas/serializers.py

# Dentro da classe NormaSerializer:
    def get_comentarios_count(self, obj):
        # obj aqui e uma instancia de Norma
        request = self.context.get('request')
        if request and hasattr(request, "user") and request.user.is_authenticated:
            try:
                # Encontra a relacao NormaCliente para a norma atual e o usuario logado
                norma_cliente = NormaCliente.objects.get(norma=obj, cliente=request.user.perfilusuario.cliente)
                # Conta os comentarios dessa relacao especifica
                return norma_cliente.comentarios.count()
            except (NormaCliente.DoesNotExist, PerfilUsuario.DoesNotExist):
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
            except (PerfilUsuario.DoesNotExist, NormaCliente.DoesNotExist):
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
        except (PerfilUsuario.DoesNotExist, NormaCliente.DoesNotExist):
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

# Serializador para o perfil de usuario
class PerfilUsuarioSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='usuario.username', read_only=True)
    email = serializers.EmailField(source='usuario.email', read_only=True)

    class Meta:
        model = PerfilUsuario
        fields = ['username', 'email', 'is_admin_cliente', 'cliente']

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
User = get_user_model()

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
    
# Adicione esta classe no final de gestao_normas/serializers.py

# Em gestao_normas/serializers.py

class ComentarioSerializer(serializers.ModelSerializer):
    # Traz o nome do usuario que fez o comentario (apenas para leitura)
    usuario_nome = serializers.CharField(source='usuario.get_full_name', read_only=True)

    class Meta:
        model = Comentario
        fields = ['id', 'norma_cliente', 'usuario', 'usuario_nome', 'descricao', 'comentario', 'data_criacao']

        # --- AQUI ESTa A CORREcaO CRiTICA ---
        # Esta linha diz ao serializador para NaO exigir 'usuario' e 'norma_cliente' do frontend,
        # pois eles serao adicionados no backend (na sua View).
        read_only_fields = ['usuario', 'norma_cliente']

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