-- Dashboard performance optimisation: consolidate 16+ queries into 2 RPCs
-- Created: 2026-03-26

-- 1. get_dashboard_overview — replaces all overview, enrichment, and alert queries
CREATE OR REPLACE FUNCTION get_dashboard_overview(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_queen_cutoff date := current_date - 21;
BEGIN
  RETURN (
    WITH active_hives AS (
      SELECT id, apiary_id, beep_device_id, wolf_scale_id
      FROM hives
      WHERE user_id = p_user_id AND archived_at IS NULL
    ),
    hive_counts AS (
      SELECT apiary_id, count(*) AS cnt FROM active_hives GROUP BY apiary_id
    ),
    last_inspection AS (
      SELECT h.apiary_id, max(i.inspection_date)::text AS last_date
      FROM inspections i JOIN active_hives h ON h.id = i.hive_id
      GROUP BY h.apiary_id
    ),
    apiary_tasks AS (
      SELECT apiary_id, count(*) AS cnt
      FROM tasks_events
      WHERE user_id = p_user_id AND completed = false AND apiary_id IS NOT NULL
      GROUP BY apiary_id
    ),
    scale_devices AS (
      SELECT apiary_id, jsonb_agg(device) AS scales FROM (
        SELECT apiary_id, jsonb_build_object('hiveId', id, 'type', 'beep', 'deviceId', beep_device_id) AS device
        FROM active_hives WHERE beep_device_id IS NOT NULL
        UNION ALL
        SELECT apiary_id, jsonb_build_object('hiveId', id, 'type', 'wolf', 'deviceId', wolf_scale_id) AS device
        FROM active_hives WHERE wolf_scale_id IS NOT NULL
      ) devs GROUP BY apiary_id
    ),
    last_queenright_per_hive AS (
      SELECT i.hive_id, max(i.inspection_date) AS last_qr_date
      FROM inspections i JOIN active_hives h ON h.id = i.hive_id
      WHERE i.queen_seen = true OR i.eggs_present = true
      GROUP BY i.hive_id
    ),
    last_queenright_per_apiary AS (
      SELECT h.apiary_id, max(lq.last_qr_date)::text AS last_date
      FROM last_queenright_per_hive lq JOIN active_hives h ON h.id = lq.hive_id
      GROUP BY h.apiary_id
    ),
    queenright_risk AS (
      SELECT h.apiary_id, count(*) AS cnt
      FROM active_hives h
      LEFT JOIN last_queenright_per_hive lq ON lq.hive_id = h.id
      WHERE lq.last_qr_date IS NULL OR lq.last_qr_date < v_queen_cutoff
      GROUP BY h.apiary_id
    ),
    close_dates AS (
      SELECT i.hive_id, max(i.inspection_date) AS close_date
      FROM inspections i JOIN active_hives h ON h.id = i.hive_id
      WHERE (i.eggs_present = true OR i.brood_frames > 0)
         OR (i.brood_frames IS NULL AND i.eggs_present IS NOT true)
      GROUP BY i.hive_id
    ),
    brood_absent_since AS (
      SELECT i.hive_id, min(i.inspection_date) AS absent_since
      FROM inspections i
      JOIN active_hives h ON h.id = i.hive_id
      LEFT JOIN close_dates cd ON cd.hive_id = i.hive_id
      WHERE i.brood_frames = 0
        AND (cd.close_date IS NULL OR i.inspection_date > cd.close_date)
      GROUP BY i.hive_id
    ),
    brood_risk AS (
      SELECT h.apiary_id, count(*) AS cnt
      FROM active_hives h
      JOIN brood_absent_since bas ON bas.hive_id = h.id
      WHERE bas.absent_since < v_queen_cutoff
      GROUP BY h.apiary_id
    ),
    queen_issue AS (
      SELECT h.apiary_id, count(DISTINCT h.id) AS cnt
      FROM active_hives h
      LEFT JOIN last_queenright_per_hive lq ON lq.hive_id = h.id
      LEFT JOIN brood_absent_since bas ON bas.hive_id = h.id
      WHERE (lq.last_qr_date IS NULL OR lq.last_qr_date < v_queen_cutoff)
         OR (bas.absent_since IS NOT NULL AND bas.absent_since < v_queen_cutoff)
      GROUP BY h.apiary_id
    ),
    enriched_apiaries AS (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', a.id, 'name', a.name, 'location', a.location, 'city', a.city,
          'latitude', a.latitude, 'longitude', a.longitude,
          'hiveCount', COALESCE(hc.cnt, 0),
          'lastInspectionDate', li.last_date,
          'lastQueenrightDate', lqr.last_date,
          'queenIssueHiveCount', COALESCE(qi.cnt, 0),
          'queenrightAtRiskHiveCount', COALESCE(qr.cnt, 0),
          'broodAtRiskHiveCount', COALESCE(br.cnt, 0),
          'scales', COALESCE(sd.scales, '[]'::jsonb),
          'activeTaskCount', COALESCE(atk.cnt, 0)
        ) ORDER BY a.name
      ), '[]'::jsonb) AS data
      FROM apiaries a
      LEFT JOIN hive_counts hc ON hc.apiary_id = a.id
      LEFT JOIN last_inspection li ON li.apiary_id = a.id
      LEFT JOIN last_queenright_per_apiary lqr ON lqr.apiary_id = a.id
      LEFT JOIN queen_issue qi ON qi.apiary_id = a.id
      LEFT JOIN queenright_risk qr ON qr.apiary_id = a.id
      LEFT JOIN brood_risk br ON br.apiary_id = a.id
      LEFT JOIN scale_devices sd ON sd.apiary_id = a.id
      LEFT JOIN apiary_tasks atk ON atk.apiary_id = a.id
      WHERE a.user_id = p_user_id
    )
    SELECT jsonb_build_object(
      'stats', jsonb_build_object(
        'apiaries', (SELECT count(*) FROM apiaries WHERE user_id = p_user_id),
        'hives', (SELECT count(*) FROM hives WHERE user_id = p_user_id),
        'recentInspections', (SELECT count(*) FROM inspections WHERE user_id = p_user_id AND inspection_date >= current_date - 7),
        'queens', (SELECT count(*) FROM queens WHERE user_id = p_user_id AND status = 'active'),
        'activeTasks', (SELECT count(*) FROM tasks_events WHERE user_id = p_user_id AND completed = false)
      ),
      'alerts', jsonb_build_object(
        'overdueInspections', (
          SELECT count(*) FROM active_hives h
          WHERE NOT EXISTS (SELECT 1 FROM inspections i WHERE i.hive_id = h.id AND i.inspection_date >= current_date - 14)
        ),
        'oldQueens', (SELECT count(*) FROM queens WHERE user_id = p_user_id AND status = 'active' AND birth_date < current_date - interval '2 years'),
        'highVarroa', (SELECT count(DISTINCT hive_id) FROM varroa_checks WHERE user_id = p_user_id AND infestation_rate > 3 AND check_date >= current_date - 30),
        'todayTasks', (SELECT count(*) FROM tasks_events WHERE user_id = p_user_id AND completed = false AND start_date = current_date)
      ),
      'apiaries', ea.data
    )
    FROM enriched_apiaries ea
  );
