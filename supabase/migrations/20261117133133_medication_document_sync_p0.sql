-- M153 P0: acelera validação/reconciliação da FK preservando sua rigidez.
create index if not exists medicamentos_document_id_idx
  on public.medicamentos(document_id)
  where document_id is not null;

comment on index public.medicamentos_document_id_idx is
  'Apoia validação e reconciliação do vínculo medicamento-documento; não altera nem remove registros.';
