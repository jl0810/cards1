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

- **UI:** Show **"Disconnected"** badge.
- **Data State:**
  - Flag Item as `disconnected`.
  - **Archive Data:** Keep accounts and transactions read-only for history.
- **Action:** User clicks "Reconnect" (or "Add Bank").
- **Result (Fresh Link):**
  - Since the old Item is dead, this creates a **New Item** (New `item_id`).
  - **Data Strategy (Swap Back):**
    - Detect that this new Item matches the institution of a `disconnected` Item.
    - _Option 1 (Simple):_ Treat as new. Old data remains archived.
    - _Option 2 (Smart):_ If accounts match (same mask), "adopt" the old data:
      - Link old `PlaidTransaction` records to the new `PlaidItem`.
      - Mark old `PlaidItem` as `inactive` (hidden).
      - This achieves the "swap back to active" effect.

## Summary of Changes Required

1. **UI:** Add "Fix Connection" button to `BankAccountsView` for `needs_reauth` items.
2. **API:** Ensure `/api/plaid/items` or `/api/plaid/status` accurately reflects `ITEM_LOGIN_REQUIRED`.
3. **Logic:** Remove complex "duplicate detection" blocking for _disconnected_ items (allow them to be replaced/re-linked).
