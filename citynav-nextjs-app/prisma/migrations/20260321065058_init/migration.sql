-- CreateEnum
CREATE TYPE "public"."VisitSource" AS ENUM ('navigation', 'gps_checkin', 'auto_detect');

-- CreateEnum
CREATE TYPE "public"."ReviewStatus" AS ENUM ('active', 'expired', 'flagged', 'removed', 'pending');

-- CreateEnum
CREATE TYPE "public"."VoteType" AS ENUM ('helpful', 'not_helpful');

-- CreateEnum
CREATE TYPE "public"."FlagReason" AS ENUM ('spam', 'abusive', 'fake', 'irrelevant', 'offensive', 'other');

-- CreateEnum
CREATE TYPE "public"."ReviewTagType" AS ENUM ('crowded', 'quiet', 'clean', 'dirty', 'safe', 'unsafe', 'well_lit', 'dark', 'good_food', 'bad_food', 'good_service', 'bad_service', 'parking_available', 'no_parking', 'wheelchair_accessible', 'not_accessible', 'family_friendly', 'pet_friendly', 'under_construction', 'temporarily_closed');

-- CreateEnum
CREATE TYPE "public"."MediaType" AS ENUM ('image', 'video');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "email_verified" TIMESTAMP(3),
    "avatar_url" VARCHAR(500),
    "password_hash" VARCHAR(255),
    "reputation" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."accounts" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."places" (
    "id" UUID NOT NULL,
    "place_name" VARCHAR(255) NOT NULL,
    "external_place_id" VARCHAR(255),
    "category" VARCHAR(50) NOT NULL,
    "address" TEXT,
    "city" VARCHAR(100),
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "location" geography(Point, 4326) NOT NULL,
    "current_rating" DECIMAL(2,1) NOT NULL DEFAULT 0.0,
    "lifetime_rating" DECIMAL(2,1) NOT NULL DEFAULT 0.0,
    "total_active_reviews" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."visit_history" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "place_id" UUID NOT NULL,
    "visited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "public"."VisitSource" NOT NULL,
    "gps_latitude" DECIMAL(10,8),
    "gps_longitude" DECIMAL(11,8),
    "duration_minutes" INTEGER,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "navigation_completed" BOOLEAN NOT NULL DEFAULT false,
    "proximity_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "min_time_met" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reviews" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "place_id" UUID NOT NULL,
    "visit_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "review_text" TEXT,
    "status" "public"."ReviewStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "not_helpful_count" INTEGER NOT NULL DEFAULT 0,
    "flag_count" INTEGER NOT NULL DEFAULT 0,
    "relevance_score" DECIMAL(5,2) NOT NULL DEFAULT 0.0,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."review_votes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "vote_type" "public"."VoteType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."review_flags" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "reason" "public"."FlagReason" NOT NULL,
    "description" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."review_tags" (
    "id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "tag" "public"."ReviewTagType" NOT NULL,

    CONSTRAINT "review_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."review_media" (
    "id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "media_url" VARCHAR(500) NOT NULL,
    "media_type" "public"."MediaType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "public"."accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "public"."sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "public"."verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "public"."verification_tokens"("identifier", "token");

-- CreateIndex
CREATE INDEX "idx_places_category" ON "public"."places"("category");

-- CreateIndex
CREATE INDEX "idx_places_city" ON "public"."places"("city");

-- CreateIndex
CREATE INDEX "idx_places_external_id" ON "public"."places"("external_place_id");

-- CreateIndex
CREATE INDEX "idx_visit_user" ON "public"."visit_history"("user_id");

-- CreateIndex
CREATE INDEX "idx_visit_place" ON "public"."visit_history"("place_id");

-- CreateIndex
CREATE INDEX "idx_visit_verified" ON "public"."visit_history"("user_id", "place_id", "is_verified");

-- CreateIndex
CREATE INDEX "idx_visit_date" ON "public"."visit_history"("visited_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "reviews_visit_id_key" ON "public"."reviews"("visit_id");

-- CreateIndex
CREATE INDEX "idx_reviews_user" ON "public"."reviews"("user_id");

-- CreateIndex
CREATE INDEX "idx_reviews_created" ON "public"."reviews"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_votes_review" ON "public"."review_votes"("review_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_votes_user_id_review_id_key" ON "public"."review_votes"("user_id", "review_id");

-- CreateIndex
CREATE INDEX "idx_flags_review" ON "public"."review_flags"("review_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_flags_user_id_review_id_key" ON "public"."review_flags"("user_id", "review_id");

-- CreateIndex
CREATE INDEX "idx_tags_review" ON "public"."review_tags"("review_id");

-- CreateIndex
CREATE INDEX "idx_tags_tag" ON "public"."review_tags"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "review_tags_review_id_tag_key" ON "public"."review_tags"("review_id", "tag");

-- CreateIndex
CREATE INDEX "idx_media_review" ON "public"."review_media"("review_id");

-- AddForeignKey
ALTER TABLE "public"."accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."visit_history" ADD CONSTRAINT "visit_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."visit_history" ADD CONSTRAINT "visit_history_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "public"."visit_history"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."review_votes" ADD CONSTRAINT "review_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."review_votes" ADD CONSTRAINT "review_votes_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."review_flags" ADD CONSTRAINT "review_flags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."review_flags" ADD CONSTRAINT "review_flags_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."review_tags" ADD CONSTRAINT "review_tags_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."review_media" ADD CONSTRAINT "review_media_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
