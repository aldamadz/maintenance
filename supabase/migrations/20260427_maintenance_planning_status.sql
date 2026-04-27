alter table maintenance.maintenance
add column if not exists status text not null default 'selesai';

update maintenance.maintenance
set status = 'planning'
where status = 'selesai'
  and (
    catatan is null
    or btrim(catatan) in ('', '-', '–', '—')
  );

update maintenance.maintenance
set catatan = null
where catatan is not null
  and btrim(catatan) in ('', '-', '–', '—');

create index if not exists idx_maintenance_status
on maintenance.maintenance(status);

create or replace function maintenance.get_maintenance_dashboard(
  p_lokasi text default null,
  p_date_from date default null,
  p_date_to date default null,
  p_jenis_kegiatan text default null
)
returns jsonb
language sql
stable
as $$
  with scoped as (
    select *
    from maintenance.maintenance
    where (p_lokasi is null or lokasi = p_lokasi)
      and (p_date_from is null or tanggal_maintenance >= p_date_from)
      and (p_date_to is null or tanggal_maintenance <= p_date_to)
      and (p_jenis_kegiatan is null or jenis_kegiatan = p_jenis_kegiatan)
  ),
  filtered as (
    select *
    from scoped
    where coalesce(status, 'selesai') <> 'planning'
  ),
  yearly as (
    select
      extract(year from tanggal_maintenance)::integer as tahun,
      count(*)::integer as total_maintenance
    from filtered
    group by 1
    order by 1
  ),
  activities as (
    select
      coalesce(jenis_kegiatan, 'tanpa-kategori') as jenis_kegiatan,
      count(*)::integer as total_maintenance
    from filtered
    group by 1
    order by 2 desc, 1 asc
  ),
  top_activity as (
    select jenis_kegiatan
    from activities
    order by total_maintenance desc, jenis_kegiatan asc
    limit 1
  )
  select jsonb_build_object(
    'total_aset',
    coalesce(
      (
        select count(*)::integer
        from maintenance.assets
        where (p_lokasi is null or lokasi = p_lokasi)
      ),
      0
    ),
    'total_maintenance', coalesce((select count(*)::integer from filtered), 0),
    'planning_maintenance',
    coalesce(
      (
        select count(*)::integer
        from scoped
        where coalesce(status, 'selesai') = 'planning'
      ),
      0
    ),
    'total_durasi', coalesce((select sum(coalesce(durasi, 0))::integer from filtered), 0),
    'kegiatan_paling_sering', coalesce((select jenis_kegiatan from top_activity), '-'),
    'yearly',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'tahun', tahun,
            'total_maintenance', total_maintenance
          )
          order by tahun
        )
        from yearly
      ),
      '[]'::jsonb
    ),
    'activities',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'jenis_kegiatan', jenis_kegiatan,
            'total_maintenance', total_maintenance
          )
          order by total_maintenance desc, jenis_kegiatan
        )
        from activities
      ),
      '[]'::jsonb
    )
  );
$$;

grant execute on function maintenance.get_maintenance_dashboard(text, date, date, text)
to anon, authenticated, service_role;
