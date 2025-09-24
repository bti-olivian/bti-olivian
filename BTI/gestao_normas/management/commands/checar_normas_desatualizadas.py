from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date
from gestao_normas.models import NormaCliente, Notificacao

class Command(BaseCommand):
    help = 'Verifica normas desatualizadas e cria notificações para os clientes.'

    def handle(self, *args, **options):
        self.stdout.write("Iniciando a verificação de normas desatualizadas...")

        # Encontra todas as relações entre clientes e normas
        normas_clientes = NormaCliente.objects.all()
        notificacoes_criadas = 0

        for relacao in normas_clientes:
            norma = relacao.norma
            cliente = relacao.cliente
            data_publicacao_oficial = norma.data_publicacao
            data_revisao_cliente = relacao.data_revisao_cliente

            # Verifica se a norma oficial é mais recente que a do cliente
            if data_publicacao_oficial > data_revisao_cliente:
                # Encontra o usuário do cliente para quem a notificação será
                # enviada (assumindo que há um administrador por cliente)
                usuario_notificacao = cliente.perfilusuario_set.first().usuario

                # Verifica se já existe uma notificação para a mesma norma e usuário
                if not Notificacao.objects.filter(
                    usuario=usuario_notificacao,
                    norma=norma,
                    visualizada=False,
                    data_criacao__date=timezone.now().date()
                ).exists():
                    # Cria a notificação
                    mensagem = (f"A norma {norma.organizacao} - {norma.norma} "
                                f"foi atualizada em {data_publicacao_oficial}. "
                                f"A sua versão é de {data_revisao_cliente}.")

                    Notificacao.objects.create(
                        usuario=usuario_notificacao,
                        norma=norma,
                        mensagem=mensagem
                    )
                    notificacoes_criadas += 1

        self.stdout.write(self.style.SUCCESS(
            f'Verificação concluída. {notificacoes_criadas} novas notificações criadas.'
        ))