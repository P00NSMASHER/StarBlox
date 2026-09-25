# Human Playtest Evidence Mode

StarBlox now has an opt-in local playtest evidence harness intended to close the portfolio's
`playtest_evidence_signal` gap with real human evidence rather than repository activity.

## Use

Open the app with:

`?playtest=1`

The panel is hidden during normal play.

A tester or supervising adult must explicitly confirm consent before a run begins. The harness:

- stores no name, email, phone, address, device identifier, account identifier or free-text note;
- performs no background upload;
- records only anonymous session timing, screen transitions, aggregate save-state deltas and
  closed-form feedback;
- creates a tamper-evident JSON receipt for local download;
- marks internal/developer tests as **not external evidence**;
- leaves neutral feedback unclassified;
- never claims retention from a single session.

A downloaded receipt is only a candidate evidence artifact. It still requires independent review
before it can enter the AI Business OS external-outcome ledger.

## Allocation rule

The Business Brain requires at least five independently verified real playtest outcomes before
`playtest_evidence_signal` becomes allocation-grade. CI, screenshots, simulated input and developer
testing do not satisfy that threshold.
