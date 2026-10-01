import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { WasteContainer, ContainerStatus, CitizenProfile, ResolvedIncident } from '../types';

interface PdfReportOptions {
  containers: WasteContainer[];
  citizens: CitizenProfile[];
  stats: {
    daily: number;
    weekly: number;
    yearly: number;
    operatorRanking: {
      name: string;
      daily: number;
      weekly: number;
      monthly: number;
      yearly: number;
    }[];
  };
  supportNumber: string;
}

export const generateOperationalPdfReport = ({
  containers,
  citizens,
  stats,
  supportNumber
}: PdfReportOptions) => {
  const doc = new jsPDF();
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-MZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const timeStr = now.toLocaleTimeString('pt-MZ', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Cabeçalho Municipal
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 38, 'F');

  // Faixa de destaque dourada Gondola
  doc.setFillColor(234, 179, 8); // yellow-500
  doc.rect(0, 38, 210, 3, 'F');

  // Título e Subtítulos
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('MUNICÍPIO DE GONDOLA - LIMPA-LAAA', 14, 16);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('Relatório Oficial de Gestão de Resíduos e Monitoramento Operacional', 14, 23);

  doc.setFontSize(8);
  doc.setTextColor(250, 204, 21); // yellow-400
  doc.text(`Presidente Arlindo Cesario Ngozo • Emitido em: ${dateStr} às ${timeStr} • Linha Verde: ${supportNumber}`, 14, 30);

  // Resumo Geral (KPIs)
  const totalContainers = containers.length;
  const alertContainers = containers.filter(c => c.status === ContainerStatus.ALERT).length;
  const normalContainers = containers.filter(c => c.status === ContainerStatus.NORMAL).length;
  const criticalContainers = containers.filter(c => (c.reportCount || 0) >= 3).length;

  let currentY = 48;

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. RESUMO EXECUTIVO E INDICADORES (KPIS)', 14, currentY);

  currentY += 6;

  const kpiData = [
    ['Total de Ativos / Contentores', `${totalContainers}`],
    ['Contentores Operacionais / Normais', `${normalContainers}`],
    ['Contentores em Alerta (Lotação/Denúncia)', `${alertContainers}`],
    ['Contentores Críticos (>= 3 alertas)', `${criticalContainers}`],
    ['Coletas Efetuadas Hoje', `${stats.daily}`],
    ['Coletas Efetuadas nos Últimos 7 Dias', `${stats.weekly}`],
    ['Total Acumulado de Coletas Anuais', `${stats.yearly}`],
    ['Cidadãos Registados no Sistema', `${citizens.length}`]
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Indicador Operacional', 'Valor / Total']],
    body: kpiData,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  // Tabela de Contentores
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. ESTADO DOS CONTENTORES MUNICIPAIS', 14, currentY);

  currentY += 6;

  const containerRows = containers.map(c => [
    c.id,
    c.neighborhood,
    `${c.avenue || ''} - Q.${c.block || ''} (${c.referencePoint || 'Sem ref.'})`,
    c.status === ContainerStatus.ALERT ? 'EM ALERTA' : 'NORMAL',
    `${c.reportCount || 0}`,
    c.lastReportedAt ? new Date(c.lastReportedAt).toLocaleDateString('pt-MZ') : '-'
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['ID', 'Bairro', 'Endereço / Ponto de Referência', 'Estado', 'Denúncias', 'Último Registo']],
    body: containerRows,
    theme: 'striped',
    headStyles: { fillColor: [202, 138, 4], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: {
      3: { fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      if (data.column.index === 3) {
        if (data.cell.raw === 'EM ALERTA') {
          data.cell.styles.textColor = [220, 38, 38]; // red
        } else {
          data.cell.styles.textColor = [22, 101, 52]; // green
        }
      }
    },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  // Caso ultrapasse a página, o autoTable gera nova página. Se for próximo ao fundo, adicionamos página
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  // Tabela de Desempenho dos Operadores
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('3. DESEMPENHO E RANKING DA EQUIPE DE SANEAMENTO', 14, currentY);

  currentY += 6;

  const operatorRows = stats.operatorRanking.map((op, idx) => [
    `${idx + 1}º`,
    op.name,
    `${op.daily}`,
    `${op.weekly}`,
    `${op.monthly}`,
    `${op.yearly}`
  ]);

  if (operatorRows.length === 0) {
    operatorRows.push(['-', 'Nenhuma coleta registrada', '0', '0', '0', '0']);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['Posição', 'Operador', 'Hoje', '7 Dias', 'Mensal', 'Acumulado Anual']],
    body: operatorRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2.5 },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  // Base de Cidadãos Registados
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`4. REGISTO DE CIDADÃOS ATIVOS (${citizens.length})`, 14, currentY);

  currentY += 6;

  const citizenRows = citizens.map((c, i) => [
    `${i + 1}`,
    c.name,
    `${c.neighborhood || ''} - ${c.zone || ''}`,
    c.contact
  ]);

  if (citizenRows.length === 0) {
    citizenRows.push(['-', 'Nenhum cidadão cadastrado até o momento', '-', '-']);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Nome do Munícipe', 'Bairro / Zona', 'Telefone / Contacto']],
    body: citizenRows,
    theme: 'striped',
    headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2.5 },
    margin: { left: 14, right: 14 }
  });

  // Rodapé em todas as páginas
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `LIMPA-LAAA • Conselho Municipal da Cidade de Gondola • Página ${i} de ${pageCount}`,
      14,
      290
    );
    doc.text(
      'Documento Gerado para FINS OPERACIONAIS E ADMINISTRATIVOS',
      210 - 14,
      290,
      { align: 'right' }
    );
  }

  // Nome do ficheiro descritivo
  const filename = `Relatorio_Operacional_Gondola_${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}.pdf`;
  doc.save(filename);
};

