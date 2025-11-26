# Documentation Guide

**Complete Traceability: From Business Requirements to Code to Tests**

This guide explains how to navigate the PointMax Velocity documentation system, which provides full traceability from user stories through business rules to implementation and verification.

---

## 📚 Documentation Structure

```
docs/
├── USER_STORIES.md          ← What users need (19 stories)
├── BUSINESS_RULES.md         ← How system should behave (32 rules)
├── TRACEABILITY_MATRIX.md    ← Links everything together
├── UI_MAPPING.md             ← UI elements to business rules cross-reference
├── DOCUMENTATION_GUIDE.md    ← You are here
├── ARCHITECTURE.md           ← Technical design patterns
└── README (in __tests__/)    ← Testing documentation

Source Code:
├── JSDoc comments            ← Implementation details + references
└── Code implements rules

Tests:
└── Jest tests                ← Verification + references
```

---

## 🎯 Use Cases

### **For Business Stakeholders**

#### "I want to see if a requirement is implemented"

1. **Open:** `docs/USER_STORIES.md`
2. **Find:** Your user story (e.g., [US-003] Add Family Members)
3. **Check:** 
   - Acceptance Criteria (what it should do)
   - Business Rules referenced
   - Code location (where it's built)
   - Tests location (how it's verified)

**Example:**
```markdown
[US-003] Add Family Members
Acceptance Criteria:
  ✓ Owner can add unlimited family members
  ✓ Each member requires a name
  ✓ Input is validated
  
Business Rules: [BR-003, BR-004]
Code: app/api/user/family/route.ts::POST
Tests: __tests__/api/user/family.test.ts
```

#### "I want to verify a business rule is enforced"

1. **Open:** `docs/BUSINESS_RULES.md`
2. **Find:** Your rule (e.g., [BR-004] Name Requirements)
3. **Check:**
   - Description (what the rule says)
   - Which stories it supports
   - Where it's implemented
   - Which tests verify it

**Example:**
```markdown
[BR-004] Family Member Name Requirements
Description: Names must be 1-100 characters, non-empty
User Stories: [US-003]
Code: lib/validations.ts::CreateFamilyMemberSchema
Tests: __tests__/lib/validations.test.ts (lines 12-72)
```

#### "I want to see test coverage"

1. **Open:** `docs/TRACEABILITY_MATRIX.md`
2. **Review:** Coverage Analysis section
3. **See:**
   - Which features are tested (✅)
   - Which features need tests (⚠️ ❌)
   - Test gap analysis

#### "I want to find a button or UI element"

1. **Open:** `docs/UI_MAPPING.md`
2. **Find:** The button name or page location
3. **See:**
   - Which business rules it enforces
   - Which user stories it satisfies
   - What code handles the action
   - Visual feedback (toasts, badges, etc.)

**Example:**
```markdown
"Check Status" button
Location: Settings > Connected Banks > Each bank card
Action: Triggers health check via BR-033
Feedback: Toast "Checking status..." → Badge updates
Code: api/plaid/items/[itemId]/status/route.ts
```

#### "I want to manually test a feature"

1. **Open:** `docs/UI_MAPPING.md`
2. **Find:** Your feature in the testing guide section
3. **Follow:** Step-by-step instructions
4. **Verify:** Expected results match actual behavior

**Example Test Case:**
```markdown
Test: Verify "Check Status" button works
Steps:
  1. Navigate to Settings > Connected Banks
  2. Click "Check Status" button
  3. Verify toast "Checking status..." appears
  4. Verify badge updates after 1-2 seconds
  5. Verify timestamp updates
```

---

### **For Developers**

#### "I'm working on a feature - what requirements apply?"

1. **Open:** Code file you're editing
2. **Read:** JSDoc comment above function
3. **See:**
   ```javascript
   /**
    * Creates a new family member
    * 
    * @implements BR-003 - Family Member Ownership
    * @implements BR-004 - Name Requirements
    * @satisfies US-003 - Add Family Members
    * @tested __tests__/api/user/family.test.ts
    */
   export async function POST(req: Request) {
   ```

#### "I need to understand a business rule"

1. **Open:** `docs/BUSINESS_RULES.md`
2. **Search:** Rule ID (e.g., BR-017)
3. **Get:**
   - Full description
   - Category
   - Related stories
   - Implementation location
   - Test location

#### "Where should I add tests?"

1. **Open:** `docs/TRACEABILITY_MATRIX.md`
2. **Find:** Test Gap Analysis section
3. **See:** Prioritized list of untested features

**High Priority Gaps:**
- US-006: Link Bank Account (0% tested)
- US-013: View Dashboard (0% tested)
- US-005: Delete Family Member (33% tested)

#### "How do I document my code?"

**JSDoc Template:**
```javascript
/**
 * [Brief description of function]
 * 
 * @implements BR-XXX - [Rule name]
 * @implements BR-YYY - [Another rule if applicable]
 * @satisfies US-ZZZ - [User story]
 * @tested __tests__/path/to/test.ts
 * 
 * @param {Type} paramName - Description
 * @returns {Type} Description
 * @throws {Error} When...
 */
```

---

### **For QA/Testers**

#### "What should this feature do?"

**Path 1 - Start from Test:**
1. **Open:** Test file (e.g., `__tests__/lib/validations.test.ts`)
2. **Read:** Test comments (e.g., `// Tests BR-004 for US-003`)
3. **Check:** 
   - `docs/BUSINESS_RULES.md` for BR-004
   - `docs/USER_STORIES.md` for US-003
4. **Verify:** Test covers all acceptance criteria

**Path 2 - Start from Story:**
1. **Open:** `docs/USER_STORIES.md`
2. **Find:** Story you're testing
3. **Read:** Acceptance Criteria
4. **Go to:** Tests location
5. **Verify:** Each criterion has test

#### "How do I write a new test?"

**Test Template:**
```typescript
describe('Feature Name', () => {
  describe('US-XXX: User Story Title', () => {
    it('should satisfy BR-YYY - Rule description', () => {
      // Tests BR-YYY for US-XXX
      // Arrange
      const input = { /* test data */ };
      
      // Act
      const result = functionUnderTest(input);
      
      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

#### "What's the test coverage?"

1. **Open:** `docs/TRACEABILITY_MATRIX.md`
2. **Check:** Coverage Analysis section
3. **Run:** `npm run test:coverage` for detailed report

**Current Coverage:**
- Overall: 47% of rules tested
- Family Management: 71%
- Benefits Tracking: 88%
- Validation: 100%

---

### **For Product Managers**

#### "What features exist?"

1. **Open:** `docs/USER_STORIES.md`
2. **Scan:** All 19 user stories organized by feature area
3. **Check:** Implementation and test status

**Feature Areas:**
- Authentication & User Management (2 stories)
- Family Management (3 stories)
- Bank Integration (4 stories)
- Benefits Tracking (3 stories)
- Dashboard (2 stories)
- Validation & Security (3 stories)
- Admin (1 story)

#### "What's not tested yet?"

1. **Open:** `docs/TRACEABILITY_MATRIX.md`
2. **Review:** Test Gap Analysis
3. **Prioritize:** Based on user impact

**Gap Summary:**
- Bank account linking: 0% tested (HIGH PRIORITY)
- Dashboard: 0% tested (HIGH PRIORITY)
- Auth webhooks: 0% tested (LOW PRIORITY)

#### "How do I request a new feature?"

1. **Open:** `docs/USER_STORIES.md`
2. **Add:** New story following format:
   ```markdown
   ### **[US-020]** Feature Title
   **As a** [user type]
   **I want** [goal]
   **So that** [benefit]
   
   **Acceptance Criteria:**
   - Criterion 1
   - Criterion 2
   
   **Business Rules:** [TBD]
   **Code:** [Not implemented]
   **Tests:** [None]
   ```
3. **Define:** Business rules in `BUSINESS_RULES.md`
4. **Update:** Traceability matrix when implemented

---

## 🔍 Search Strategies

### Find by User Story ID
```bash
# Search all docs
grep -r "US-003" docs/

# Results:
# USER_STORIES.md - Full story
# BUSINESS_RULES.md - Rules that implement it
# TRACEABILITY_MATRIX.md - Code and test locations
```

### Find by Business Rule ID
```bash
grep -r "BR-004" docs/
# Plus search in code:
grep -r "BR-004" lib/ app/ __tests__/
```

### Find by Code File
```bash
# In TRACEABILITY_MATRIX.md
# Search "Code File → Stories & Rules" table
```

### Find Untested Features
```bash
# In TRACEABILITY_MATRIX.md
# Look for ⚠️ and ❌ symbols
# Or search for "No test"
```

---

## 📊 Documentation Metrics

### Coverage Statistics
- **User Stories:** 19 total
  - With tests: 8 (42%)
  - Without tests: 11 (58%)

- **Business Rules:** 32 total
  - With tests: 13 (41%)
  - Without tests: 19 (59%)

- **Code Files:** 12 core implementation files
  - With tests: 8 (67%)
  - Without tests: 4 (33%)

### Test Statistics
- **Test Files:** 10
- **Test Cases:** 170+
- **Production Ready:** 145+ tests (85%)
- **Integration Examples:** 25+ tests (15%)

---

## 🔗 Quick Links

| Document | Purpose | Use When |
|----------|---------|----------|
| [USER_STORIES.md](./USER_STORIES.md) | Business requirements | Understanding what & why |
| [BUSINESS_RULES.md](./BUSINESS_RULES.md) | System behavior | Understanding how |
| [TRACEABILITY_MATRIX.md](./TRACEABILITY_MATRIX.md) | Linkages | Finding connections |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Technical design | Understanding structure |
| [__tests__/README.md](../__tests__/README.md) | Testing guide | Writing tests |
| [CHANGELOG.md](../CHANGELOG.md) | Recent changes | Tracking updates |

---

## 🎓 Best Practices

### When Writing Code
1. ✅ Add JSDoc with `@implements` and `@satisfies` tags
2. ✅ Reference business rule IDs
3. ✅ Include user story IDs
4. ✅ Link to test file

### When Writing Tests
1. ✅ Add comments: `// Tests BR-XXX for US-YYY`
2. ✅ Organize by user story
3. ✅ Name tests clearly
4. ✅ Cover all acceptance criteria

### When Updating Docs
1. ✅ Keep USER_STORIES.md current
2. ✅ Update BUSINESS_RULES.md when rules change
3. ✅ Maintain TRACEABILITY_MATRIX.md
4. ✅ Update test coverage statistics

### When Reviewing Code
1. ✅ Verify JSDoc references exist
2. ✅ Check business rules are followed
3. ✅ Confirm tests exist
4. ✅ Update traceability matrix

---

## 🚀 Getting Started

**For Your First Day:**

1. **Read:** This guide (you're here!)
2. **Browse:** `docs/USER_STORIES.md` to understand features
3. **Review:** `docs/TRACEABILITY_MATRIX.md` for gaps
4. **Pick:** An untested feature
5. **Implement:** Tests following templates
6. **Update:** Documentation

**For Your First Feature:**

1. **Write:** User story in USER_STORIES.md
2. **Define:** Business rules in BUSINESS_RULES.md
3. **Implement:** Code with proper JSDoc
4. **Write:** Tests with rule/story references
5. **Update:** Traceability matrix
6. **Verify:** All links work

---

## 💡 Tips & Tricks

### VSCode Extensions
- **Markdown All in One:** Navigate between docs easily
- **Better Comments:** Highlight JSDoc tags
- **Jest Runner:** Run tests inline

### Git Hooks (Recommended)
```bash
# Pre-commit: Check for JSDoc on new functions
# Pre-push: Verify traceability matrix updated
```

### Alias Commands
```bash
alias docs="cd docs && ls -la"
alias matrix="open docs/TRACEABILITY_MATRIX.md"
alias stories="open docs/USER_STORIES.md"
alias rules="open docs/BUSINESS_RULES.md"
```

---

## 📞 Need Help?

### Documentation Issues
- **Missing link:** Update TRACEABILITY_MATRIX.md
- **Unclear rule:** Add details to BUSINESS_RULES.md
- **Test gap:** Check Test Gap Analysis section

### Code Questions
- **What does this do?:** Check JSDoc `@implements` tag
- **Why this way?:** Check referenced business rule
- **Is this tested?:** Check JSDoc `@tested` tag

---

**Last Updated:** November 26, 2025  
**Version:** 1.0  
**Maintainer:** Development Team
