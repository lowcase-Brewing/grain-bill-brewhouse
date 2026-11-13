CREATE TABLE public.brew_recipes (
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  id uuid NOT NULL,
  schema_version integer NOT NULL DEFAULT 1,
  doc jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id)
);
CREATE TABLE public.brew_ingredients (
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  id text NOT NULL,
  schema_version integer NOT NULL DEFAULT 1,
  doc jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id)
);
CREATE TABLE public.brew_settings (
  owner_id uuid PRIMARY KEY DEFAULT auth.uid(),
  schema_version integer NOT NULL DEFAULT 1,
  doc jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.brew_drafts (
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  key text NOT NULL,
  schema_version integer NOT NULL DEFAULT 1,
  doc jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, key)
);
CREATE TABLE public.brew_account_state (
  owner_id uuid PRIMARY KEY DEFAULT auth.uid(),
  library_seeded_at timestamptz,
  legacy_import_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brew_recipes, public.brew_ingredients, public.brew_settings, public.brew_drafts, public.brew_account_state TO authenticated;
GRANT ALL ON public.brew_recipes, public.brew_ingredients, public.brew_settings, public.brew_drafts, public.brew_account_state TO service_role;
REVOKE ALL ON public.brew_recipes, public.brew_ingredients, public.brew_settings, public.brew_drafts, public.brew_account_state FROM anon;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['brew_recipes','brew_ingredients','brew_settings','brew_drafts','brew_account_state'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Owners read own rows" ON public.%I FOR SELECT TO authenticated USING (owner_id = auth.uid())', t);
    EXECUTE format('CREATE POLICY "Owners insert own rows" ON public.%I FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid())', t);
    EXECUTE format('CREATE POLICY "Owners update own rows" ON public.%I FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid())', t);
    EXECUTE format('CREATE POLICY "Owners delete own rows" ON public.%I FOR DELETE TO authenticated USING (owner_id = auth.uid())', t);
  END LOOP;
END $$;