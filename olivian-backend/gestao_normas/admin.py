from django.contrib import admin
from .models import Cliente, Norma, NormaCliente, PerfilUsuario, RevisaoSecundariaHistorico, Notificacao, Comentario

# 1. PRIMEIRO, defina o Inline para Comentarios
class ComentarioInline(admin.TabularInline):
    model = Comentario
    extra = 1 # Mostra um campo para adicionar um novo comentario por padrao
    readonly_fields = ('usuario', 'data_criacao')
    fields = ('usuario', 'descricao', 'comentario', 'data_criacao')

# 2. DEPOIS, defina o Admin para NormaCliente e use o Inline criado acima
class NormaClienteAdmin(admin.ModelAdmin):
    list_display = ('norma', 'cliente', 'data_revisao_cliente')
    list_filter = ('cliente',)
    search_fields = ('norma__norma', 'cliente__empresa')
    inlines = [ComentarioInline] # Agora o Python ja sabe o que e ComentarioInline

# Outras classes Admin (a ordem delas nao importa)
class NormaAdmin(admin.ModelAdmin):
    list_display = ('id', 'organizacao', 'norma', 'titulo', 'revisao_atual')
    list_filter = ('organizacao', 'idioma', 'formato')
    search_fields = ('organizacao', 'norma', 'titulo')

class ClienteAdmin(admin.ModelAdmin):
    list_display = ('id', 'empresa', 'dominio', 'data_registro')
    list_filter = ('cidade', 'estado')
    search_fields = ('empresa', 'dominio', 'cnpj')


# 3. FINALMENTE, registre todos os seus modelos
admin.site.register(Cliente, ClienteAdmin)
admin.site.register(Norma, NormaAdmin)
admin.site.register(NormaCliente, NormaClienteAdmin) # Usa a classe personalizada
admin.site.register(PerfilUsuario)
admin.site.register(RevisaoSecundariaHistorico)
admin.site.register(Notificacao)
admin.site.register(Comentario)