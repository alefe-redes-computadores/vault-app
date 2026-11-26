/** Proposed additions to HEALTH_REMINDER_TARGETS. No scheduler, no action before route registration/handoff. */
export const VITAL_REMINDER_TARGETS = [
    { type: 'vital:training', route: '/saude/vital/treinos', label: 'Treino', description: 'Abrir a rotina de treinos.' },
    { type: 'vital:rest', route: '/saude/vital/treinos', label: 'Descanso planejado', description: 'Revisar a rotina declarada.' },
    { type: 'vital:meal', route: '/saude/vital/nutricao', label: 'Refeição', description: 'Abrir o diário alimentar.' },
    { type: 'vital:nutrition_checkin', route: '/saude/vital/nutricao', label: 'Check-in alimentar', description: 'Abrir a autoavaliação opcional.' },
    { type: 'vital:goals', route: '/saude/vital/planos', label: 'Planos e metas', description: 'Revisar os planos escolhidos.' }
] as const;
/** Water and weight reuse existing targets; do not add aliases to competing writer. */
export const REUSED_REMINDER_TARGETS = { hydration: { type: 'health_record:agua', route: '/saude/hidratacao' }, weight: { type: 'health_record:medicao', route: '/saude/registros/novo?preset=medicao' } } as const;
