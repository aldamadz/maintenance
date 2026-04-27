alter table maintenance.assets
add column if not exists maintenance_interval_months integer not null default 12;

update maintenance.assets
set maintenance_interval_months = 12
where maintenance_interval_months is null;
