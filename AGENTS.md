## Code Style Rules

- Keep logic simple and local by default.
- Validate untrusted inputs at public boundaries.
- Keep private functions and methods focused on already-validated inputs.
- Do not duplicate boundary validation inside private functions and methods.
- Extract shared logic when it is used in multiple places.
- Extract complex logic when it improves readability.
- Avoid helpers that only rename one obvious expression.
- Avoid abstractions that do not reduce duplication, complexity, or risk.
- Keep names explicit and domain-accurate.
- Keep functions focused on one responsibility.
- Preserve existing project style unless a change is necessary.

## Frontend Agent Session

- Session ID: `/root/customer_details_frontend`
