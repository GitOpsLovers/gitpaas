# The area `docs/business/`, and the shape of a page

### The business

`docs/business/` states what the system does for its user. One page holds one capability, and its name is the name of that capability. `docs/business.md` is its index.

**The border with `key-flows.md`.** A page of the business states the rule; the `key-flows.md` of the area states the mechanism that carries it. "A secret never leaves the server in an answer of the API" is a rule, and it belongs to the business. "The adapter encrypts with AES-256-GCM, and it reads the key from `SECRETS_ENCRYPTION_KEY`" is a mechanism, and it belongs to `key-flows.md`. Never state one of the two in the other place.

A page of the business takes this shape:

```markdown
# <the capability>

## Purpose

One paragraph. What the capability gives the user.

## <the rule>

The system SHALL <do the thing>, <under this condition>.

One or two paragraphs of the detail, and the reason.

### Scenario: <the case>

- **WHEN** <the situation>
- **THEN** <the result>
```

Write the rule with `SHALL`, so it states an obligation and not a habit. Write one scenario for each case that proves the rule, because `tester` derives one test from one scenario. A rule with no scenario is a rule that nobody checks.
