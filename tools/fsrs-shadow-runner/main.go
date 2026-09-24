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

type ReviewCommand struct {
	EventID         string `json:"eventId"`
	CardID          string `json:"cardId"`
	BlockID         string `json:"blockId"`
	Rating          int8   `json:"rating"`
	ReviewedAt      int64  `json:"reviewedAt"`
	MasteryEligible bool   `json:"masteryEligible"`
}

type ReviewInput struct {
	SchemaVersion string          `json:"schemaVersion"`
	CommandCount  int             `json:"commandCount"`
	Commands      []ReviewCommand `json:"commands"`
}

type AppliedReview struct {
	EventID       string  `json:"eventId"`
	CardID        string  `json:"cardId"`
	Rating        int8    `json:"rating"`
	ReviewedAt    int64   `json:"reviewedAt"`
	ScheduledDays uint64  `json:"scheduledDays"`
	ElapsedDays   uint64  `json:"elapsedDays"`
	State         int8    `json:"state"`
	DueAt         int64   `json:"dueAt"`
	Stability     float64 `json:"stability"`
	Difficulty    float64 `json:"difficulty"`
}

type CardState struct {
	CardID          string  `json:"cardId"`
	DueAt           int64   `json:"dueAt"`
	LastReviewAt    int64   `json:"lastReviewAt"`
	ScheduledDays   uint64  `json:"scheduledDays"`
	ElapsedDays     uint64  `json:"elapsedDays"`
	Reps            uint64  `json:"reps"`
	Lapses          uint64  `json:"lapses"`
	State           int8    `json:"state"`
	Stability       float64 `json:"stability"`
	Difficulty      float64 `json:"difficulty"`
	Retrievability  float64 `json:"retrievability"`
	DueAtEvaluation bool    `json:"dueAtEvaluation"`
}

type Receipt struct {
	SchemaVersion    string          `json:"schemaVersion"`
	Engine           string          `json:"engine"`
	EngineVersion    string          `json:"engineVersion"`
	RequestRetention float64         `json:"requestRetention"`
	MaximumInterval  float64         `json:"maximumInterval"`
	EnableFuzz       bool            `json:"enableFuzz"`
	CommandCount     int             `json:"commandCount"`
	CardCount        int             `json:"cardCount"`
	EvaluationAt     int64           `json:"evaluationAt"`
	AppliedReviews   []AppliedReview `json:"appliedReviews"`
	Cards            []CardState     `json:"cards"`
	SHA256           string          `json:"sha256"`
}

func mustRead(path string) []byte {
	data, err := os.ReadFile(path)
	if err != nil {
		panic(err)
	}
	return data
}

func main() {
	inputPath := flag.String("input", "", "Riff review-command JSON")
	outputPath := flag.String("out", "", "output receipt JSON")
	evalAt := flag.Int64("eval-at", 0, "evaluation time in Unix milliseconds; defaults to 24h after final review")
	flag.Parse()

	if *inputPath == "" {
		panic("-input is required")
	}

	var input ReviewInput
	if err := json.Unmarshal(mustRead(*inputPath), &input); err != nil {
		panic(err)
	}

	commands := append([]ReviewCommand(nil), input.Commands...)
	sort.SliceStable(commands, func(i, j int) bool {
		if commands[i].ReviewedAt != commands[j].ReviewedAt {
			return commands[i].ReviewedAt < commands[j].ReviewedAt
		}
		if commands[i].EventID != commands[j].EventID {
			return commands[i].EventID < commands[j].EventID
		}
		return commands[i].CardID < commands[j].CardID
	})

	params := fsrs.DefaultParam()
	params.EnableFuzz = false
	scheduler := fsrs.NewFSRS(params)

	cards := map[string]fsrs.Card{}
	applied := make([]AppliedReview, 0, len(commands))
	var maxReviewedAt int64

	for _, cmd := range commands {
		if cmd.Rating < int8(fsrs.Again) || cmd.Rating > int8(fsrs.Easy) {
			panic(fmt.Sprintf("invalid rating %d for event %s", cmd.Rating, cmd.EventID))
		}
		now := time.UnixMilli(cmd.ReviewedAt).UTC()
		card, ok := cards[cmd.CardID]
		if !ok {
			card = fsrs.NewCard()
		}
		info := scheduler.Next(card, now, fsrs.Rating(cmd.Rating))
		card = info.Card
		cards[cmd.CardID] = card
		if cmd.ReviewedAt > maxReviewedAt {
			maxReviewedAt = cmd.ReviewedAt
		}
		applied = append(applied, AppliedReview{
			EventID:       cmd.EventID,
			CardID:        cmd.CardID,
			Rating:        cmd.Rating,
			ReviewedAt:    cmd.ReviewedAt,
			ScheduledDays: info.ReviewLog.ScheduledDays,
			ElapsedDays:   info.ReviewLog.ElapsedDays,
			State:         int8(info.ReviewLog.State),
			DueAt:         card.Due.UnixMilli(),
			Stability:     card.Stability,
			Difficulty:    card.Difficulty,
		})
	}

	evaluationAt := *evalAt
	if evaluationAt == 0 {
		evaluationAt = maxReviewedAt + int64((24 * time.Hour) / time.Millisecond)
	}
	evalTime := time.UnixMilli(evaluationAt).UTC()

	cardIDs := make([]string, 0, len(cards))
	for cardID := range cards {
		cardIDs = append(cardIDs, cardID)
	}
	sort.Strings(cardIDs)

	states := make([]CardState, 0, len(cardIDs))
	for _, cardID := range cardIDs {
		card := cards[cardID]
		retrievability := scheduler.GetRetrievability(card, evalTime)
		states = append(states, CardState{
			CardID:          cardID,
			DueAt:           card.Due.UnixMilli(),
			LastReviewAt:    card.LastReview.UnixMilli(),
			ScheduledDays:   card.ScheduledDays,
			ElapsedDays:     card.ElapsedDays,
			Reps:            card.Reps,
			Lapses:          card.Lapses,
			State:           int8(card.State),
			Stability:       card.Stability,
			Difficulty:      card.Difficulty,
			Retrievability:  retrievability,
			DueAtEvaluation: !card.Due.After(evalTime),
		})
	}

	receipt := Receipt{
		SchemaVersion:    "starblox-fsrs-engine-receipt-v1",
		Engine:           "github.com/open-spaced-repetition/go-fsrs/v3",
		EngineVersion:    "v3.3.1",
		RequestRetention: params.RequestRetention,
		MaximumInterval:  params.MaximumInterval,
		EnableFuzz:       params.EnableFuzz,
		CommandCount:     len(commands),
		CardCount:        len(states),
		EvaluationAt:     evaluationAt,
		AppliedReviews:   applied,
		Cards:            states,
	}

	unsigned, err := json.Marshal(receipt)
	if err != nil {
		panic(err)
	}
	sum := sha256.Sum256(unsigned)
	receipt.SHA256 = hex.EncodeToString(sum[:])

	output, err := json.MarshalIndent(receipt, "", "  ")
	if err != nil {
		panic(err)
	}
	output = append(output, '\n')

	if *outputPath != "" {
		if err := os.WriteFile(*outputPath, output, 0644); err != nil {
			panic(err)
		}
	}
	os.Stdout.Write(output)
}
