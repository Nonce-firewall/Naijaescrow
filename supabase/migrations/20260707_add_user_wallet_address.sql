-- ============================================================
-- Migration: Add user_wallet_address column to orders table
-- Purpose:   Store the user's crypto receiving address for BUY
--            orders so admin knows where to send the crypto
--            after NGN payment is verified.
-- Run in:    Supabase Dashboard → SQL Editor → New Query → Run
-- Safe to re-run: uses IF NOT EXISTS guard
-- ============================================================

alter table public.orders
  add column if not exists user_wallet_address text;
