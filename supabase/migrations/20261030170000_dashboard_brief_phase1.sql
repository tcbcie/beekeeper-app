-- Dashboard brief, phase 1 (30 October 2026): the queen check lists only hives opened in the last 21 days,
-- or recorded as broodless; recent activity returns up to 50 of each record type so visits count correctly;
-- the 18 kg stores figure reads as a rough guide. Grants unchanged.
CREATE OR REPLACE FUNCTION public.get_dashboard_overview(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_today date := (now() AT TIME ZONE 'Europe/Dublin')::date;
  v_queen_cutoff date := v_today - 21;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501';
  END IF;

  RETURN (
    WITH active_hives AS (
      SELECT id, apiary_id, hive_number, beep_device_id, wolf_scale_id, is_queenless, queenless_reason
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
    last_visit AS (
      SELECT h.apiary_id, max(r.record_date)::text AS last_date
      FROM active_hives h
      JOIN (
        SELECT hive_id, inspection_date AS record_date FROM inspections
        UNION ALL SELECT hive_id, feed_date FROM feedings
        UNION ALL SELECT hive_id, treatment_date FROM varroa_treatments
        UNION ALL SELECT hive_id, (check_date AT TIME ZONE 'Europe/Dublin')::date FROM varroa_checks
        UNION ALL SELECT hive_id, harvest_date FROM harvests
      ) r ON r.hive_id = h.id
      GROUP BY h.apiary_id
    ),
    last_feed AS (
      SELECT h.apiary_id, max(f.feed_date)::text AS last_date
      FROM feedings f JOIN active_hives h ON h.id = f.hive_id
      GROUP BY h.apiary_id
    ),
    last_treatment AS (
      SELECT h.apiary_id, max(t.treatment_date)::text AS last_date
      FROM varroa_treatments t JOIN active_hives h ON h.id = t.hive_id
      GROUP BY h.apiary_id
    ),
    last_inspection_per_hive AS (
      SELECT h.id AS hive_id, h.apiary_id, max(i.inspection_date) AS last_date
      FROM active_hives h LEFT JOIN inspections i ON i.hive_id = h.id
      GROUP BY h.id, h.apiary_id
    ),
    inspection_age AS (
      SELECT
        apiary_id,
        min(last_date)::text AS oldest_date,
        count(*) FILTER (WHERE last_date IS NULL) AS uninspected,
        count(*) FILTER (WHERE last_date IS NULL OR last_date < v_today - 14) AS overdue
      FROM last_inspection_per_hive
      GROUP BY apiary_id
    ),
    high_varroa AS (
      SELECT h.apiary_id, count(DISTINCT h.id) AS cnt
      FROM varroa_checks vc JOIN active_hives h ON h.id = vc.hive_id
      WHERE vc.infestation_rate > 3 AND vc.check_date >= v_today - 30
      GROUP BY h.apiary_id
    ),
    high_varroa_per_hive AS (
      SELECT vc.hive_id, max(vc.infestation_rate) AS rate
      FROM varroa_checks vc JOIN active_hives h ON h.id = vc.hive_id
      WHERE vc.infestation_rate > 3 AND vc.check_date >= v_today - 30
      GROUP BY vc.hive_id
    ),
    apiary_tasks AS (
      SELECT apiary_id, count(*) AS cnt
      FROM tasks_events
      WHERE user_id = p_user_id AND completed = false AND apiary_id IS NOT NULL
      GROUP BY apiary_id
    ),
    due_tasks AS (
      SELECT apiary_id, count(*) AS cnt
      FROM tasks_events
      WHERE user_id = p_user_id AND completed = false AND apiary_id IS NOT NULL
        AND batch_id IS NULL AND start_date <= v_today
      GROUP BY apiary_id
    ),
    scale_devices AS (
      SELECT apiary_id, jsonb_agg(device) AS scales FROM (
        SELECT apiary_id, jsonb_build_object('hiveId', id, 'hiveNumber', hive_number, 'type', 'beep', 'deviceId', beep_device_id) AS device
        FROM active_hives WHERE beep_device_id IS NOT NULL
        UNION ALL
        SELECT apiary_id, jsonb_build_object('hiveId', id, 'hiveNumber', hive_number, 'type', 'wolf', 'deviceId', wolf_scale_id) AS device
        FROM active_hives WHERE wolf_scale_id IS NOT NULL
      ) devs GROUP BY apiary_id
    ),
    confirmed_queenless AS (
      SELECT
        apiary_id,
        count(*) AS cnt,
        COALESCE(
          jsonb_agg(DISTINCT COALESCE(queenless_reason, 'unknown') ORDER BY COALESCE(queenless_reason, 'unknown')),
          '[]'::jsonb
        ) AS reasons
      FROM active_hives
      WHERE is_queenless = true
      GROUP BY apiary_id
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
      WHERE h.is_queenless = false
        AND (lq.last_qr_date IS NULL OR lq.last_qr_date < v_queen_cutoff)
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
      WHERE h.is_queenless = false
        AND bas.absent_since < v_queen_cutoff
      GROUP BY h.apiary_id
    ),
    queen_issue AS (
      SELECT h.apiary_id, count(DISTINCT h.id) AS cnt
      FROM active_hives h
      LEFT JOIN last_queenright_per_hive lq ON lq.hive_id = h.id
      LEFT JOIN brood_absent_since bas ON bas.hive_id = h.id
      WHERE h.is_queenless = true
         OR (lq.last_qr_date IS NULL OR lq.last_qr_date < v_queen_cutoff)
         OR (bas.absent_since IS NOT NULL AND bas.absent_since < v_queen_cutoff)
      GROUP BY h.apiary_id
    ),
    attention_hives AS (
      SELECT
        h.apiary_id,
        jsonb_agg(jsonb_build_object('id', h.id, 'number', h.hive_number, 'lastDate', lip.last_date)
                  ORDER BY lip.last_date NULLS FIRST, h.hive_number)
          FILTER (WHERE lip.last_date IS NULL OR lip.last_date < v_today - 14) AS overdue,
        jsonb_agg(jsonb_build_object('id', h.id, 'number', h.hive_number, 'reason', h.queenless_reason)
                  ORDER BY h.hive_number)
          FILTER (WHERE h.is_queenless = true) AS queenless,
        jsonb_agg(jsonb_build_object('id', h.id, 'number', h.hive_number, 'lastDate', lip.last_date, 'lastQueenDate', lq.last_qr_date, 'broodlessSince', bas.absent_since)
                  ORDER BY lq.last_qr_date NULLS FIRST, h.hive_number)
          FILTER (WHERE h.is_queenless = false AND (
            -- Opened in the last 21 days with no queen or eggs seen in that time: a hive left closed is deliberate
            (lip.last_date >= v_queen_cutoff AND (lq.last_qr_date IS NULL OR lq.last_qr_date < v_queen_cutoff))
            OR (bas.absent_since IS NOT NULL AND bas.absent_since < v_queen_cutoff))) AS queen_check,
        jsonb_agg(jsonb_build_object('id', h.id, 'number', h.hive_number, 'rate', hvh.rate)
                  ORDER BY hvh.rate DESC)
          FILTER (WHERE hvh.hive_id IS NOT NULL) AS high_varroa
      FROM active_hives h
      LEFT JOIN last_inspection_per_hive lip ON lip.hive_id = h.id
      LEFT JOIN last_queenright_per_hive lq ON lq.hive_id = h.id
      LEFT JOIN brood_absent_since bas ON bas.hive_id = h.id
      LEFT JOIN high_varroa_per_hive hvh ON hvh.hive_id = h.id
      GROUP BY h.apiary_id
    ),
    due_task_list AS (
      SELECT apiary_id, jsonb_agg(jsonb_build_object('id', id, 'title', title) ORDER BY start_date, title) AS tasks
      FROM (
        SELECT apiary_id, id, title, start_date,
               row_number() OVER (PARTITION BY apiary_id ORDER BY start_date, title) AS rn
        FROM tasks_events
        WHERE user_id = p_user_id AND completed = false AND apiary_id IS NOT NULL
          AND batch_id IS NULL AND start_date <= v_today
      ) t
      WHERE rn <= 3
      GROUP BY apiary_id
    ),
    enriched_apiaries AS (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', a.id, 'name', a.name, 'location', a.location, 'city', a.city,
          'latitude', a.latitude, 'longitude', a.longitude,
          'hiveCount', COALESCE(hc.cnt, 0),
          'lastInspectionDate', li.last_date,
          'lastVisitDate', lv.last_date,
          'lastFeedDate', lf.last_date,
          'lastTreatmentDate', ltr.last_date,
          'oldestInspectionDate', ia.oldest_date,
          'uninspectedHiveCount', COALESCE(ia.uninspected, 0),
          'overdueInspectionHiveCount', COALESCE(ia.overdue, 0),
          'highVarroaHiveCount', COALESCE(hv.cnt, 0),
          'lastQueenrightDate', lqr.last_date,
          'queenIssueHiveCount', COALESCE(qi.cnt, 0),
          'queenrightAtRiskHiveCount', COALESCE(qr.cnt, 0),
          'broodAtRiskHiveCount', COALESCE(br.cnt, 0),
          'queenlessConfirmedHiveCount', COALESCE(cq.cnt, 0),
          'queenlessConfirmedReasons', COALESCE(cq.reasons, '[]'::jsonb),
          'scales', COALESCE(sd.scales, '[]'::jsonb),
          'activeTaskCount', COALESCE(atk.cnt, 0),
          'dueTaskCount', COALESCE(dt.cnt, 0),
          'overdueHives', COALESCE(ah.overdue, '[]'::jsonb),
          'queenlessHives', COALESCE(ah.queenless, '[]'::jsonb),
          'queenCheckHives', COALESCE(ah.queen_check, '[]'::jsonb),
          'highVarroaHives', COALESCE(ah.high_varroa, '[]'::jsonb),
          'dueTasks', COALESCE(dtl.tasks, '[]'::jsonb)
        ) ORDER BY a.name
      ), '[]'::jsonb) AS data
      FROM apiaries a
      LEFT JOIN hive_counts hc ON hc.apiary_id = a.id
      LEFT JOIN last_inspection li ON li.apiary_id = a.id
      LEFT JOIN last_visit lv ON lv.apiary_id = a.id
      LEFT JOIN last_feed lf ON lf.apiary_id = a.id
      LEFT JOIN last_treatment ltr ON ltr.apiary_id = a.id
      LEFT JOIN inspection_age ia ON ia.apiary_id = a.id
      LEFT JOIN high_varroa hv ON hv.apiary_id = a.id
      LEFT JOIN last_queenright_per_apiary lqr ON lqr.apiary_id = a.id
      LEFT JOIN queen_issue qi ON qi.apiary_id = a.id
      LEFT JOIN queenright_risk qr ON qr.apiary_id = a.id
      LEFT JOIN brood_risk br ON br.apiary_id = a.id
      LEFT JOIN confirmed_queenless cq ON cq.apiary_id = a.id
      LEFT JOIN scale_devices sd ON sd.apiary_id = a.id
      LEFT JOIN apiary_tasks atk ON atk.apiary_id = a.id
      LEFT JOIN due_tasks dt ON dt.apiary_id = a.id
      LEFT JOIN attention_hives ah ON ah.apiary_id = a.id
      LEFT JOIN due_task_list dtl ON dtl.apiary_id = a.id
      WHERE a.user_id = p_user_id
    )
    SELECT jsonb_build_object(
      'firstName', (SELECT first_name FROM profiles WHERE id = p_user_id),
      'stats', jsonb_build_object(
        'apiaries', (SELECT count(*) FROM apiaries WHERE user_id = p_user_id),
        'hives', (SELECT count(*) FROM hives WHERE user_id = p_user_id),
        'recentInspections', (SELECT count(*) FROM inspections WHERE user_id = p_user_id AND inspection_date >= v_today - 7),
        'queens', (SELECT count(*) FROM queens WHERE user_id = p_user_id AND status = 'active'),
        'activeTasks', (SELECT count(*) FROM tasks_events WHERE user_id = p_user_id AND completed = false)
      ),
      'alerts', jsonb_build_object(
        'overdueInspections', (
          SELECT count(*) FROM active_hives h
          WHERE NOT EXISTS (SELECT 1 FROM inspections i WHERE i.hive_id = h.id AND i.inspection_date >= v_today - 14)
        ),
        'oldQueens', (SELECT count(*) FROM queens WHERE user_id = p_user_id AND status = 'active' AND birth_date < v_today - interval '2 years'),
        'highVarroa', (SELECT count(DISTINCT hive_id) FROM varroa_checks WHERE user_id = p_user_id AND infestation_rate > 3 AND check_date >= v_today - 30),
        'todayTasks', (SELECT count(*) FROM tasks_events WHERE user_id = p_user_id AND completed = false AND start_date = v_today)
      ),
      'apiaries', ea.data
    )
    FROM enriched_apiaries ea
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_recent_activity(p_user_id uuid, p_limit integer DEFAULT 5)
 RETURNS TABLE(id uuid, record_type text, activity_date text, hive_id uuid, hive_number text, apiary_name text, queen_seen boolean, treatment_type text, infestation_rate numeric, feed_type text, honey_weight numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT * FROM (
    (
      SELECT i.id, 'inspection'::text AS record_type, i.inspection_date::text AS activity_date,
             i.hive_id, h.hive_number, a.name AS apiary_name,
             i.queen_seen, NULL::text AS treatment_type, NULL::numeric AS infestation_rate,
             NULL::text AS feed_type, NULL::numeric AS honey_weight
      FROM inspections i
      JOIN hives h ON h.id = i.hive_id
      JOIN apiaries a ON a.id = h.apiary_id
      WHERE i.user_id = p_user_id
      ORDER BY i.inspection_date DESC LIMIT 50
    )
    UNION ALL
    (
      SELECT vt.id, 'varroa_treatment'::text, vt.treatment_date::text,
             vt.hive_id, h.hive_number, a.name,
             NULL::boolean, vt.treatment_type, NULL::numeric,
             NULL::text, NULL::numeric
      FROM varroa_treatments vt
      JOIN hives h ON h.id = vt.hive_id
      JOIN apiaries a ON a.id = h.apiary_id
      WHERE vt.user_id = p_user_id
      ORDER BY vt.treatment_date DESC LIMIT 50
    )
    UNION ALL
    (
      SELECT vc.id, 'varroa_check'::text, vc.check_date::date::text,
             vc.hive_id, h.hive_number, a.name,
             NULL::boolean, NULL::text, vc.infestation_rate,
             NULL::text, NULL::numeric
      FROM varroa_checks vc
      JOIN hives h ON h.id = vc.hive_id
      JOIN apiaries a ON a.id = h.apiary_id
      WHERE vc.user_id = p_user_id
      ORDER BY vc.check_date DESC LIMIT 50
    )
    UNION ALL
    (
      SELECT f.id, 'feeding'::text, f.feed_date::text,
             f.hive_id, h.hive_number, a.name,
             NULL::boolean, NULL::text, NULL::numeric,
             f.feed_type, NULL::numeric
      FROM feedings f
      JOIN hives h ON h.id = f.hive_id
      JOIN apiaries a ON a.id = h.apiary_id
      WHERE f.user_id = p_user_id
      ORDER BY f.feed_date DESC LIMIT 50
    )
    UNION ALL
    (
      SELECT hr.id, 'harvest'::text, hr.harvest_date::text,
             hr.hive_id, h.hive_number, a.name,
             NULL::boolean, NULL::text, NULL::numeric,
             NULL::text, hr.honey_weight
      FROM harvests hr
      JOIN hives h ON h.id = hr.hive_id
      JOIN apiaries a ON a.id = h.apiary_id
      WHERE hr.user_id = p_user_id
      ORDER BY hr.harvest_date DESC LIMIT 50
    )
  ) combined
  WHERE p_user_id = (SELECT auth.uid())
  ORDER BY 3 DESC
  LIMIT LEAST(p_limit, 50);
$function$;

UPDATE public.monthly_apiary_tasks
SET task = 'Feed thick syrup to bring stores up to about 18 kg as a rough guide; ivy and late flowers will help.'
WHERE month = 9 AND position = 1;

UPDATE public.monthly_apiary_tasks
SET task = 'Heft each hive to judge its stores, about 18 kg as a rough guide; finish syrup and use fondant if still light.'
WHERE month = 10 AND position = 1;
