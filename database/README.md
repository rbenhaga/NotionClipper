# Database Migrations

This directory contains SQL migrations for the Notion Clipper Supabase database.

## How to Execute Migrations

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of the migration file
4. Paste and execute the SQL

## Migrations

### 002_fix_handle_new_user_null_email.sql

**Purpose**: Fix the `handle_new_user()` trigger to support NULL email addresses for Notion OAuth users.

**Changes**:
- Allows `user_profiles.email` to be NULL
- Updates trigger to handle missing email gracefully
- Uses `COALESCE` to provide fallback values
- Adds error handling to prevent user creation from failing
- Creates unique index on email only when email is not NULL

**Why**: Notion OAuth doesn't always provide an email address, but Supabase still creates the auth.users record. The trigger needs to handle this case.

**Execute this migration** in Supabase SQL Editor before testing Notion OAuth authentication.
