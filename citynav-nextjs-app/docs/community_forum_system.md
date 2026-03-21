# CityNav Community Forum System — Complete Design Document

**Version:** 1.0  
**Date:** March 4, 2026  
**Author:** CityNav Engineering Team  
**Status:** Finalized

---

## Table of Contents

1. [Overview](#1-overview)
2. [Core Concept](#2-core-concept)
3. [Strong Points of the System](#3-strong-points-of-the-system)
4. [Weak Points & Problems Identified](#4-weak-points--problems-identified)
5. [Changes & Solutions Applied](#5-changes--solutions-applied)
6. [Final Database Architecture](#6-final-database-architecture)
7. [Entity-Relationship Diagram](#7-entity-relationship-diagram)
8. [Geolocation Optimization](#8-geolocation-optimization)
9. [Review Expiry System](#9-review-expiry-system)
10. [Visit Verification System](#10-visit-verification-system)
11. [Review Eligibility Logic](#11-review-eligibility-logic)
12. [API Flow for Posting a Review](#12-api-flow-for-posting-a-review)
13. [Review Retrieval Logic](#13-review-retrieval-logic)
14. [Moderation System](#14-moderation-system)
15. [Rating Aggregation Strategy](#15-rating-aggregation-strategy)
16. [Review Reputation & Helpful Votes](#16-review-reputation--helpful-votes)
17. [Review Tags (Structured Feedback)](#17-review-tags-structured-feedback)
18. [Review Media (Photos/Videos)](#18-review-media-photovideos)
19. [Dynamic Radius Logic](#19-dynamic-radius-logic)
20. [Service Layer Integration](#20-service-layer-integration)
21. [Scheduled Jobs](#21-scheduled-jobs)
22. [System Flow Summary](#22-system-flow-summary)
23. [Summary of Changes from Original Proposal](#23-summary-of-changes-from-original-proposal)
24. [Full SQL Schema](#24-full-sql-schema)

---

## 1. Overview

The CityNav Community Forum is a location-based review system integrated into the CityNav navigation application. It allows users to post reviews of places they have **physically visited**, with reviews that are **time-limited** and **geographically scoped** to eliminate clutter, fake reviews, and outdated information.

This document covers the complete system design — from the initial idea, through analysis of strengths and weaknesses, to the finalized database schema, ER diagram, and system logic.

---

## 2. Core Concept

The community forum is built on three foundational pillars:

### Pillar 1: Verified Reviews Only
Users can ONLY post a review for a place they have physically visited. The visit is verified through GPS data, navigation completion, and time spent at the location.

### Pillar 2: Fresh Reviews (Time-Limited)
Reviews expire after a defined interval (default 30 days). This ensures that all visible reviews reflect the **current state** of a place — not outdated conditions.

### Pillar 3: Location-Based Review Visibility
Users see reviews ONLY within a radius of the places they are exploring or navigating to. This eliminates information overload and keeps everything contextually relevant.

---

## 3. Strong Points of the System

### A. Verified Visit-Based Reviews

**Why this is strong:**

- Eliminates fake reviews — the #1 problem on Google Maps and Yelp
- Prevents spam and competitor manipulation
- Creates trust in the platform from day one
- Aligns naturally with CityNav's navigation product — the app already tracks where users go

**System logic:**

```
User visits place
       ↓
Visit recorded in "visit_history"
       ↓
User allowed to submit review
```

This is similar to how Uber and Airbnb verify interactions before allowing reviews. It dramatically increases the **trustworthiness** of all reviews on the platform.

---

### B. Fresh Reviews (Expire After 1 Month)

**Why this is strong:**

- Restaurants change quality over time
- Traffic conditions change seasonally
- Metro/bus services get updated
- Shops close or open
- Construction affects accessibility

So showing only **recent reviews** keeps the platform **relevant** and useful.

**Implementation approach:**

```
review_created_at + 30 days = expires_at
```

After expiry:
```
review.status = 'expired'
```

Reviews are NOT deleted — they are expired. This prevents data loss and allows historical analysis.

---

### C. Location-Based Review Visibility

**Why this is the most powerful feature:**

It solves the biggest problem in Google Maps: **too many irrelevant reviews**.

**How it works:**

```
User selects destination
        ↓
Reviews within 500m or 1km radius are queried
        ↓
Only those reviews are visible
```

**Benefits:**
- Less clutter for the user
- Hyper-local, contextually relevant feedback
- Faster loading times (fewer results per query)
- Better user experience

---

## 4. Weak Points & Problems Identified

### Problem 1: How to Verify a "Visit"?

This is the **hardest engineering problem** in the entire system.

| Method | Pros | Cons |
|--------|------|------|
| GPS proximity check | Simple to implement | Easily spoofed with fake GPS apps |
| Navigation completion | CityNav already has this data | User might navigate but not actually visit |
| Time spent at location | Strong signal of real presence | Battery-draining continuous tracking |
| Wi-Fi/Bluetooth beacons | Very accurate indoor positioning | Requires physical infrastructure |

**Risk:** Without proper verification, fake reviews can still enter the system via GPS spoofing apps.

---

### Problem 2: Community Forum Table is Redundant

The original proposal had 4 tables:
```
users
history_of_places_user_visited
community_forum
user_reviews
```

The `community_forum` table and `user_reviews` table serve the **same purpose**. A community forum IS a collection of user reviews filtered by location. Having both creates:
- Data duplication
- Sync issues between tables
- Confusion about which table is the source of truth

---

### Problem 3: Missing "Places" Table

The entire system revolves around locations, but no central **places** entity was defined. Without it:
- Reviews can't link to places efficiently
- Indexing becomes difficult
- Queries become slow
- Duplicate place entries will proliferate
- Average ratings can't be computed per place

---

### Problem 4: No Geospatial Index

Since the system relies on **radius filtering**, the database must support geolocation queries. Without spatial indexing:
- "Find reviews within 1km" becomes a full table scan
- Queries become extremely slow at scale
- Real-time filtering is impossible

---

### Problem 5: 30-Day Expiry Creates "Review Deserts"

For **less popular locations**, a strict 30-day expiry means:
- 0 reviews visible after expiry
- Users see empty review sections
- This kills engagement and trust in the platform

Example: A rural park that gets 1 review every 2 months will always show 0 reviews.

---

### Problem 6: Fixed Radius is Insufficient

The proposal says "show reviews within the user's diameter" but doesn't define:
- What radius? 500m? 1km? 5km?
- Urban areas need **smaller** radius (500m) — places are densely packed
- Rural areas need **larger** radius (5km) — places are far apart
- Different categories need different radii (restaurant = 200m nearby, hospital = 2km search area)

---

### Problem 7: No Moderation System

Without moderation, the system has **no protection against**:
- Hate speech in review text
- Abusive or offensive content
- Irrelevant reviews ("nice weather today")
- Review bombing (visiting a competitor's place to leave 1-star reviews)

---

### Problem 8: No Rating Aggregation Strategy

If reviews expire, the **average rating constantly changes**. A place with 4.8 stars today could be 3.0 tomorrow if old positive reviews expire and only one bad review remains. This creates **rating volatility** that confuses users.

---

## 5. Changes & Solutions Applied

### Solution to Problem 1: Composite Verification

Instead of relying on a single method, use a **composite verification** approach:

```
visit_verified = (
    navigation_completed = TRUE
    AND time_at_location >= 5 minutes
    AND gps_within_50m_of_place = TRUE
)
```

All three conditions must be met. This makes GPS spoofing alone insufficient.

---

### Solution to Problem 2: Replace Community Forum Table with a VIEW

The `community_forum` is NOT a separate table — it is a **database VIEW** on top of the `reviews` table:

```sql
community_forum = SELECT * FROM reviews
                  JOIN users ON reviews.user_id = users.id
                  JOIN places ON reviews.place_id = places.id
                  WHERE status = 'active'
                  AND expires_at > NOW()
                  -- Filtered at query time by ST_DWithin(location, user_location, radius)
```

This eliminates duplication entirely.

---

### Solution to Problem 3: Add a Places Table

A central `places` table is added with:
- `place_name`, `category`, `city`, `address`
- `latitude`, `longitude`
- PostGIS `location GEOGRAPHY(Point, 4326)` column for spatial queries
- `current_rating` and `lifetime_rating`
- `external_place_id` for linking to Google/OSM place IDs

---

### Solution to Problem 4: PostGIS Geospatial Indexing

Use **PostgreSQL with PostGIS extension**.

Spatial column:
```sql
location GEOGRAPHY(Point, 4326)
```

GIST index:
```sql
CREATE INDEX idx_places_location ON places USING GIST(location);
```

Query example:
```sql
SELECT * FROM reviews
JOIN places ON reviews.place_id = places.id
WHERE ST_DWithin(places.location, ST_MakePoint(lng, lat)::geography, 1000);
```

This returns reviews within **1km radius** using an optimized spatial index.

---

### Solution to Problem 5: Dynamic (Tiered) Expiry

Instead of a hard 30-day expiry for all reviews, use a **tiered expiry** based on review density:

```
IF active_reviews_for_place >= 5:
    expiry = 30 days    (plenty of reviews, keep them fresh)
ELIF active_reviews_for_place >= 1:
    expiry = 60 days    (some reviews, keep them a bit longer)
ELSE:
    expiry = 90 days    (few reviews, preserve what exists)
```

This prevents "review deserts" for less popular places while still keeping popular places fresh.

---

### Solution to Problem 6: Dynamic Radius by Density and Category

```
radius = base_radius × density_factor × category_factor

WHERE:
  base_radius = 1000m
  density_factor = IF urban THEN 0.5 ELSE IF suburban THEN 1.0 ELSE IF rural THEN 3.0
  category_factor = IF restaurant THEN 0.3 ELSE IF hospital THEN 2.0 ELSE IF park THEN 1.5
```

Examples:
- Urban restaurant: 1000 × 0.5 × 0.3 = **150m**
- Rural hospital: 1000 × 3.0 × 2.0 = **6000m (6km)**
- Suburban park: 1000 × 1.0 × 1.5 = **1500m (1.5km)**

---

### Solution to Problem 7: Moderation via Flags

Added two mechanisms:

**1. User flagging:**
```
review_flags table:
  user_id, review_id, reason (spam | abusive | fake | irrelevant | offensive | other)
```

**2. Auto-flagging:**
```
IF review.flag_count >= 3 THEN review.status = 'flagged'
```

Reviews with status `flagged` are hidden from the community forum view until reviewed by a moderator.

---

### Solution to Problem 8: Dual Rating System

Maintain **two ratings** per place:

```
current_rating   → computed from active reviews only (shown to users)
lifetime_rating  → computed from ALL reviews ever (used internally for ranking)
```

`current_rating` is updated via a database trigger whenever reviews are inserted, updated, or expired.

---

## 6. Final Database Architecture

The finalized system uses **8 tables + 1 view**:

| # | Entity | Type | Purpose |
|---|--------|------|---------|
| 1 | `users` | Table | User accounts and profiles |
| 2 | `places` | Table | Central place/location entity with PostGIS |
| 3 | `visit_history` | Table | Verified visit records (review eligibility backbone) |
| 4 | `reviews` | Table | All reviews (single unified table) |
| 5 | `review_votes` | Table | Helpful / Not Helpful votes on reviews |
| 6 | `review_flags` | Table | User-submitted moderation flags |
| 7 | `review_tags` | Table | Structured feedback tags (crowded, clean, safe, etc.) |
| 8 | `review_media` | Table | Photo and video attachments on reviews |
| 9 | `community_forum` | VIEW | Aggregated view of active, non-expired reviews with user and place info |

---

## 7. Entity-Relationship Diagram

```
┌─────────────────┐       ┌─────────────────────┐       ┌─────────────────┐
│     USERS       │       │    VISIT_HISTORY     │       │     PLACES      │
├─────────────────┤       ├─────────────────────┤       ├─────────────────┤
│ id (PK)         │──┐    │ id (PK)             │    ┌──│ id (PK)         │
│ name            │  │    │ user_id (FK)    ────│────┘  │ place_name      │
│ email           │  ├───>│ place_id (FK)   ────│───────│ external_id     │
│ password_hash   │  │    │ visited_at          │       │ category        │
│ avatar_url      │  │    │ source              │       │ latitude        │
│ reputation      │  │    │ duration_minutes    │       │ longitude       │
│ is_active       │  │    │ is_verified         │       │ location (GIS)  │
│ created_at      │  │    │ navigation_completed│       │ current_rating  │
│ last_active_at  │  │    │ proximity_confirmed │       │ lifetime_rating │
└─────────────────┘  │    │ min_time_met        │       │ total_active_   │
                     │    └─────────────────────┘       │   reviews       │
                     │                                  │ created_at      │
                     │                                  └─────────────────┘
                     │                                          │
                     │    ┌─────────────────────┐               │
                     │    │      REVIEWS         │               │
                     │    ├─────────────────────┤               │
                     │    │ id (PK)             │               │
                     ├───>│ user_id (FK)        │               │
                     │    │ place_id (FK)   ────│───────────────┘
                     │    │ visit_id (FK)       │
                     │    │ rating              │
                     │    │ review_text         │
                     │    │ status              │
                     │    │ created_at          │
                     │    │ expires_at          │
                     │    │ helpful_count       │
                     │    │ not_helpful_count   │
                     │    │ flag_count          │
                     │    │ relevance_score     │
                     │    └────────┬────────────┘
                     │             │
          ┌──────────┼─────┬───────┼──────────┐
          │          │     │       │          │
          ▼          │     ▼       ▼          ▼
┌─────────────┐      │ ┌────────┐ ┌────────┐ ┌──────────────┐
│REVIEW_VOTES │      │ │REVIEW_ │ │REVIEW_ │ │ REVIEW_MEDIA │
├─────────────┤      │ │ FLAGS  │ │ TAGS   │ ├──────────────┤
│ id (PK)     │      │ ├────────┤ ├────────┤ │ id (PK)      │
│ user_id(FK)─│──────┘ │ id(PK) │ │ id(PK) │ │ review_id(FK)│
│ review_id(FK│        │user_id │ │review_ │ │ media_url    │
│ vote_type   │        │review_ │ │  id(FK)│ │ media_type   │
│ created_at  │        │  id(FK)│ │ tag    │ │ created_at   │
└─────────────┘        │ reason │ └────────┘ └──────────────┘
                       │resolved│
                       └────────┘


COMMUNITY_FORUM = VIEW on (reviews + users + places)
                  WHERE status = 'active' AND expires_at > NOW()
                  Filtered by ST_DWithin(location, user_location, radius)
```

### Relationships Summary

| Relationship | Cardinality | Description |
|---|---|---|
| `users` → `visit_history` | 1 : N | A user can visit many places |
| `places` → `visit_history` | 1 : N | A place can be visited by many users |
| `users` → `reviews` | 1 : N | A user can write many reviews |
| `places` → `reviews` | 1 : N | A place can have many reviews |
| `visit_history` → `reviews` | 1 : 1 | Each review links to one verified visit |
| `reviews` → `review_votes` | 1 : N | A review can receive many votes |
| `reviews` → `review_flags` | 1 : N | A review can be flagged multiple times |
| `reviews` → `review_tags` | 1 : N | A review can have many tags |
| `reviews` → `review_media` | 1 : N | A review can have many media attachments |
| `users` → `review_votes` | 1 : N | A user can vote on many reviews |
| `users` → `review_flags` | 1 : N | A user can flag many reviews |

---

## 8. Geolocation Optimization

### Why Geospatial Indexing is Critical

The system's core feature — showing reviews within a radius — requires fast geolocation queries. Without optimization, every query would scan ALL reviews in the database.

### Technology: PostgreSQL + PostGIS

**PostGIS** extends PostgreSQL with geographic object types and spatial indexing.

**Spatial column on places table:**
```sql
location GEOGRAPHY(Point, 4326) NOT NULL
```

- `GEOGRAPHY` type accounts for Earth's curvature (unlike flat `GEOMETRY`)
- `4326` is the SRID for WGS84 (standard GPS coordinate system)

**Spatial index:**
```sql
CREATE INDEX idx_places_location ON places USING GIST(location);
```

GIST (Generalized Search Tree) index enables O(log n) spatial lookups instead of O(n).

**Example query — find reviews within 1km:**
```sql
SELECT * FROM reviews r
JOIN places p ON r.place_id = p.id
WHERE ST_DWithin(p.location, ST_MakePoint(:lng, :lat)::geography, 1000)
AND r.status = 'active'
AND r.expires_at > NOW()
ORDER BY r.relevance_score DESC
LIMIT 20;
```

`ST_DWithin` uses the GIST index internally, making this query fast even with millions of rows.

---

## 9. Review Expiry System

### Core Principle

Reviews are NEVER deleted. They are **expired** — status changes from `active` to `expired`.

### Standard Expiry Calculation

```
expires_at = created_at + expiry_interval
```

### Dynamic Expiry (Tiered System)

The expiry interval varies based on how many active reviews a place already has:

```sql
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
        RETURN INTERVAL '30 days';     -- Plenty of reviews, keep fresh
    ELSIF active_count >= 1 THEN
        RETURN INTERVAL '60 days';     -- Some reviews, extend a bit
    ELSE
        RETURN INTERVAL '90 days';     -- Few/no reviews, preserve what exists
    END IF;
END;
$$ LANGUAGE plpgsql;
```

### Why This Matters

| Scenario | Fixed 30-Day Expiry | Dynamic Expiry |
|---|---|---|
| Popular restaurant (20 reviews/month) | Always has fresh reviews ✓ | 30-day expiry — same result ✓ |
| Small café (2 reviews/month) | Often shows 0 reviews ✗ | 60-day expiry — always has some ✓ |
| Rural park (1 review every 2 months) | Permanently empty ✗ | 90-day expiry — review persists ✓ |

### Expiry Cleanup

A scheduled job runs daily to expire old reviews:

```sql
UPDATE reviews
SET status = 'expired'
WHERE status = 'active'
AND expires_at < NOW();
```

This is a lightweight operation that should run during off-peak hours.

---

## 10. Visit Verification System

### The Challenge

Verifying that a user physically visited a place is the **hardest engineering problem** in this system. GPS alone can be spoofed.

### Composite Verification Approach

Three conditions must ALL be met:

| Condition | Field | Threshold |
|---|---|---|
| Navigation was completed | `navigation_completed` | TRUE |
| GPS was within proximity | `proximity_confirmed` | Within 50 meters of place |
| User stayed minimum time | `min_time_met` | >= 5 minutes at location |

```
is_verified = navigation_completed AND proximity_confirmed AND min_time_met
```

### Visit Sources

```
source = 'navigation'    → User navigated to the place via CityNav
source = 'gps_checkin'   → User manually checked in, GPS verified
source = 'auto_detect'   → System detected user lingering at a known place
```

### Deduplication

To prevent recording the same visit multiple times (e.g., user's GPS flickers):

```sql
CREATE UNIQUE INDEX idx_visit_dedup
ON visit_history(user_id, place_id, (DATE_TRUNC('hour', visited_at)));
```

This allows only one visit record per user per place per hour.

### Anti-Spoofing Measures

| Threat | Mitigation |
|---|---|
| Fake GPS apps | Composite verification (spoofing GPS alone is not enough) |
| API manipulation | Server-side validation of all visit data |
| Automated bots | Rate limiting + account reputation tracking |
| Collusion attacks | Pattern detection on review timing and content |

---

## 11. Review Eligibility Logic

### Rule

A user can submit a review for a place ONLY IF:

1. A **verified visit** exists in `visit_history`
2. The visit occurred within the **last 30 days**
3. The user does NOT already have an **active review** for that place

### SQL Function

```sql
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
```

### Enforcement

This function is called:
1. **Client-side:** To show/hide the "Write Review" button
2. **Server-side:** As a validation check before inserting a review (prevents API bypass)

---

## 12. API Flow for Posting a Review

```
Step 1: User opens a place detail page
              ↓
Step 2: Client calls GET /api/places/:placeId/can-review
              ↓
Step 3: Server runs can_user_review(userId, placeId)
              ↓
Step 4: If TRUE → "Write Review" button is shown
              ↓
Step 5: User fills in rating, text, tags, and optionally uploads media
              ↓
Step 6: Client calls POST /api/reviews
              ↓
Step 7: Server validates:
         - can_user_review() returns TRUE (double check)
         - rating is between 1 and 5
         - review_text passes content moderation
              ↓
Step 8: Server calculates expires_at via calculate_expiry(placeId)
              ↓
Step 9: Review inserted into reviews table with status = 'active'
              ↓
Step 10: Database trigger fires → updates places.current_rating
              ↓
Step 11: Client receives confirmation
```

---

## 13. Review Retrieval Logic

### When a User Opens a Location

```sql
SELECT reviews
WHERE place_id = :placeId
AND status = 'active'
AND expires_at > NOW()
ORDER BY relevance_score DESC, created_at DESC
LIMIT 20;
```

### When a User Opens the Community Forum (Nearby Reviews)

```sql
SELECT *
FROM get_nearby_reviews(:userLat, :userLng, :radiusMeters, 20);
```

The `get_nearby_reviews` function:

```sql
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
        r.rating,
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
```

---

## 14. Moderation System

### User Flagging

Any user can flag a review for one of these reasons:
- `spam` — promotional or irrelevant content
- `abusive` — harassing or targeting individuals
- `fake` — user suspects the review is fraudulent
- `irrelevant` — review does not relate to the place
- `offensive` — hateful, discriminatory, or inappropriate
- `other` — freeform reason provided in description field

### Constraints
- One flag per user per review (prevents flag spamming)
- Flags include a timestamp for audit trails

### Auto-Flagging Trigger

When a review accumulates 3 or more flags, it is automatically hidden:

```sql
-- Scheduled job (runs hourly)
UPDATE reviews
SET status = 'flagged'
WHERE status = 'active'
AND flag_count >= 3;
```

Flagged reviews are excluded from the `community_forum` view and must be manually reviewed by a moderator.

### Review Statuses

| Status | Meaning | Visible to Users? |
|---|---|---|
| `pending` | Awaiting moderation (optional for new users) | No |
| `active` | Live and visible | Yes |
| `expired` | Past expiry date | No |
| `flagged` | Auto-flagged due to user reports | No |
| `removed` | Manually removed by moderator | No |

---

## 15. Rating Aggregation Strategy

### The Problem

When reviews expire, a place's average rating changes unpredictably. A 4.8-star place could drop to 3.0 overnight if old positive reviews expire.

### The Solution: Dual Rating

Two separate ratings are maintained per place:

| Rating | Source | Usage |
|---|---|---|
| `current_rating` | Active, non-expired reviews only | **Shown to users** |
| `lifetime_rating` | ALL reviews ever (except `removed`) | **Used internally for ranking and search** |

### Automatic Updates via Trigger

```sql
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

CREATE TRIGGER trg_update_place_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_place_rating();
```

---

## 16. Review Reputation & Helpful Votes

### Purpose

Not all reviews are equally valuable. A helpful, detailed review should rank higher than "Nice place 5/5".

### Vote System

Users can vote on reviews:
- `helpful` — the review was useful
- `not_helpful` — the review was not useful

Constraint: One vote per user per review.

### Relevance Score Calculation

Reviews are ranked by a composite score:

```
relevance_score = (helpful_count - not_helpful_count) × freshness_decay_factor
```

Where:

```
freshness_decay_factor = 1.0 - (days_since_creation / expiry_days)
```

A 1-day-old review with 10 helpful votes ranks much higher than a 25-day-old review with 10 helpful votes.

### User Reputation

Users who consistently write helpful reviews gain `reputation` points:

```
When a user's review receives a "helpful" vote:
    user.reputation += 1

When a user's review receives a "not_helpful" vote:
    user.reputation -= 1 (minimum 0)
```

High-reputation users' reviews may be given priority in sorting.

---

## 17. Review Tags (Structured Feedback)

### Purpose

Free-text reviews are valuable but hard to aggregate. Tags provide structured, at-a-glance feedback.

### Available Tags

| Category | Tags |
|---|---|
| Crowd level | `crowded`, `quiet` |
| Cleanliness | `clean`, `dirty` |
| Safety | `safe`, `unsafe`, `well_lit`, `dark` |
| Food quality | `good_food`, `bad_food` |
| Service quality | `good_service`, `bad_service` |
| Parking | `parking_available`, `no_parking` |
| Accessibility | `wheelchair_accessible`, `not_accessible` |
| Family/Pet | `family_friendly`, `pet_friendly` |
| Status | `under_construction`, `temporarily_closed` |

### Usage

A review can have **multiple tags**. Tags are displayed as quick visual summaries:

```
"80% say it's crowded" | "90% say it's clean" | "70% say parking is available"
```

This is computed by aggregating tags across all active reviews for a place.

---

## 18. Review Media (Photos/Videos)

### Purpose

Photos dramatically increase review credibility and usefulness. A photo of a pothole-filled road says more than "bad road condition."

### Schema

```sql
review_media
------------
id              UUID PRIMARY KEY
review_id       UUID (FK → reviews)
media_url       VARCHAR(500)     -- cloud storage URL
media_type      VARCHAR(10)      -- 'image' or 'video'
created_at      TIMESTAMP
```

### Notes

- Media files should be stored in cloud storage (e.g., AWS S3, Google Cloud Storage)
- Only URLs are stored in the database
- Image compression and resizing should happen on upload
- Videos should have a maximum duration (e.g., 30 seconds)
- Media should be scanned for inappropriate content before publishing

---

## 19. Dynamic Radius Logic

### Formula

```
radius = base_radius × density_factor × category_factor
```

### Parameters

**Base radius:** 1000 meters

**Density factor:**

| Zone Type | Factor | Effective Base |
|---|---|---|
| Urban (dense city) | 0.5 | 500m |
| Suburban | 1.0 | 1000m |
| Rural | 3.0 | 3000m |

**Category factor:**

| Place Category | Factor | Rationale |
|---|---|---|
| Restaurant / Café | 0.3 | Users want very nearby food options |
| Shop / Store | 0.5 | Slightly wider search for shopping |
| Park / Recreation | 1.5 | Parks cover larger areas |
| Hospital / Clinic | 2.0 | Users search wider for healthcare |
| Transit Station | 0.8 | Specific to station area |
| Tourist Attraction | 1.5 | Wider interest area |

### Example Calculations

| Scenario | Calculation | Result |
|---|---|---|
| Urban restaurant | 1000 × 0.5 × 0.3 | **150m** |
| Urban hospital | 1000 × 0.5 × 2.0 | **1000m** |
| Suburban café | 1000 × 1.0 × 0.3 | **300m** |
| Rural hospital | 1000 × 3.0 × 2.0 | **6000m (6km)** |
| Suburban park | 1000 × 1.0 × 1.5 | **1500m (1.5km)** |

---

## 20. Service Layer Integration

### New Services for CityNav

```
services/
    review.service.ts
    visit-tracker.service.ts
    geospatial-query.service.ts
```

### visit-tracker.service.ts

**Responsibilities:**
- Records visits from GPS/navigation completion
- Computes composite verification (`is_verified`)
- Deduplicates visits within the same hour
- Provides `hasVerifiedVisit(userId, placeId)` method

### review.service.ts

**Responsibilities:**
- `canUserReview(userId, placeId)` — eligibility check
- `createReview(userId, placeId, data)` — submit review with dynamic expiry
- `expireOldReviews()` — scheduled batch expiry
- `updateRelevanceScores()` — recalculate relevance periodically
- `getReviewsForPlace(placeId, limit)` — place detail page
- `flagReview(userId, reviewId, reason)` — moderation
- `voteOnReview(userId, reviewId, voteType)` — helpful/not helpful

### geospatial-query.service.ts

**Responsibilities:**
- `getNearbyReviews(lat, lng, radius, limit)` — community forum view
- `calculateDynamicRadius(placeCategory, zoneType)` — radius computation
- `getPlacesInRadius(lat, lng, radius)` — place discovery

---

## 21. Scheduled Jobs

### Daily Jobs

| Job | Schedule | SQL |
|---|---|---|
| Expire old reviews | Daily at 2:00 AM | `UPDATE reviews SET status = 'expired' WHERE status = 'active' AND expires_at < NOW();` |
| Recalculate place ratings | Daily at 2:30 AM | Re-run `update_place_rating` for all places with expired reviews |
| Recalculate relevance scores | Daily at 3:00 AM | Update `relevance_score` for all active reviews |

### Hourly Jobs

| Job | Schedule | SQL |
|---|---|---|
| Auto-flag reported reviews | Every hour | `UPDATE reviews SET status = 'flagged' WHERE status = 'active' AND flag_count >= 3;` |

### Implementation Options

- **pg_cron** (PostgreSQL extension) — runs jobs inside the database
- **Node.js cron** (node-cron package) — runs jobs in the application layer
- **OS-level crontab** — simplest, runs SQL scripts via `psql`

---

## 22. System Flow Summary

### Complete End-to-End Flow

```
USER NAVIGATES TO PLACE
        ↓
GPS + Navigation engine records arrival
        ↓
Composite verification:
  - navigation_completed = TRUE?
  - GPS within 50m of place?
  - Time at location >= 5 min?
        ↓
visit_history entry created with is_verified = TRUE/FALSE
        ↓
User opens place detail page
        ↓
System calls can_user_review(userId, placeId)
        ↓
If TRUE → "Write Review" button shown
        ↓
User submits review (rating + text + tags + media)
        ↓
Server validates eligibility + content moderation
        ↓
expires_at calculated via calculate_expiry(placeId)
        ↓
Review inserted into reviews table (status = 'active')
        ↓
Database trigger fires → places.current_rating updated
        ↓
─────────────────── LATER ───────────────────
        ↓
ANOTHER USER opens map near that area
        ↓
get_nearby_reviews(lat, lng, dynamicRadius) called
        ↓
PostGIS spatial query executes:
  ST_DWithin(place.location, user.location, radius)
        ↓
Only active, non-expired, nearby reviews returned
        ↓
Sorted by relevance_score = (helpfulness × freshness)
        ↓
Top 20 reviews displayed to user
        ↓
User can vote "helpful" / "not helpful" on reviews
        ↓
User can flag inappropriate reviews
        ↓
─────────────────── DAILY ───────────────────
        ↓
Cron job expires old reviews (status → 'expired')
        ↓
Place ratings recalculated
        ↓
Flagged reviews (3+ flags) hidden for moderation
```

---

## 23. Summary of Changes from Original Proposal

| # | Original Proposal | Problem Identified | Final Decision |
|---|---|---|---|
| 1 | 4 tables: users, history, community_forum, user_reviews | Missing places table; redundant community_forum table | **8 tables + 1 view** |
| 2 | `community_forum` as a table | Duplicates `user_reviews` | **Replaced with a SQL VIEW** |
| 3 | No `places` table | Reviews have no anchor entity | **Added `places` table with PostGIS** |
| 4 | No geospatial support | Radius queries would be impossibly slow | **PostGIS + GIST spatial indexing** |
| 5 | Hard 30-day expiry for all reviews | Creates "review deserts" for unpopular places | **Dynamic tiered expiry: 30/60/90 days** |
| 6 | No visit verification method defined | How to prove a user visited? Spoofing risk. | **Composite verification: GPS + time + navigation** |
| 7 | No moderation | Abuse, spam, hate speech risk | **Added review_flags table + auto-flagging** |
| 8 | No rating strategy | Ratings fluctuate wildly with expiry | **Dual rating: current_rating + lifetime_rating** |
| 9 | Fixed radius for review visibility | Urban vs rural mismatch | **Dynamic radius by density × category** |
| 10 | No engagement features | Reviews are flat, no quality signal | **Added votes, tags, media, reputation** |

---

## 24. Full SQL Schema

### Enable PostGIS

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 1. Users Table

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    avatar_url      VARCHAR(500),
    reputation      INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW(),
    last_active_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

### 2. Places Table

```sql
CREATE TABLE places (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_name          VARCHAR(255) NOT NULL,
    external_place_id   VARCHAR(255),
    category            VARCHAR(50) NOT NULL,
    address             TEXT,
    city                VARCHAR(100),
    latitude            DECIMAL(10, 8) NOT NULL,
    longitude           DECIMAL(11, 8) NOT NULL,
    location            GEOGRAPHY(Point, 4326) NOT NULL,
    current_rating      DECIMAL(2, 1) DEFAULT 0.0,
    lifetime_rating     DECIMAL(2, 1) DEFAULT 0.0,
    total_active_reviews INTEGER DEFAULT 0,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_places_location ON places USING GIST(location);
CREATE INDEX idx_places_category ON places(category);
CREATE INDEX idx_places_city ON places(city);
CREATE INDEX idx_places_external_id ON places(external_place_id);
```

### 3. Visit History Table

```sql
CREATE TABLE visit_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    place_id        UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    visited_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    source          VARCHAR(20) NOT NULL CHECK (source IN ('navigation', 'gps_checkin', 'auto_detect')),
    gps_latitude    DECIMAL(10, 8),
    gps_longitude   DECIMAL(11, 8),
    duration_minutes INTEGER,
    is_verified     BOOLEAN DEFAULT FALSE,
    navigation_completed  BOOLEAN DEFAULT FALSE,
    proximity_confirmed   BOOLEAN DEFAULT FALSE,
    min_time_met          BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_visit_user ON visit_history(user_id);
CREATE INDEX idx_visit_place ON visit_history(place_id);
CREATE INDEX idx_visit_verified ON visit_history(user_id, place_id, is_verified);
CREATE INDEX idx_visit_date ON visit_history(visited_at DESC);

CREATE UNIQUE INDEX idx_visit_dedup
ON visit_history(user_id, place_id, (DATE_TRUNC('hour', visited_at)));
```

### 4. Reviews Table

```sql
CREATE TABLE reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    place_id        UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    visit_id        UUID NOT NULL REFERENCES visit_history(id) ON DELETE CASCADE,
    rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text     TEXT,
    status          VARCHAR(20) DEFAULT 'active'
                    CHECK (status IN ('active', 'expired', 'flagged', 'removed', 'pending')),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMP NOT NULL,
    helpful_count   INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    flag_count      INTEGER DEFAULT 0,
    relevance_score DECIMAL(5, 2) DEFAULT 0.0
);

CREATE INDEX idx_reviews_place_active ON reviews(place_id, status, expires_at DESC)
    WHERE status = 'active';
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_expiry ON reviews(expires_at) WHERE status = 'active';
CREATE INDEX idx_reviews_created ON reviews(created_at DESC);

CREATE UNIQUE INDEX idx_reviews_unique_active
ON reviews(user_id, place_id) WHERE status = 'active';
```

### 5. Review Votes Table

```sql
CREATE TABLE review_votes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    review_id       UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    vote_type       VARCHAR(15) NOT NULL CHECK (vote_type IN ('helpful', 'not_helpful')),
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, review_id)
);

CREATE INDEX idx_votes_review ON review_votes(review_id);
```

### 6. Review Flags Table

```sql
CREATE TABLE review_flags (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    review_id       UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    reason          VARCHAR(30) NOT NULL
                    CHECK (reason IN ('spam', 'abusive', 'fake', 'irrelevant', 'offensive', 'other')),
    description     TEXT,
    resolved        BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, review_id)
);

CREATE INDEX idx_flags_review ON review_flags(review_id);
CREATE INDEX idx_flags_unresolved ON review_flags(resolved) WHERE resolved = FALSE;
```

### 7. Review Tags Table

```sql
CREATE TABLE review_tags (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id       UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    tag             VARCHAR(30) NOT NULL
                    CHECK (tag IN (
                        'crowded', 'quiet', 'clean', 'dirty',
                        'safe', 'unsafe', 'well_lit', 'dark',
                        'good_food', 'bad_food', 'good_service', 'bad_service',
                        'parking_available', 'no_parking',
                        'wheelchair_accessible', 'not_accessible',
                        'family_friendly', 'pet_friendly',
                        'under_construction', 'temporarily_closed'
                    )),
    UNIQUE(review_id, tag)
);

CREATE INDEX idx_tags_review ON review_tags(review_id);
CREATE INDEX idx_tags_tag ON review_tags(tag);
```

### 8. Review Media Table

```sql
CREATE TABLE review_media (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id       UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    media_url       VARCHAR(500) NOT NULL,
    media_type      VARCHAR(10) NOT NULL CHECK (media_type IN ('image', 'video')),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_media_review ON review_media(review_id);
```

### 9. Community Forum View

```sql
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
```

### 10. Functions

```sql
-- Check if user can review a place
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

-- Get reviews within radius of a point
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
        r.rating,
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

-- Calculate dynamic expiry based on review density
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

-- Trigger: Update place ratings when reviews change
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

CREATE TRIGGER trg_update_place_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_place_rating();
```

### 11. Scheduled Jobs (Cron)

```sql
-- Run daily at 2:00 AM: Expire old reviews
UPDATE reviews SET status = 'expired' WHERE status = 'active' AND expires_at < NOW();

-- Run hourly: Auto-flag reviews with 3+ flags
UPDATE reviews SET status = 'flagged' WHERE status = 'active' AND flag_count >= 3;
```

---

## End of Document

This document serves as the complete reference for the CityNav Community Forum system design. All architectural decisions, database schemas, functions, and logic flows are documented here for implementation reference.
