# VAULT UX360 R3 QG1 — Integração sem duplicar Brain D3

**Base mínima GitHub:** `3608f9124284bcbf12a9d162f58b89612dfa1e94`, que já contém a D3 oficial (Brain pós-consulta e Cartão de Retorno). Esta cirurgia **não** cria outra D3 nem substitui `scripts/test-vault-ci360-p6-p3-d3.cjs`, `lib/m3/brain-return-d3.ts`, `components/saude/BrainReturnCardD3.tsx`, `ClinicalEpisodePulseP4` ou dados clínicos.

## Conclusão visual pretendida

- **Home:** Próxima etapa com ícone contextual único, documento/SUS em âmbar, descrição curta baseada em contexto documentado, cards principais alinhados e atalho CareFlow sem ícone colado ao título. Brain D3 publicado permanece a única autoridade de seguimento.
- **Explorar:** catálogo atualizado com nove destinos CareFlow existentes e contagem calculada; funcionalidades visíveis e pesquisáveis, sem gavetas escondidas. Favoritos e foco compartilham o armazenamento do Hub R5 por conta e pessoa, com estrela independente do link.
- **Mais:** Ferramentas avançadas em coluna única, sem truncamento em segurança/limpeza; bloco Pessoa ativa alinhado ao seletor e ao botão editar; cabeçalhos Preferências e Cofre coerentes.
- **CareFlow:** barra inferior no hub, ocultada nas telas de ação; retorno à origem segura com o `ClinicalBackLinkP0` já publicado; título visível humano.
- **Governança pública:** teste novo detecta versões/siglas técnicas nos cabeçalhos e confirma as integrações visuais essenciais. Identificadores de arquivos, commits, testes e documentação técnica **não** são renomeados.

## Segurança e etapas

1. `DIAGNOSTICAR-TUDO.sh`: clone local temporário, patch apenas no clone, todos os contratos V63 individualizados + V70 + TypeScript + `git diff --check`. Não modifica checkout real nem publica.
2. `APLICAR-VALIDAR.sh`: repete diagnóstico total. Só com zero falhas aplica em checkout com HEAD/origin/main coincidentes e reexecuta gates; backup e rollback seletivos.
3. `PUBLICAR.sh`: somente depois de aprovação, commit/push explícitos, allowlist, sem add -A, reset ou force push.

Sem SQL/DDL; sem mutação de estoque, receitas, eventos, consultas ou registros. Sem inferências clínicas ou mensagens automáticas. **Qualidade de prova:** checagens sintáticas locais não substituem a bateria real no Termux nem homologação no Android.
