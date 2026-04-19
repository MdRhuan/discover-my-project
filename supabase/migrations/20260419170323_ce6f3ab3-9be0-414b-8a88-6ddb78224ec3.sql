
-- Create org_images table for organogram image uploads
CREATE TABLE public.org_images (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  empresa_id BIGINT,
  nome TEXT,
  arquivo_path TEXT NOT NULL,
  pos_x NUMERIC NOT NULL DEFAULT 0,
  pos_y NUMERIC NOT NULL DEFAULT 0,
  largura NUMERIC NOT NULL DEFAULT 160,
  altura NUMERIC NOT NULL DEFAULT 160,
  rotacao NUMERIC DEFAULT 0,
  opacidade NUMERIC DEFAULT 1,
  raio INTEGER DEFAULT 0,
  z_index INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.org_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared_orgimg_select" ON public.org_images FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY "shared_orgimg_insert" ON public.org_images FOR INSERT TO authenticated WITH CHECK (is_authorized(auth.uid()));
CREATE POLICY "shared_orgimg_update" ON public.org_images FOR UPDATE TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY "shared_orgimg_delete" ON public.org_images FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_org_images_updated_at BEFORE UPDATE ON public.org_images FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for org chart images
INSERT INTO storage.buckets (id, name, public) VALUES ('org-images', 'org-images', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "org_images_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'org-images' AND is_authorized(auth.uid()));
CREATE POLICY "org_images_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'org-images' AND is_authorized(auth.uid()));
CREATE POLICY "org_images_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'org-images' AND is_authorized(auth.uid()));
CREATE POLICY "org_images_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'org-images' AND has_role(auth.uid(), 'admin'::app_role));