export const generateResolvedIncidentPdf = (
  incident: ResolvedIncident,
  supportNumber: string
) => {
  const doc = new jsPDF();
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });

  // Cabeçalho Municipal
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 40, 'F');

  // Faixa Dourada Gondola
  doc.setFillColor(234, 179, 8); // yellow-500
  doc.rect(0, 40, 210, 3, 'F');

  // Textos Cabeçalho
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('MUNICÍPIO DE GONDOLA - LIMPA-LAAA', 14, 16);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('COMPROVATIVO OFICIAL DE OCORRÊNCIA RESOLVIDA & COLHEITA', 14, 23);

  doc.setFontSize(8);
  doc.setTextColor(250, 204, 21); // yellow-400
  doc.text(`Iniciativa: Presidente Arlindo Cesario Ngozo • Emissão: ${dateStr} às ${timeStr} • Linha Verde: ${supportNumber}`, 14, 31);

  let currentY = 50;

  // 1. Resumo da Ocorrência e Contentor
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('1. DADOS DE IDENTIFICAÇÃO DO ATIVO E LOCALIZAÇÃO', 14, currentY);
  currentY += 5;

  const containerDetails = [
    ['ID do Contentor', incident.containerId || '-'],
    ['Bairro Principal', incident.neighborhood || '-'],
    ['Avenida / Rua', incident.avenue || '-'],
    ['Quarteirão', incident.block || '-'],
    ['Ponto de Referência', incident.referencePoint || 'Sem referência'],
    ['Coordenadas GPS', incident.latitude && incident.longitude ? `${incident.latitude.toFixed(5)}, ${incident.longitude.toFixed(5)}` : 'Não mapeado']
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Propriedade', 'Informação Registrada']],
    body: containerDetails,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 9;

  // 2. Dados da Colheita e Operador
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. REGISTRO DA COLHEITA E OPERADOR RESPONSÁVEL', 14, currentY);
  currentY += 5;

  const collectionDetails = [
    ['Operador Responsável', incident.operator || 'Equipe de Saneamento Municipal'],
    ['Data e Hora da Coleta', new Date(incident.collectedAt).toLocaleString('pt-MZ')],
    ['Primeira Denúncia Recebida', new Date(incident.firstReportAt).toLocaleString('pt-MZ')],
    ['Último Reforço de Denúncia', new Date(incident.lastReportAt).toLocaleString('pt-MZ')],
    ['Tempo Total de Resposta', incident.durationMinutes ? `${incident.durationMinutes} minutos` : 'Atendimento imediato'],
    ['Status da Resolução', 'CONCLUÍDO • Contentor esvaziado e operacional']
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Item Operacional', 'Resultado da Execução']],
    body: collectionDetails,
    theme: 'grid',
    headStyles: { fillColor: [22, 101, 52], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 9;

  // 3. Informações de Quem Fez a Denúncia (Todas as pessoas que denunciaram)
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`3. MUNÍCIPES QUE FIZERAM A DENÚNCIA (${incident.reporters?.length || incident.totalReports || 1} PESSOAS)`, 14, currentY);
  currentY += 5;

  const reportersList = (incident.reporters && incident.reporters.length > 0)
    ? incident.reporters.map((rep, idx) => [
        `${idx + 1}º`,
        rep.citizenName || 'Munícipe Anónimo',
        rep.citizenContact || 'Não informado',
        rep.citizenNeighborhood ? `${rep.citizenNeighborhood}${rep.citizenZone ? ` (${rep.citizenZone})` : ''}` : (incident.neighborhood || '-'),
        new Date(rep.reportedAt).toLocaleDateString('pt-MZ') + ' às ' + new Date(rep.reportedAt).toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        rep.note || 'Lotação máxima do contentor'
      ])
    : [
        ['1º', 'Munícipe Registrado', '840000000', incident.neighborhood, new Date(incident.firstReportAt).toLocaleString('pt-MZ'), 'Lotação de resíduos']
      ];

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Nome do Denunciante', 'Contacto', 'Bairro / Zona', 'Data & Hora da Denúncia', 'Observação']],
    body: reportersList,
    theme: 'striped',
    headStyles: { fillColor: [202, 138, 4], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2.5 },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  if (currentY > 230) {
    doc.addPage();
    currentY = 25;
  }

  // Bloco de Autenticação / Assinatura Municipal
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, 182, 32, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, 182, 32, 3, 3, 'S');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('CERTIFICAÇÃO DO CONSELHO MUNICIPAL DA CIDADE DE GONDOLA', 20, currentY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Atesta-se que esta colheita foi concluída pelo operador municipal ${incident.operator}, em conformidade com as normas sanitárias e ambientais do município sob a direção do Presidente Arlindo Cesario Ngozo
Identidade visual de Pesquisa do Copilot

Curtir

Identidade visual de Pesquisa do Copilot

Curtir

Não gosto. Todas as denúncias associadas foram arquivadas como resolvidas.`,
    20,
    currentY + 14,
    { maxWidth: 170 }
  );

  doc.text(`Identificador Único da Ocorrência: ${incident.id} • Hash de Arquivo: MZ-CHM-${incident.containerId}-${Date.now().toString(36).toUpperCase()}`, 20, currentY + 27);

  // Rodapé em todas as páginas
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`LIMPA-LAAA • Conselho Municipal de Gondola • Página ${i} de ${pageCount}`, 14, 290);
    doc.text('Comprovativo Oficial de Conclusão de Serviço', 210 - 14, 290, { align: 'right' });
  }

  const safeName = `Comprovativo_Ocorrencia_${incident.containerId}_${incident.id}.pdf`;
  doc.save(safeName);
};

export const generateResolvedFolderPdf = (
  incidents: ResolvedIncident[],
  supportNumber: string
) => {
  const doc = new jsPDF();
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });

  // Cabeçalho Municipal
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 40, 'F');

  doc.setFillColor(234, 179, 8); // yellow-500
  doc.rect(0, 40, 210, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('MUNICÍPIO DE GONDOLA - ARQUIVO DE DENÚNCIAS RESOLVIDAS', 14, 16);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Histórico Geral de Colheitas, Operadores Designados e Munícipes Denunciantes', 14, 23);

  doc.setFontSize(8);
  doc.setTextColor(250, 204, 21);
  doc.text(`Presidente Arlindo Cesario Ngozo • Emissão: ${dateStr} às ${timeStr} • Total de Ocorrências: ${incidents.length}`, 14, 31);

  let currentY = 50;

  // Resumo
  const totalReporters = incidents.reduce((acc, curr) => acc + (curr.reporters?.length || curr.totalReports || 1), 0);
  const uniqueOperators = new Set(incidents.map(i => i.operator)).size;
  const uniqueBairros = new Set(incidents.map(i => i.neighborhood)).size;

  const folderStats = [
    ['Total de Colheitas Registadas', `${incidents.length}`],
    ['Total de Munícipes que Denunciaram', `${totalReporters}`],
    ['Bairros Beneficiados', `${uniqueBairros}`],
    ['Operadores Ativos Envolvidos', `${uniqueOperators}`]
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Métrica de Atendimento', 'Consolidado']],
    body: folderStats,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 9;

  // Tabela Geral de Todas as Ocorrências Resolvidas
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('RELAÇÃO COMPLETA DAS COLHEITAS E DENÚNCIAS ATENDIDAS', 14, currentY);
  currentY += 5;

  const rows = incidents.map(inc => {
    const reporterNames = (inc.reporters || [])
      .map(r => `${r.citizenName} (${new Date(r.reportedAt).toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' })})`)
      .join(', ') || 'Munícipe de Gondola';

    return [
      inc.containerId,
      inc.neighborhood,
      inc.operator,
      new Date(inc.collectedAt).toLocaleDateString('pt-MZ') + ' ' + new Date(inc.collectedAt).toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' }),
      `${inc.reporters?.length || inc.totalReports || 1}`,
      reporterNames,
      inc.durationMinutes ? `${inc.durationMinutes} min` : '-'
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['ID', 'Bairro', 'Operador', 'Data da Colheita', 'Pessoas', 'Denunciantes e Horas', 'Duração']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 7.5, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold' },
      2: { fontStyle: 'bold' },
      5: { cellWidth: 55 }
    },
    margin: { left: 14, right: 14 }
  });

  // Rodapé em todas as páginas
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`LIMPA-LAAA • Conselho Municipal da Cidade de Dondola • Página ${i} de ${pageCount}`, 14, 290);
    doc.text('Arquivo Oficial de Denúncias e Coletas Resolvidas', 210 - 14, 290, { align: 'right' });
  }

  const safeName = `Pasta_Denuncias_Resolvidas_Gondola_${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}.pdf`;
  doc.save(safeName);
};
