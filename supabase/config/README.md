Folder ini berisi konfigurasi gateway REST dan utilitas deployment.

- `nginx.conf`: reverse proxy ringan yang mengekspos endpoint PostgREST pada `/rest/v1` agar kompatibel dengan `@supabase/supabase-js`.
- `generate-jwt.mjs`: generator token `anon` dan `service_role` berbasis `JWT_SECRET`.

Contoh:

```bash
node supabase/config/generate-jwt.mjs your_super_secret_value
```

