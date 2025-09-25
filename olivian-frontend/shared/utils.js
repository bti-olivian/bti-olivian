// olivian-frontend/shared/utils.js

function formatarCNPJ(cnpj) {
    if (!cnpj) return '';
    const numeros = cnpj.replace(/\D/g, '');
    if (numeros.length !== 14) {
        return cnpj;
    }
    return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

// Você pode adicionar outras funções úteis aqui no futuro (ex: formatarCPF, formatarTelefone, etc.)