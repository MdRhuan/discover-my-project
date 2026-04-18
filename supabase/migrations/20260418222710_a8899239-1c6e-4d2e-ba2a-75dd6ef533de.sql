-- Bucket privado para documentos de empresa
insert into storage.buckets (id, name, public)
values ('company-documents', 'company-documents', false)
on conflict (id) do nothing;

-- Policies: cada usuário acessa apenas arquivos sob a pasta {auth.uid()}/...
create policy "Users can read own company documents"
on storage.objects for select
to authenticated
using (
  bucket_id = 'company-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can upload own company documents"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'company-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update own company documents"
on storage.objects for update
to authenticated
using (
  bucket_id = 'company-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete own company documents"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'company-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Coluna para guardar o path do arquivo no bucket
alter table public.documentos
add column if not exists arquivo_path text;