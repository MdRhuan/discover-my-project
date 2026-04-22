
CREATE TABLE public.fair_notes (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID,
  data JSONB NOT NULL DEFAULT '{"notas":[],"feiras":[],"tags":[]}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX fair_notes_singleton ON public.fair_notes ((true));

ALTER TABLE public.fair_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY shared_fnotes_select ON public.fair_notes
  FOR SELECT TO authenticated USING (public.is_authorized(auth.uid()));
CREATE POLICY shared_fnotes_insert ON public.fair_notes
  FOR INSERT TO authenticated WITH CHECK (public.is_authorized(auth.uid()));
CREATE POLICY shared_fnotes_update ON public.fair_notes
  FOR UPDATE TO authenticated USING (public.is_authorized(auth.uid()));
CREATE POLICY shared_fnotes_delete ON public.fair_notes
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_fair_notes_updated_at
  BEFORE UPDATE ON public.fair_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.fair_notes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fair_notes;

INSERT INTO public.fair_notes (data) VALUES ('{"notas":[],"feiras":[],"tags":[]}'::jsonb);
