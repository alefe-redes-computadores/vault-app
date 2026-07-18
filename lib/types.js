"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOCUMENT_FIELDS = exports.CATEGORY_META = exports.AREAS = exports.CATEGORIES = void 0;
exports.CATEGORIES = {
    saude: {
        id: 'saude',
        name: 'Saúde',
        icon: 'Heart',
        color: '#EC4899',
        description: 'Prontuários, receitas, laudos, medicamentos',
    },
    pessoal: {
        id: 'pessoal',
        name: 'Pessoal',
        icon: 'User',
        color: '#3B82F6',
        description: 'RG, CPF, CNH, carteira de trabalho',
    },
    empresa: {
        id: 'empresa',
        name: 'Empresa',
        icon: 'Building2',
        color: '#F59E0B',
        description: 'Documentos corporativos',
    },
    outros: {
        id: 'outros',
        name: 'Outros',
        icon: 'FolderOpen',
        color: '#6B7280',
        description: 'Documentos diversos',
    },
};
// ============================================================
// 2.1 ALIAS PARA COMPATIBILIDADE (AREAS e CATEGORY_META)
// ============================================================
exports.AREAS = exports.CATEGORIES;
exports.CATEGORY_META = exports.CATEGORIES;
// ============================================================
// 3.1 CAMPOS POR TIPO DE DOCUMENTO (para formulário dinâmico)
// ============================================================
exports.DOCUMENT_FIELDS = {
    rg: [
        { key: 'number', label: 'Número do RG', type: 'text' },
        { key: 'issue_date', label: 'Data de emissão', type: 'date' },
        { key: 'expiry_date', label: 'Data de validade', type: 'date' },
        { key: 'issuer', label: 'Órgão emissor', type: 'text' },
    ],
    cpf: [{ key: 'number', label: 'Número do CPF', type: 'text' }],
    cnh: [
        { key: 'number', label: 'Número da CNH', type: 'text' },
        { key: 'category', label: 'Categoria', type: 'select', options: ['A', 'B', 'C', 'D', 'E'] },
        { key: 'issue_date', label: 'Data de emissão', type: 'date' },
        { key: 'expiry_date', label: 'Data de validade', type: 'date' },
    ],
    certificado: [
        { key: 'institution', label: 'Instituição de ensino', type: 'text' },
        { key: 'course', label: 'Curso', type: 'text' },
        { key: 'duration', label: 'Duração (ex: 120 horas)', type: 'text' },
        { key: 'completion_date', label: 'Data de conclusão', type: 'date' },
    ],
    receita: [
        { key: 'medication', label: 'Medicamento', type: 'text' },
        { key: 'dosage', label: 'Dosagem', type: 'text' },
        { key: 'doctor', label: 'Médico', type: 'text' },
        { key: 'pharmacy', label: 'Farmácia (opcional)', type: 'text' },
        { key: 'prescription_date', label: 'Data da receita', type: 'date' },
        { key: 'renewal_date', label: 'Próxima renovação', type: 'date' },
    ],
    prontuario: [
        { key: 'hospital', label: 'Hospital', type: 'text' },
        { key: 'doctor', label: 'Médico', type: 'text' },
        { key: 'specialty', label: 'Especialidade', type: 'text' },
        { key: 'date', label: 'Data', type: 'date' },
    ],
    laudo: [
        { key: 'doctor', label: 'Médico', type: 'text' },
        { key: 'specialty', label: 'Especialidade', type: 'text' },
        { key: 'hospital', label: 'Hospital', type: 'text' },
        { key: 'date', label: 'Data', type: 'date' },
    ],
    encaminhamento: [
        { key: 'from', label: 'Quem encaminhou', type: 'text' },
        { key: 'to', label: 'Para quem (opcional)', type: 'text' },
        { key: 'reason', label: 'Motivo', type: 'text' },
        { key: 'date', label: 'Data', type: 'date' },
    ],
    outro: [
        { key: 'custom_field_1', label: 'Campo personalizado 1', type: 'text' },
        { key: 'custom_field_2', label: 'Campo personalizado 2', type: 'text' },
    ],
};
