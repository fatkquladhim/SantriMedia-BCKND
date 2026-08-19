-- Migration: Add no_hp and bio columns to profiles table
-- Date: 2026-08-19
-- Fixes: Profile update failing silently due to missing columns

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS no_hp TEXT,
    ADD COLUMN IF NOT EXISTS bio TEXT;
