# Manual development seeds

These scripts are **not** part of the production migration sequence. Apply them manually against a development or staging database when you need sample tenant data.

```bash
# Example (adjust connection for your environment)
psql "$DATABASE_URL" -f supabase-signalworks/seeds/033_ma5_staging_seed.sql
```

Do not add seed files back under `migrations/` — production deploys must start with empty tenant tables unless real data is imported separately.
