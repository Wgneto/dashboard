// ----- Variáveis globais -----
let dataRaw = [];
let dataFiltered = [];
let tableHeaders = [];
let charts = {};

const obrigatorias = [
    'Número','Data','Assunto Geral','Descrição do Caso','Como chegou','Assunto do e-mail','Quem Intermediou',
    'Quem enviou','Interessado','Contribuinte','Processo Adm.','Resolução','Observações'
];

// Função para checar as colunas obrigatórias
function validarColunas(cols) {
    return obrigatorias.every(col => cols.includes(col));
}

// Função para atualizar os cards resumo
function atualizarResumo() {
    document.getElementById('totalAtendimentos').textContent = dataFiltered.length;
    document.getElementById('linhasCarregadas').textContent = dataRaw.length;
}

// Função para atualizar status
function status(msg, ok=true) {
    const el = document.getElementById('statusMsg');
    el.textContent = msg;
    el.style.color = ok ? "#27ae60" : "#c0392b";
}

// --------- Geração de Gráficos ------------
function gerarGrafico(id, label, labels, data) {
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(document.getElementById(id), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label,
                data,
                backgroundColor: '#3498dbb9',
                borderRadius: 6
            }]
        },
        options: {
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { ticks: { color: '#333' } },
                y: { beginAtZero: true, ticks: { stepSize: 1, color: '#333' } }
            }
        }
    });
}

function atualizarGraficos() {
    // Por Assunto Geral
    let assunto = {};
    let comoChegou = {};
    let intermediou = {};

    dataFiltered.forEach(row => {
        assunto[row['Assunto Geral']] = (assunto[row['Assunto Geral']] || 0) + 1;
        comoChegou[row['Como chegou']] = (comoChegou[row['Como chegou']] || 0) + 1;
        intermediou[row['Quem Intermediou']] = (intermediou[row['Quem Intermediou']] || 0) + 1;
    });

    // Gráfico Assunto Geral
    gerarGrafico('assuntoChart', 'Assunto Geral',
        Object.keys(assunto), Object.values(assunto));
    // Gráfico Como Chegou
    gerarGrafico('comoChegouChart', 'Como Chegou',
        Object.keys(comoChegou), Object.values(comoChegou));
    // Gráfico Quem Intermediou
    gerarGrafico('quemIntermediouChart', 'Quem Intermediou',
        Object.keys(intermediou), Object.values(intermediou));
}

// ----------- Tabela --------------
function exibirTabela() {
    const thead = document.querySelector('#dataTable thead');
    const tbody = document.querySelector('#dataTable tbody');
    thead.innerHTML = '';
    tbody.innerHTML = '';

    // Cabeçalhos
    let headRow = '<tr>';
    tableHeaders.forEach(h => {
        headRow += `<th>${h}</th>`;
    });
    headRow += '</tr>';
    thead.innerHTML = headRow;

    // Linhas
    dataFiltered.forEach(row => {
        let tr = '<tr>';
        tableHeaders.forEach(h => {
            tr += `<td>${row[h] || ''}</td>`;
        });
        tr += '</tr>';
        tbody.innerHTML += tr;
    });
}

// ------------- Filtro por Data -------------
function filtrarPorData() {
    const inicio = document.getElementById('startDate').value;
    const fim = document.getElementById('endDate').value;

    if (!inicio && !fim) {
        dataFiltered = dataRaw.slice();
    } else {
        dataFiltered = dataRaw.filter(row => {
            let dt = row['Data'];
            // Ajustar formato (pode ser dd/mm/aaaa ou aaaa-mm-dd)
            if (!dt) return false;
            let [d, m, a] = dt.split('/');
            if (a && a.length === 4) dt = `${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            let dataISO = /^\d{4}-\d{2}-\d{2}$/.test(dt) ? dt : null;
            if (!dataISO) return false;
            if (inicio && dt < inicio) return false;
            if (fim && dt > fim) return false;
            return true;
        });
    }
    atualizarResumo();
    atualizarGraficos();
    exibirTabela();
}

// ----------- Upload CSV -------------
document.getElementById('csvFile').addEventListener('change', function(e){
    const file = e.target.files[0];
    if (!file) return;

    status("Carregando arquivo...", true);

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        encoding: "utf-8",
        complete: function(results) {
            if (!results.data || results.data.length === 0) {
                status("Arquivo vazio ou formato inválido!", false);
                return;
            }

            // Corrigir possíveis espaços extras no header
            tableHeaders = results.meta.fields.map(h => h.trim());
            if (!validarColunas(tableHeaders)) {
                status("Arquivo não possui as colunas obrigatórias!", false);
                return;
            }

            // Ajusta headers nos dados
            dataRaw = results.data.map(row => {
                let newRow = {};
                tableHeaders.forEach(h => newRow[h] = row[h] || '');
                return newRow;
            });

            dataFiltered = dataRaw.slice();
            document.getElementById('resumoSection').style.display = '';
            document.getElementById('tabelaSection').style.display = '';
            status("Arquivo carregado com sucesso! (" + dataRaw.length + " linhas)");
            atualizarResumo();
            atualizarGraficos();
            exibirTabela();
        },
        error: function() {
            status("Erro ao ler o arquivo!", false);
        }
    });
});

// Botão filtrar período
document.getElementById('filterBtn').addEventListener('click', filtrarPorData);
