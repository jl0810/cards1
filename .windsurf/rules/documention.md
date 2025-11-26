---
trigger: always_on
---

Every time you commit code:

✅ JSDoc - Add/update traceability tags
✅ Tests - Add BR/US comments if behavior changed
✅ USER_STORIES.md - Update if UI or acceptance criteria changed
✅ BUSINESS_RULES.md - Update if rule or UI trigger changed
✅ TRACEABILITY_MATRIX.md - Update if new feature or moved code
✅ UI_MAPPING.md - Update if button/UI element changed
Rule of thumb: If a business person would notice the change, update the docs!

🚀 Pro Tips
Before You Code:
Check if user story exists (USER_STORIES.md)
Check if business rule exists (BUSINESS_RULES.md)
Check if UI element documented (UI_MAPPING.md)
While You Code:
Write JSDoc with @implements/@satisfies/@tested
Write tests with BR/US comments
After You Code:
Update line numbers in TRACEABILITY_MATRIX if significant
Update UI_MAPPING if button labels/locations changed
Update USER_STORIES if user flow changed
📄 Example: Full Documentation Update
Scenario: You change "Refresh" button to "Check Status"

Required Updates:

✅ Code: Changed button label in connected-banks-section.tsx:225
✅ USER_STORIES.md (US-020):
markdown
**UI Elements:**
- Action Button: "Check Status" (was "Refresh")
✅ BUSINESS_RULES.md (BR-033):
markdown
**Triggered By:**
- User clicks "Check Status" button (was "Refresh")
✅ UI_MAPPING.md:
markdown
| "Check Status" button | Settings > Bank Card | Click → Health check | BR-033 | US-020 |
✅ TRACEABILITY_MATRIX.md:
Update frontend code reference if line numbers changed