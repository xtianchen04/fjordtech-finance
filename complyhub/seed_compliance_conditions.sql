-- ============================================================
--  ComplyHub — Seed du référentiel des conditions de conformité
-- ============================================================
--  À exécuter APRÈS schema.sql, dans Supabase → SQL Editor.
--  Idempotent : ré-exécutable sans créer de doublons.
-- ============================================================

insert into public.compliance_conditions (id, regime, category, label, reference) values
  (1,  'Commun', 'Emploi',       'Emploi dans la même profession que l''offre',                'R209.2(1)(a)(iii)'),
  (2,  'Commun', 'Salaire',      'Salaire substantiellement le même que l''offre',             'R209.2(1)(a)(iii)'),
  (3,  'Commun', 'Conditions',   'Conditions de travail conformes à l''offre',                 'R209.2(1)(a)(iii)'),
  (4,  'Commun', 'Légal',        'Respect des lois fédérales et provinciales du travail',      'R209.3(1)(a)(iii) / R209.4(1)(a)'),
  (5,  'Commun', 'Activité',     'Activité commerciale conforme à l''offre d''emploi',         'R209.3(1)(b)(i) / R209.4(1)(b)(i)'),
  (6,  'Commun', 'Documents',    'Conservation des registres pendant 6 ans',                   'R209.4'),
  (7,  'PMI',    'Abus',         'Milieu de travail exempt d''abus (R196.2)',                  'R196.2'),
  (8,  'PMI',    'Information',  'Information sur les droits fournie au travailleur',          'R209.2(1)(a.1)'),
  (9,  'PMI',    'Santé',        'Accès aux soins de santé en cas de blessure',                'R209.2(1)(b)'),
  (10, 'PTET',   'Logement',     'Logement adéquat (si applicable)',                           'R209.3(1)'),
  (11, 'Commun', 'Déclaration',  'Déclaration des changements à l''autorité',                  'R209.2(1) / R209.3(1)'),
  (12, 'Commun', 'Coopération',  'Coopération lors d''une inspection',                         'R209.5 / R209.6')
on conflict (id) do update set
  regime    = excluded.regime,
  category  = excluded.category,
  label     = excluded.label,
  reference = excluded.reference;
