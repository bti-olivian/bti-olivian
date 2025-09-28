from django.db import models
from django.contrib.auth.models import User

# MODELO 1: O CLIENTE (A EMPRESA)
class Cliente(models.Model):
    empresa = models.CharField(max_length=200)
    cnpj = models.CharField(max_length=14, unique=True, help_text="Somente numeros")
    dominio = models.CharField(max_length=100, help_text="Ex: google.com")
    endereco = models.CharField(max_length=200, help_text="Ex: Avenida Lauro Gomes, 5901")
    bairro = models.CharField(max_length=100, blank=True)
    cidade = models.CharField(max_length=100)
    estado = models.CharField(max_length=2)
    cep = models.CharField(max_length=8, help_text="Somente numeros")
    telefone = models.CharField(max_length=11, help_text="Somente numeros (incluir DDD)")
    data_registro = models.DateField(auto_now_add=True)
    vigencia_contratual_inicio = models.DateField(null=True, blank=True) # <-- CAMPO ADICIONADO
    vigencia_contratual_fim = models.DateField(null=True, blank=True) # <-- CAMPO ADICIONADO
        
    def __str__(self):
        return self.empresa

# MODELO 2: A NORMA
# Definicoes para campos com escolhas (mantenha as que precisar)
IDIOMA_CHOICES = [
    ('ingles', 'Ingles'),
    ('portugues', 'Portugues'),
]

FORMATO_CHOICES = [
    ('digital', 'Digital'),
    ('impresso', 'Impresso'),
]

class Norma(models.Model):
    organizacao = models.CharField(max_length=200, help_text="Ex: ABNT, ISO, GM", default='N/A')
    norma = models.CharField(max_length=50, unique=True, help_text="O numero ou codigo da norma, ex: GMW3059", default='N/A')
    revisao_atual = models.DateField(help_text="A versao da revisao atual, ex: 06/06/2000", null=False, blank=False)
    idioma = models.CharField(max_length=20, choices=IDIOMA_CHOICES, default='portugues')
    titulo = models.CharField(max_length=200, blank=True, null=True)
    formato = models.CharField(max_length=20, choices=FORMATO_CHOICES, default='digital')
    observacoes = models.TextField(max_length=200, blank=True, null=True, help_text="Observacoes internas sobre a norma.")
    
    clientes = models.ManyToManyField('Cliente', through='NormaCliente')
    
    def __str__(self):
        return f"{self.organizacao} - {self.norma}"

# MODELO 3: O RELACIONAMENTO ENTRE NORMA E CLIENTE
class NormaCliente(models.Model):
    cliente = models.ForeignKey('Cliente', on_delete=models.CASCADE)
    norma = models.ForeignKey('Norma', on_delete=models.CASCADE)
    data_revisao_cliente = models.DateField(help_text="Data da ultima revisao desta norma no cliente.")

    class Meta:
        unique_together = ('cliente', 'norma')

    def __str__(self):
        return f"Revisao da Norma '{self.norma.norma}' para o Cliente '{self.cliente.empresa}'"

# MODELO 4: O PERFIL DO USUARIO DO CLIENTE
class PerfilUsuario(models.Model):
    usuario = models.OneToOneField(User, on_delete=models.CASCADE)
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE)
    is_admin_cliente = models.BooleanField(default=False)
    normas_favoritas = models.ManyToManyField(Norma, blank=True, related_name='favoritado_por')

    def __str__(self):
        return self.usuario.username
    
# MODELO 5: HISToRICO DE REVISaO SECUNDARIA
REVISAO_SECUNDARIA_CHOICES = [
    ('errata', 'Errata'),
    ('reafirmacao', 'Reafirmacao'),
    ('ammendment', 'Ammendment'),
]

class RevisaoSecundariaHistorico(models.Model):
    norma = models.ForeignKey(Norma, on_delete=models.CASCADE)
    tipo_revisao = models.CharField(max_length=50, choices=REVISAO_SECUNDARIA_CHOICES)
    data = models.DateField()

    def __str__(self):
        return f"Revisao SecundAria: {self.tipo_revisao} em {self.data} para {self.norma.norma}"
    
class Notificacao(models.Model):
    # O usuArio que receberA a notificacao
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notificacoes')
    
    # O objeto ao qual a notificacao se refere (neste caso, uma Norma)
    norma = models.ForeignKey(Norma, on_delete=models.CASCADE, related_name='notificacoes')
    
    # A mensagem da notificacao
    mensagem = models.TextField()
    
    # Se a notificacao jA foi visualizada
    visualizada = models.BooleanField(default=False)
    
    # A data e hora da criacao da notificacao
    data_criacao = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Notificacao para {self.usuario.username} sobre {self.norma.norma}"
    
    # Em gestao_normas/models.py

class Comentario(models.Model):
    # ALTERADO: Agora o comentArio pertence a uma relacao Norma-Cliente
    norma_cliente = models.ForeignKey(NormaCliente, on_delete=models.CASCADE, related_name='comentarios')
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    descricao = models.CharField(max_length=100, blank=True)
    comentario = models.TextField()
    data_criacao = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'ComentArio de {self.usuario.username} em {self.norma_cliente.norma.norma}'
    
# No final de gestao_normas/models.py

class Auditoria(models.Model):
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='auditorias')
    nome = models.CharField(max_length=200)
    descricao = models.TextField(blank=True)
    data_auditoria = models.DateField()
    normas = models.ManyToManyField(Norma, blank=True)

    def __str__(self):
        return f"Auditoria '{self.nome}' do cliente {self.cliente.empresa}"

class Certificacao(models.Model):
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='certificacoes')
    nome = models.CharField(max_length=200)
    descricao = models.TextField(blank=True)
    data_inicio = models.DateField()
    data_termino = models.DateField()
    normas = models.ManyToManyField(Norma, blank=True)

    def __str__(self):
        return f"Certificacao '{self.nome}' do cliente {self.cliente.empresa}"

class CentroDeCusto(models.Model):
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='centros_de_custo')
    nome = models.CharField(max_length=200)
    descricao = models.TextField(blank=True)
    normas = models.ManyToManyField(Norma, blank=True)

    def __str__(self):
        return f"Centro de Custo '{self.nome}' do cliente {self.cliente.empresa}"