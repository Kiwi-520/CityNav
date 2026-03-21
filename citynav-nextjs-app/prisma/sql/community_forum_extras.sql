CREATE EXTENSION IF NOT EXISTS postgis;

CREATE INDEX IF NOT EXISTS idx_places_location ON places USING GIST(location);

CREATE UNIQUE INDEX IF NOT EXISTS idx_visit_dedup
ON visit_history(user_id, place_id, (DATE_TRUNC('hour', visited_at)));

CREATE INDEX IF NOT EXISTS idx_reviews_place_active
ON reviews(place_id, status, expires_at DESC)
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_reviews_expiry
ON reviews(expires_at)
WHERE status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_active
ON reviews(user_id, place_id)
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_flags_unresolved
ON review_flags(resolved)
WHERE resolved = FALSE;

CREATE OR REPLACE VIEW community_forum AS
SELECT
  r.id AS review_id,
  r.rating,
  r.review_text,
  r.created_at,
  r.expires_at,
  r.helpful_count,
  r.relevance_score,
  u.name AS reviewer_name,
  u.avatar_url,
  u.reputation AS reviewer_reputation,
  p.id AS place_id,
  p.place_name,
  p.category,
  p.latitude,
  p.longitude,
  p.location,
  p.current_rating AS place_rating
FROM reviews r
JOIN users u ON r.user_id = u.id
JOIN places p ON r.place_id = p.id
WHERE r.status = 'active'
AND r.expires_at > NOW()
ORDER BY r.relevance_score DESC, r.created_at DESC;

CREATE OR REPLACE FUNCTION can_user_review(p_user_id UUID, p_place_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM visit_history
    WHERE user_id = p_user_id
      AND place_id = p_place_id
      AND is_verified = TRUE
      AND visited_at >= NOW() - INTERVAL '30 days'
  )
  AND NOT EXISTS (
    SELECT 1 FROM reviews
    WHERE user_id = p_user_id
      AND place_id = p_place_id
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_nearby_reviews(
  p_lat DECIMAL,
  p_lng DECIMAL,
  p_radius_meters INTEGER DEFAULT 1000,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  review_id UUID,
  place_name VARCHAR,
  rating SMALLINT,
  review_text TEXT,
  reviewer_name VARCHAR,
  distance_meters DOUBLE PRECISION,
  helpful_count INTEGER,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    p.place_name,
    r.rating::SMALLINT,
    r.review_text,
    u.name,
    ST_Distance(p.location, ST_MakePoint(p_lng, p_lat)::geography) AS distance_meters,
    r.helpful_count,
    r.created_at
  FROM reviews r
  JOIN places p ON r.place_id = p.id
  JOIN users u ON r.user_id = u.id
  WHERE r.status = 'active'
    AND r.expires_at > NOW()
    AND ST_DWithin(p.location, ST_MakePoint(p_lng, p_lat)::geography, p_radius_meters)
  ORDER BY r.relevance_score DESC, r.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_expiry(p_place_id UUID)
RETURNS INTERVAL AS $$
DECLARE
  active_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_count
  FROM reviews
  WHERE place_id = p_place_id
    AND status = 'active'
    AND expires_at > NOW();

  IF active_count >= 5 THEN
    RETURN INTERVAL '30 days';
  ELSIF active_count >= 1 THEN
    RETURN INTERVAL '60 days';
  ELSE
    RETURN INTERVAL '90 days';
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_place_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE places SET
    current_rating = COALESCE((
      SELECT ROUND(AVG(rating)::numeric, 1)
      FROM reviews
      WHERE place_id = COALESCE(NEW.place_id, OLD.place_id)
        AND status = 'active'
        AND expires_at > NOW()
    ), 0.0),
    total_active_reviews = (
      SELECT COUNT(*)
      FROM reviews
      WHERE place_id = COALESCE(NEW.place_id, OLD.place_id)
        AND status = 'active'
        AND expires_at > NOW()
    ),
    lifetime_rating = COALESCE((
      SELECT ROUND(AVG(rating)::numeric, 1)
      FROM reviews
      WHERE place_id = COALESCE(NEW.place_id, OLD.place_id)
        AND status != 'removed'
    ), 0.0),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.place_id, OLD.place_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_place_rating ON reviews;
CREATE TRIGGER trg_update_place_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_place_rating();
