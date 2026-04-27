create or replace function maintenance.asset_overview_base(
  p_lokasi text default null,
  p_status text default null,
  p_search text default null,
  p_interval_months integer default null,
  p_priority text default null
)
returns table (
  id bigint,
  kode_aset text,
  nama_perangkat text,
  tipe text,
  lokasi text,
  status text,
  maintenance_interval_months integer,
  created_at timestamp,
  last_maintenance_date date,
  next_maintenance_date date,
  priority_label text,
  priority_rank integer
)
language sql
stable
as $$
  with maintenance_lookup as (
    select
      upper(btrim(kode_aset)) as kode_aset,
      max(tanggal_maintenance) as last_maintenance_date
    from maintenance.maintenance
    group by upper(btrim(kode_aset))
  ),
  enriched as (
    select
      a.id,
      a.kode_aset,
      a.nama_perangkat,
      a.tipe,
      a.lokasi,
      a.status,
      a.maintenance_interval_months,
      a.created_at,
      lookup.last_maintenance_date,
      case
        when lookup.last_maintenance_date is null then null
        else (lookup.last_maintenance_date + make_interval(months => a.maintenance_interval_months))::date
      end as next_maintenance_date
    from maintenance.assets a
    left join maintenance_lookup lookup
      on lookup.kode_aset = upper(btrim(a.kode_aset))
  ),
  prioritized as (
    select
      enriched.*,
      case
        when enriched.last_maintenance_date is null then 'belum-ada-histori'
        when enriched.next_maintenance_date <= current_date then 'lewat'
        when enriched.next_maintenance_date <= (current_date + interval '3 months')::date then 'mendekati'
        else 'normal'
      end as priority_label,
      case
        when enriched.last_maintenance_date is null then 2
        when enriched.next_maintenance_date <= current_date then 0
        when enriched.next_maintenance_date <= (current_date + interval '3 months')::date then 1
        else 3
      end as priority_rank
    from enriched
  ),
  filtered as (
    select *
    from prioritized
    where (p_lokasi is null or lokasi = p_lokasi)
      and (p_status is null or status = p_status)
      and (p_interval_months is null or maintenance_interval_months = p_interval_months)
      and (
        p_search is null
        or p_search = ''
        or kode_aset ilike '%' || replace(p_search, ',', ' ') || '%'
        or nama_perangkat ilike '%' || replace(p_search, ',', ' ') || '%'
        or coalesce(tipe, '') ilike '%' || replace(p_search, ',', ' ') || '%'
      )
      and (p_priority is null or priority_label = p_priority)
  )
  select
    id,
    kode_aset,
    nama_perangkat,
    tipe,
    lokasi,
    status,
    maintenance_interval_months,
    created_at,
    last_maintenance_date,
    next_maintenance_date,
    priority_label,
    priority_rank
  from filtered;
$$;

create or replace function maintenance.get_asset_options()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'lokasi',
    coalesce(
      (
        select jsonb_agg(option_value order by option_value)
        from (
          select distinct lokasi as option_value
          from maintenance.assets
          where lokasi is not null and lokasi <> ''
        ) lokasi_options
      ),
      '[]'::jsonb
    ),
    'status',
    coalesce(
      (
        select jsonb_agg(option_value order by option_value)
        from (
          select distinct status as option_value
          from maintenance.assets
          where status is not null and status <> ''
        ) status_options
      ),
      '[]'::jsonb
    ),
    'intervals',
    coalesce(
      (
        select jsonb_agg(option_value order by option_value)
        from (
          select distinct maintenance_interval_months as option_value
          from maintenance.assets
          where maintenance_interval_months is not null
        ) interval_options
      ),
      '[]'::jsonb
    )
  );
$$;

create or replace function maintenance.get_asset_summary(
  p_lokasi text default null,
  p_status text default null,
  p_search text default null,
  p_interval_months integer default null,
  p_priority text default null
)
returns jsonb
language sql
stable
as $$
  with filtered as (
    select *
    from maintenance.asset_overview_base(
      p_lokasi,
      p_status,
      p_search,
      p_interval_months,
      p_priority
    )
  )
  select jsonb_build_object(
    'total_assets', count(*)::integer,
    'active_assets', count(*) filter (where status = 'aktif')::integer,
    'due_assets', count(*) filter (
      where priority_label in ('lewat', 'mendekati', 'belum-ada-histori')
    )::integer,
    'overdue_assets', count(*) filter (where priority_label = 'lewat')::integer,
    'upcoming_assets', count(*) filter (where priority_label = 'mendekati')::integer,
    'missing_history_assets', count(*) filter (
      where priority_label = 'belum-ada-histori'
    )::integer
  )
  from filtered;
$$;

create or replace function maintenance.get_asset_list(
  p_lokasi text default null,
  p_status text default null,
  p_search text default null,
  p_interval_months integer default null,
  p_priority text default null,
  p_page integer default 1,
  p_page_size integer default 10
)
returns jsonb
language sql
stable
as $$
  with filtered as (
    select *
    from maintenance.asset_overview_base(
      p_lokasi,
      p_status,
      p_search,
      p_interval_months,
      p_priority
    )
  ),
  paged as (
    select *
    from filtered
    order by priority_rank, next_maintenance_date nulls last, kode_aset
    limit greatest(coalesce(p_page_size, 10), 1)
    offset greatest(coalesce(p_page, 1) - 1, 0) * greatest(coalesce(p_page_size, 10), 1)
  )
  select jsonb_build_object(
    'count',
    coalesce((select count(*)::integer from filtered), 0),
    'data',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', id,
            'kode_aset', kode_aset,
            'nama_perangkat', nama_perangkat,
            'tipe', tipe,
            'lokasi', lokasi,
            'status', status,
            'maintenance_interval_months', maintenance_interval_months,
            'created_at', created_at,
            'last_maintenance_date', last_maintenance_date,
            'next_maintenance_date', next_maintenance_date,
            'priority_label', priority_label
          )
          order by priority_rank, next_maintenance_date nulls last, kode_aset
        )
        from paged
      ),
      '[]'::jsonb
    )
  );
$$;

grant execute on function maintenance.asset_overview_base(text, text, text, integer, text) to anon, authenticated, service_role;
grant execute on function maintenance.get_asset_options() to anon, authenticated, service_role;
grant execute on function maintenance.get_asset_summary(text, text, text, integer, text) to anon, authenticated, service_role;
grant execute on function maintenance.get_asset_list(text, text, text, integer, text, integer, integer) to anon, authenticated, service_role;
