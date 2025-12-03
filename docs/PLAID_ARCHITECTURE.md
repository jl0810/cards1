# Plaid Integration Architecture

## Overview

This document outlines the simplified architecture for Plaid integration, focusing on three core archetypes: Onboarding, Active Sync, and Recovery. The goal is to maintain a robust, self-healing system without over-engineered "resurrection" logic.

## 1. Archetype: Onboarding (Fresh Link)

**Goal:** Establish a new connection with a financial institution.

- **Trigger:** User clicks "Add Bank".
- **Flow:**
  1. Launch Plaid Link (Normal Mode).
  2. User authenticates.
  3. **Success:** Receive `public_token` and `metadata`.
  4. **Exchange:** Swap `public_token` for `access_token` and `item_id`.
  5. **Storage:**
     - Create `PlaidItem` with status `active`.
     - Encrypt and store `access_token` in Vault.
     - Fetch and store initial `PlaidAccount` data.
- **Duplicate Rule:** If an `active` item for the same institution already exists, block the new link and prompt the user to check the existing connection.

## 2. Archetype: Active Sync & Monitoring

**Goal:** Keep data fresh and status accurate.

- **Trigger:** Scheduled Cron (e.g., hourly) or User Action ("Refresh All").
- **Flow:**
  1. **Status Check:** Call `/item/get`.
     - If `error` is `ITEM_LOGIN_REQUIRED` → Update DB status to `needs_reauth`.
     - If `error` is `ITEM_NOT_FOUND` (Revoked) → Update DB status to `disconnected`.
     - If `error` is null → Update DB status to `active`.
  2. **Transaction Sync:** Call `/transactions/sync`.
     - If success → Update `PlaidTransaction` and `PlaidAccount` balances.
     - If error → Log error. If error is permanent (e.g., `ITEM_LOGIN_REQUIRED`), update status.

## 3. Archetype: Recovery (The "Fix" Flow)

**Goal:** Restore broken connections without data loss or duplication.

### Scenario A: Credentials Changed (`ITEM_LOGIN_REQUIRED`)

**Context:** User changed bank password. Plaid cannot sync.

- **UI:** Show **"Fix Connection"** button on the existing card.
- **Action:** Launch Plaid Link in **Update Mode**.
  - Pass the existing `access_token` to Plaid Link.
- **Result:**
  - User re-authenticates.
  - Plaid updates the _existing_ Item.
  - No new Item ID is generated.
  - We update DB status to `active`.
  - **Zero data loss, zero duplicates.**

### Scenario B: Consent Revoked (`ITEM_NOT_FOUND`)

**Context:** User revoked access via bank portal or Plaid portal.

- **UI:** Show **"Re-link"** button on the existing card.
- **Data State (Soft Delete):**
  - Flag Item as `disconnected`.
  - Flag Accounts as `inactive` (Soft Delete).
  - **Archive Data:** Keep accounts and transactions read-only for history.
- **Action:** User clicks "Re-link".
- **Result (Fresh Link):**
  - Since the old Item is dead, this creates a **New Item** (New `item_id`).
  - **Data Strategy (Smart Adoption):**
    - System detects `inactive` accounts with matching mask/name.
    - **Adopts** `AccountExtended` settings (nicknames, notes, payment status) to the new accounts.
    - Marks old accounts as `replaced`.
    - Result: Seamless restoration of user customizations.

## Summary of Changes Implemented

1. **UI:** Added "Fix Connection" / "Re-link" button to `BankAccountsView` with Smart Fix logic.
2. **Schema:** Added `status` field to `PlaidAccount` for Soft Delete support.
3. **API:** Implemented Adoption Logic in `exchange-public-token` to restore settings.
4. **Logic:** Updated `disconnect` flow to mark accounts as `inactive` instead of deleting.
