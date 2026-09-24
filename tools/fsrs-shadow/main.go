package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"sort"
	"time"

	fsrs "github.com/open-spaced-repetition/go-fsrs/v3"
)

type Command struct {
	AdapterVersion string `json:"adapterVersion"`
	EventID string `json:"eventId"`
	CardID string `json:"cardId"`
	BlockID string `json:"blockId"`
	Rating int `json:"rating"`
	ReviewedAt int64 `json:"reviewedAt"`
	MasteryEligible bool `json:"masteryEligible"`
}

type Input struct {
	SchemaVersion string `json:"schemaVersion"`
	CommandCount int `json:"commandCount"`
	Commands []Command `json:"commands"`
}

type Step struct {
	EventID string `json:"eventId"`
	CardID string `json:"cardId"`
	Rating int `json:"rating"`
	ReviewedAt time.Time `json:"reviewedAt"`
	DueAfter time.Time `json:"dueAfter"`
	StateAfter fsrs.State `json:"stateAfter"`
}

type CardReceipt struct {
	CardID string `json:"cardId"`
	Due time.Time `json:"due"`
	Stability float64 `json:"stability"`
	Difficulty float64 `json:"difficulty"`
	ElapsedDays uint64 `json:"elapsedDays"`
	ScheduledDays uint64 `json:"scheduledDays"`
	Reps uint64 `json:"reps"`
	Lapses uint64 `json:"lapses"`
	State fsrs.State `json:"state"`
	LastReview time.Time `json:"lastReview"`
	Retrievability float64 `json:"retrievability"`
	DueAtEvaluation bool `json:"dueAtEvaluation"`
}

type Receipt struct {
	SchemaVersion string `json:"schemaVersion"`
	Engine string `json:"engine"`
	EngineVersion string `json:"engineVersion"`
	CommandCount int `json:"commandCount"`
	CardCount int `json:"cardCount"`
	EvaluationAt time.Time `json:"evaluationAt"`
	Cards []CardReceipt `json:"cards"`
	Steps []Step `json:"steps"`
	PayloadSHA256 string `json:"payloadSha256"`
}

func main() {
	inputPath := flag.String("input", "", "Riff review command JSON")
	outputPath := flag.String("out", "", "receipt JSON")
	evaluationOffsetHours := flag.Int("evaluation-offset-hours", 24, "hours after last review to evaluate due state")
	flag.Parse()

	if *inputPath == "" || *outputPath == "" {
		fmt.Fprintln(os.Stderr, "-input and -out are required")
		os.Exit(2)
	}

	raw, err := os.ReadFile(*inputPath)
	if err != nil { panic(err) }
	var input Input
	if err := json.Unmarshal(raw, &input); err != nil { panic(err) }

	sort.SliceStable(input.Commands, func(i, j int) bool {
		if input.Commands[i].ReviewedAt == input.Commands[j].ReviewedAt {
			if input.Commands[i].CardID == input.Commands[j].CardID {
				return input.Commands[i].EventID < input.Commands[j].EventID
			}
			return input.Commands[i].CardID < input.Commands[j].CardID
		}
		return input.Commands[i].ReviewedAt < input.Commands[j].ReviewedAt
	})

	params := fsrs.DefaultParam()
	params.EnableFuzz = false
	scheduler := fsrs.NewFSRS(params)
	cards := map[string]fsrs.Card{}
	steps := make([]Step, 0, len(input.Commands))
	var lastReview time.Time

	for _, command := range input.Commands {
		if command.Rating < int(fsrs.Again) || command.Rating > int(fsrs.Easy) {
			panic(fmt.Sprintf("invalid rating %d for %s", command.Rating, command.EventID))
		}
		card, ok := cards[command.CardID]
		if !ok { card = fsrs.NewCard() }
		reviewedAt := time.UnixMilli(command.ReviewedAt).UTC()
		info := scheduler.Next(card, reviewedAt, fsrs.Rating(command.Rating))
		cards[command.CardID] = info.Card
		steps = append(steps, Step{EventID:command.EventID, CardID:command.CardID, Rating:command.Rating, ReviewedAt:reviewedAt, DueAfter:info.Card.Due.UTC(), StateAfter:info.Card.State})
		if reviewedAt.After(lastReview) { lastReview = reviewedAt }
	}

	evaluationAt := lastReview.Add(time.Duration(*evaluationOffsetHours) * time.Hour)
	cardIDs := make([]string, 0, len(cards))
	for cardID := range cards { cardIDs = append(cardIDs, cardID) }
	sort.Strings(cardIDs)

	cardReceipts := make([]CardReceipt, 0, len(cardIDs))
	for _, cardID := range cardIDs {
		card := cards[cardID]
		cardReceipts = append(cardReceipts, CardReceipt{
			CardID:cardID, Due:card.Due.UTC(), Stability:card.Stability, Difficulty:card.Difficulty,
			ElapsedDays:card.ElapsedDays, ScheduledDays:card.ScheduledDays, Reps:card.Reps, Lapses:card.Lapses,
			State:card.State, LastReview:card.LastReview.UTC(), Retrievability:scheduler.GetRetrievability(card,evaluationAt),
			DueAtEvaluation:!card.Due.After(evaluationAt),
		})
	}

	receipt := Receipt{SchemaVersion:"starblox-fsrs-engine-receipt-v1", Engine:"open-spaced-repetition/go-fsrs", EngineVersion:"v3.3.1", CommandCount:len(input.Commands), CardCount:len(cards), EvaluationAt:evaluationAt, Cards:cardReceipts, Steps:steps}
	payload, err := json.Marshal(receipt)
	if err != nil { panic(err) }
	sum := sha256.Sum256(payload)
	receipt.PayloadSHA256 = hex.EncodeToString(sum[:])
	finalPayload, err := json.MarshalIndent(receipt, "", "  ")
	if err != nil { panic(err) }
	finalPayload = append(finalPayload, '\n')
	if err := os.WriteFile(*outputPath, finalPayload, 0o644); err != nil { panic(err) }

	fmt.Printf("{\n  \"engine\": %q,\n  \"version\": %q,\n  \"commands\": %d,\n  \"cards\": %d,\n  \"evaluationAt\": %q,\n  \"payloadSha256\": %q\n}\n", receipt.Engine, receipt.EngineVersion, receipt.CommandCount, receipt.CardCount, receipt.EvaluationAt.Format(time.RFC3339), receipt.PayloadSHA256)
}
