# Practical tools — working portfolio demos

Three original, self-initiated browser prototypes built with AI-assisted development. All example people, transactions and prices are fictional. These are portfolio demonstrations, not completed client engagements.

- CSV cleanup: whitespace/date normalization, exact duplicates, audit log and review queue.
- Quote calculator: six inputs, integer-cent arithmetic, explicit discount rules and a text estimate.
- Report consolidation: validated master plus three CSV batches, ordered upserts and an update log.

Open `index.html` or serve this folder as static files. No packages or API keys are required. Input processing stays in the browser. CSV exports escape formula-like text; spreadsheet import settings still matter for identifiers with leading zeros. Demonstrations have deliberately limited schemas and row counts, documented in each interface.

Run the calculation and data-validation checks with `node test-portfolio.cjs`.

These examples do not send user-entered data to a server. The hosting service receives ordinary page requests. Do not use confidential business data to explore a public portfolio demo.
