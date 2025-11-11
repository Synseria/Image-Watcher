                     ┌────────────────────────────┐
                     │         Developer          │
                     └─────────────┬─────────────┘
                                   │ Push / PR
                                   ▼
                     ┌────────────────────────────┐
                     │        Branch: dev         │
                     │   (Ruleset: PR required)   │
                     │  Status checks required:   │
                     │  - Tests & Lint            │
                     │  - Build & Validate        │
                     └─────────────┬─────────────┘
                                   │ Merge PR successful
                                   ▼
                     ┌────────────────────────────┐
                     │       Branch: master       │
                     │   (Ruleset: PR required)   │
                     │  Status checks required:   │
                     │  - Tests & Lint            │
                     │  - Build & Validate        │
                     │  - Tag must be present     │
                     └─────────────┬─────────────┘
                                   │ Merge PR successful
                                   ▼
                     ┌────────────────────────────┐
                     │      Tag vX.Y.Z created    │
                     │   (Ruleset: Tag protection)│
                     │  - Restrict creation/update│
                     │  - Signed commit required  │
                     │  - Status checks optional  │
                     └─────────────┬─────────────┘
                                   │
                                   ▼
                     ┌────────────────────────────┐
                     │      Release workflow      │
                     │   (Triggered only on tag)  │
                     │  - Build Docker image      │
                     │  - Publish release         │
                     └────────────────────────────┘
