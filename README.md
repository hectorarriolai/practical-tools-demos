# Practical tools — working portfolio demos

Self-initiated browser tools and a puzzle built with AI-assisted development. All example people, transactions and prices are fictional. These are portfolio demonstrations, not completed client engagements.

- Sales report: date/channel filters, weekly trends, local CSV import and source-reconciled totals. The fictional CSV is downloadable; the reporting offer is linked directly.
- CSV cleanup: whitespace/date normalization, exact duplicates, audit log and review queue.
- Quote calculator: six inputs, integer-cent arithmetic, explicit discount rules and a text estimate.
- Report consolidation: validated master plus three CSV batches, ordered upserts and an update log.

Open `index.html` or serve this folder as static files. No packages or API keys are required. Input processing stays in the browser. CSV exports escape formula-like text; spreadsheet import settings still matter for identifiers with leading zeros. Demonstrations have deliberately limited schemas and row counts, documented in each interface.

Run the calculation and data-validation checks with `node test-portfolio.cjs` and `node test-report.cjs`.

These examples do not send user-entered data to a server. The hosting service receives ordinary page requests. Do not use confidential business data to explore a public portfolio demo.

## Relay Garden

`games/relay-garden/` contains a free playable demo with 24 campaign gardens, a daily puzzle, English/Spanish text and local saves. It was developed with generative-AI assistance. See its `NOTICE.md` for scope and usage context. The runtime is public; the separate configuration studio and source-kit documentation are not included in this repository. The source kit is available for US$19 through the linked Contra product page. The public demo and portfolio now link to that offer.
