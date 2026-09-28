CREATE TABLE public.scrape_cache (
  cache_key text PRIMARY KEY,
  normalized_url text NOT NULL,
  extractor_version text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.scrape_cache TO service_role;
ALTER TABLE public.scrape_cache ENABLE ROW LEVEL SECURITY;
CREATE INDEX scrape_cache_created_idx ON public.scrape_cache(created_at);