END;
$$;

-- 2. get_recent_activity — replaces 5 separate recent activity queries
CREATE OR REPLACE FUNCTION get_recent_activity(p_user_id uuid, p_limit int DEFAULT 5)
RETURNS TABLE (
  id uuid,
  record_type text,
  activity_date text,
  hive_id uuid,
  hive_number text,
  apiary_name text,
  queen_seen boolean,
  treatment_type text,
  infestation_rate numeric,
  feed_type text,
  honey_weight numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM (
    (
      SELECT i.id, 'inspection'::text, i.inspection_date::text,
             i.hive_id, h.hive_number, a.name,
             i.queen_seen, NULL::text, NULL::numeric, NULL::text, NULL::numeric
      FROM inspections i
      JOIN hives h ON h.id = i.hive_id
      JOIN apiaries a ON a.id = h.apiary_id
      WHERE i.user_id = p_user_id
      ORDER BY i.inspection_date DESC LIMIT 10
    )
    UNION ALL
    (
      SELECT vt.id, 'varroa_treatment'::text, vt.treatment_date::text,
             vt.hive_id, h.hive_number, a.name,
             NULL::boolean, vt.treatment_type, NULL::numeric, NULL::text, NULL::numeric
      FROM varroa_treatments vt
      JOIN hives h ON h.id = vt.hive_id
      JOIN apiaries a ON a.id = h.apiary_id
      WHERE vt.user_id = p_user_id
      ORDER BY vt.treatment_date DESC LIMIT 10
    )
    UNION ALL
    (
      SELECT vc.id, 'varroa_check'::text, vc.check_date::date::text,
             vc.hive_id, h.hive_number, a.name,
             NULL::boolean, NULL::text, vc.infestation_rate, NULL::text, NULL::numeric
      FROM varroa_checks vc
      JOIN hives h ON h.id = vc.hive_id
      JOIN apiaries a ON a.id = h.apiary_id
      WHERE vc.user_id = p_user_id
      ORDER BY vc.check_date DESC LIMIT 10
    )
    UNION ALL
    (
      SELECT f.id, 'feeding'::text, f.feed_date::text,
             f.hive_id, h.hive_number, a.name,
             NULL::boolean, NULL::text, NULL::numeric, f.feed_type, NULL::numeric
      FROM feedings f
      JOIN hives h ON h.id = f.hive_id
      JOIN apiaries a ON a.id = h.apiary_id
      WHERE f.user_id = p_user_id
      ORDER BY f.feed_date DESC LIMIT 10
    )
    UNION ALL
    (
      SELECT hr.id, 'harvest'::text, hr.harvest_date::text,
             hr.hive_id, h.hive_number, a.name,
             NULL::boolean, NULL::text, NULL::numeric, NULL::text, hr.honey_weight
      FROM harvests hr
      JOIN hives h ON h.id = hr.hive_id
      JOIN apiaries a ON a.id = h.apiary_id
      WHERE hr.user_id = p_user_id
      ORDER BY hr.harvest_date DESC LIMIT 10
    )
  ) combined
  ORDER BY 3 DESC
  LIMIT LEAST(p_limit, 50);
$$;
