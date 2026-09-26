# Private STAR checkpoint input

Step 7 is intentionally dormant until a real external assessment result is available.

Store the result as the GitHub Actions repository secret:

`STARBLOX_STAR_CHECKPOINT_JSON`

Do **not** commit a child's result to the repository.

Expected JSON shape:

```json
{
  "assessmentName": "STAR",
  "assessmentDate": "YYYY-MM-DD",
  "metric": "relative-domain-score",
  "scores": [
    {"dimension": "Reading / ELA", "value": 0},
    {"dimension": "Math", "value": 0}
  ]
}
```

The `dimension` names must match a StarBlox subject or domain in the current question bank. The `value` numbers are used only to compare **relative ordering** across matched dimensions. StarBlox does not predict a STAR score, convert internal accuracy into a STAR score, or treat unlike scales as equivalent.

The nightly learning-evidence workflow:

1. waits until internal evidence reaches the Step 7 gate;
2. checks whether this secret exists;
3. hashes the private payload;
4. compares only matched-domain rank ordering;
5. emits a sanitized checkpoint summary with no raw external scores;
6. does not automatically change the learning policy.
