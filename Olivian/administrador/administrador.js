document.addEventListener('DOMContentLoaded', () => {
    const table = document.querySelector('table');
    const rows = table.querySelectorAll('tbody tr');
    
    const filterUser = document.getElementById('filter-user');

    const alterarBtn = document.getElementById('alterar-acessos');
    const aplicarBtn = document.getElementById('aplicar-alteracoes');
    const cancelarBtn = document.getElementById('cancelar-alteracoes');
    
    const columnHeaders = document.querySelectorAll('.column-with-hover');

    let originalState = [];
    const columnCheckboxesMap = new Map();

    function updateAllVisuals() {
        table.querySelectorAll('.hidden-checkbox').forEach(updateCustomCheckboxDisplay);
    }
    
    function updateCustomCheckboxDisplay(checkboxInput) {
        // Esta função não é mais necessária, pois o CSS agora lida com o estado visual
        // usando o seletor :checked. Mantida caso precise de lógica futura.
    }

    columnHeaders.forEach((header, index) => {
        const label = document.createElement('label');
        label.classList.add('custom-checkbox');

        const hiddenCheckbox = document.createElement('input');
        hiddenCheckbox.type = 'checkbox';
        hiddenCheckbox.classList.add('hidden-checkbox', 'select-all-column');

        const displaySpan = document.createElement('span');
        displaySpan.classList.add('checkbox-display');

        label.appendChild(hiddenCheckbox);
        label.appendChild(displaySpan);
        header.appendChild(label);
        
        columnCheckboxesMap.set(header, hiddenCheckbox);

        hiddenCheckbox.addEventListener('change', (e) => {
            if (table.classList.contains('permissions-blocked')) {
                e.preventDefault();
                return;
            }
            const columnIndex = index + 2;
            const isChecked = e.target.checked;
            
            rows.forEach(row => {
                if (row.style.display !== 'none') { // Aplica apenas às linhas visíveis
                    const permissionCheckbox = row.cells[columnIndex].querySelector('.hidden-checkbox');
                    if (permissionCheckbox) {
                        permissionCheckbox.checked = isChecked;
                    }
                }
            });
        });
    });

    function captureState() {
        const state = [];
        table.querySelectorAll('tbody .hidden-checkbox').forEach(checkbox => {
            state.push(checkbox.checked);
        });
        return state;
    }

    function restoreState(state) {
        table.querySelectorAll('tbody .hidden-checkbox').forEach((checkbox, index) => {
            checkbox.checked = state[index];
        });
    }

    function setEditable(isEditable) {
        table.classList.toggle('permissions-blocked', !isEditable);
        const allCheckboxes = table.querySelectorAll('.hidden-checkbox');
        allCheckboxes.forEach(checkbox => {
            checkbox.disabled = !isEditable;
        });
    }

    function initialize() {
        setEditable(false);
        originalState = captureState();
        aplicarBtn.style.display = 'none';
        cancelarBtn.style.display = 'none';
        alterarBtn.style.display = 'inline-block';
    }

    alterarBtn.addEventListener('click', () => {
        setEditable(true);
        aplicarBtn.style.display = 'inline-block';
        cancelarBtn.style.display = 'inline-block';
        alterarBtn.style.display = 'none';
    });

    aplicarBtn.addEventListener('click', () => {
        setEditable(false);
        originalState = captureState();
        aplicarBtn.style.display = 'none';
        cancelarBtn.style.display = 'none';
        alterarBtn.style.display = 'inline-block';
        alert('Alterações aplicadas!');
    });

    cancelarBtn.addEventListener('click', () => {
        restoreState(originalState);
        setEditable(false);
        aplicarBtn.style.display = 'none';
        cancelarBtn.style.display = 'none';
        alterarBtn.style.display = 'inline-block';
        alert('Alterações canceladas!');
    });

    function filterTable() {
        const userValue = filterUser.value.toLowerCase();
        rows.forEach(row => {
            const userName = row.cells[1].textContent.toLowerCase();
            row.style.display = userName.includes(userValue) ? '' : 'none';
        });
    }

    table.querySelectorAll('.select-all-row').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            if (table.classList.contains('permissions-blocked')) {
                e.preventDefault();
                return;
            }
            const row = e.target.closest('tr');
            const isChecked = e.target.checked;
            const permissionCheckboxes = row.querySelectorAll('td .hidden-checkbox:not(.select-all-row)');
            
            permissionCheckboxes.forEach(permissionCb => {
                permissionCb.checked = isChecked;
            });
        });
    });

    filterUser.addEventListener('input', filterTable);
    initialize();
});