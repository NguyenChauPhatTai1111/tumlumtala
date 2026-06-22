package seeders

import (
	"fmt"
	"time"

	"gorm.io/gorm"

	"github.com/tumlumtala/messenger-service/internal/infrastructure/persistence/model"
)

type ThemeSeeder struct{}

func (s *ThemeSeeder) Name() string { return "ThemeSeeder" }

type themeDef struct {
	presetID            string
	name                string
	background          string
	backgroundColor     string
	incomingBubbleColor string
	outgoingBubbleColor string
	incomingTextColor   string
	outgoingTextColor   string
	sortOrder           int
}

var themeDefs = []themeDef{
	{
		presetID:            "polar-mist",
		name:                "Polar Mist",
		background:          "linear-gradient(150deg, #f9fcff 0%, #e7f0ff 50%, #dbe7ff 100%)",
		backgroundColor:     "linear-gradient(150deg, #f9fcff 0%, #e7f0ff 50%, #dbe7ff 100%)",
		incomingBubbleColor: "#ffffff",
		outgoingBubbleColor: "#dce9ff",
		incomingTextColor:   "#334155",
		outgoingTextColor:   "#0f172a",
		sortOrder:           1,
	},
	{
		presetID:            "ivory-cloud",
		name:                "Ivory Cloud",
		background:          "linear-gradient(145deg, #fffef8 0%, #f5f2e9 45%, #ebe6d9 100%)",
		backgroundColor:     "linear-gradient(145deg, #fffef8 0%, #f5f2e9 45%, #ebe6d9 100%)",
		incomingBubbleColor: "#fffdf8",
		outgoingBubbleColor: "#efe8da",
		incomingTextColor:   "#57534e",
		outgoingTextColor:   "#292524",
		sortOrder:           2,
	},
	{
		presetID:            "aqua-haze",
		name:                "Aqua Haze",
		background:          "linear-gradient(150deg, #f2fffe 0%, #dff8f5 50%, #cdeeea 100%)",
		backgroundColor:     "linear-gradient(150deg, #f2fffe 0%, #dff8f5 50%, #cdeeea 100%)",
		incomingBubbleColor: "#f7fffd",
		outgoingBubbleColor: "#d3f0eb",
		incomingTextColor:   "#155e63",
		outgoingTextColor:   "#134e4a",
		sortOrder:           3,
	},
	{
		presetID:            "mint-frost",
		name:                "Mint Frost",
		background:          "linear-gradient(145deg, #f4fff8 0%, #ddf3e5 55%, #c8e4d3 100%)",
		backgroundColor:     "linear-gradient(145deg, #f4fff8 0%, #ddf3e5 55%, #c8e4d3 100%)",
		incomingBubbleColor: "#f8fff9",
		outgoingBubbleColor: "#d7ebdd",
		incomingTextColor:   "#166534",
		outgoingTextColor:   "#14532d",
		sortOrder:           4,
	},
	{
		presetID:            "soft-peach",
		name:                "Soft Peach",
		background:          "linear-gradient(145deg, #fff6f1 0%, #ffe5d8 52%, #ffd8c7 100%)",
		backgroundColor:     "linear-gradient(145deg, #fff6f1 0%, #ffe5d8 52%, #ffd8c7 100%)",
		incomingBubbleColor: "#fff8f4",
		outgoingBubbleColor: "#ffe0d2",
		incomingTextColor:   "#9a3412",
		outgoingTextColor:   "#7c2d12",
		sortOrder:           5,
	},
	{
		presetID:            "sunrise-petal",
		name:                "Sunrise Petal",
		background:          "linear-gradient(145deg, #fff0f7 0%, #ffd8ea 48%, #ffc8e1 100%)",
		backgroundColor:     "linear-gradient(145deg, #fff0f7 0%, #ffd8ea 48%, #ffc8e1 100%)",
		incomingBubbleColor: "#fff4f9",
		outgoingBubbleColor: "#ffd9ea",
		incomingTextColor:   "#9d174d",
		outgoingTextColor:   "#831843",
		sortOrder:           6,
	},
	{
		presetID:            "lavender-breeze",
		name:                "Lavender Breeze",
		background:          "linear-gradient(148deg, #f5f1ff 0%, #e3d9ff 50%, #d5c8ff 100%)",
		backgroundColor:     "linear-gradient(148deg, #f5f1ff 0%, #e3d9ff 50%, #d5c8ff 100%)",
		incomingBubbleColor: "#f7f4ff",
		outgoingBubbleColor: "#e0d5ff",
		incomingTextColor:   "#5b21b6",
		outgoingTextColor:   "#4c1d95",
		sortOrder:           7,
	},
	{
		presetID:            "blue-harbor",
		name:                "Blue Harbor",
		background:          "linear-gradient(150deg, #e5f2ff 0%, #bfdcff 45%, #9cc6ff 100%)",
		backgroundColor:     "linear-gradient(150deg, #e5f2ff 0%, #bfdcff 45%, #9cc6ff 100%)",
		incomingBubbleColor: "#eef6ff",
		outgoingBubbleColor: "#c8e0ff",
		incomingTextColor:   "#1d4ed8",
		outgoingTextColor:   "#1e3a8a",
		sortOrder:           8,
	},
	{
		presetID:            "teal-current",
		name:                "Teal Current",
		background:          "linear-gradient(150deg, #ddfbff 0%, #aee9f0 50%, #86d2de 100%)",
		backgroundColor:     "linear-gradient(150deg, #ddfbff 0%, #aee9f0 50%, #86d2de 100%)",
		incomingBubbleColor: "#ebfbfd",
		outgoingBubbleColor: "#b9e8ef",
		incomingTextColor:   "#0f766e",
		outgoingTextColor:   "#115e59",
		sortOrder:           9,
	},
	{
		presetID:            "sage-valley",
		name:                "Sage Valley",
		background:          "linear-gradient(148deg, #ecf8e7 0%, #cbe5c0 50%, #adcfa3 100%)",
		backgroundColor:     "linear-gradient(148deg, #ecf8e7 0%, #cbe5c0 50%, #adcfa3 100%)",
		incomingBubbleColor: "#f3fbf0",
		outgoingBubbleColor: "#d3e8cb",
		incomingTextColor:   "#365314",
		outgoingTextColor:   "#3f6212",
		sortOrder:           10,
	},
	{
		presetID:            "amber-dusk",
		name:                "Amber Dusk",
		background:          "linear-gradient(150deg, #fff2d6 0%, #ffd79d 52%, #ffbc74 100%)",
		backgroundColor:     "linear-gradient(150deg, #fff2d6 0%, #ffd79d 52%, #ffbc74 100%)",
		incomingBubbleColor: "#fff7e6",
		outgoingBubbleColor: "#ffd8a8",
		incomingTextColor:   "#92400e",
		outgoingTextColor:   "#78350f",
		sortOrder:           11,
	},
	{
		presetID:            "terra-glow",
		name:                "Terra Glow",
		background:          "linear-gradient(148deg, #fbe5df 0%, #dba89e 50%, #be857c 100%)",
		backgroundColor:     "linear-gradient(148deg, #fbe5df 0%, #dba89e 50%, #be857c 100%)",
		incomingBubbleColor: "#fff1ed",
		outgoingBubbleColor: "#e3b3ab",
		incomingTextColor:   "#7f1d1d",
		outgoingTextColor:   "#7c2d12",
		sortOrder:           12,
	},
	{
		presetID:            "night-indigo",
		name:                "Night Indigo",
		background:          "linear-gradient(148deg, #44527f 0%, #2f3c63 50%, #232d4a 100%)",
		backgroundColor:     "linear-gradient(148deg, #44527f 0%, #2f3c63 50%, #232d4a 100%)",
		incomingBubbleColor: "#3f4f77",
		outgoingBubbleColor: "#5b6d9a",
		incomingTextColor:   "#e2e8f0",
		outgoingTextColor:   "#ffffff",
		sortOrder:           13,
	},
	{
		presetID:            "carbon-teal",
		name:                "Carbon Teal",
		background:          "linear-gradient(150deg, #31474f 0%, #20333a 52%, #16252b 100%)",
		backgroundColor:     "linear-gradient(150deg, #31474f 0%, #20333a 52%, #16252b 100%)",
		incomingBubbleColor: "#38545e",
		outgoingBubbleColor: "#4c6a75",
		incomingTextColor:   "#dbeafe",
		outgoingTextColor:   "#ffffff",
		sortOrder:           14,
	},
	{
		presetID:            "midnight-rose",
		name:                "Midnight Rose",
		background:          "linear-gradient(148deg, #4a2f3d 0%, #311f29 50%, #21141b 100%)",
		backgroundColor:     "linear-gradient(148deg, #4a2f3d 0%, #311f29 50%, #21141b 100%)",
		incomingBubbleColor: "#5a3a4a",
		outgoingBubbleColor: "#734f62",
		incomingTextColor:   "#fce7f3",
		outgoingTextColor:   "#ffffff",
		sortOrder:           15,
	},
	{
		presetID:            "obsidian",
		name:                "Obsidian",
		background:          "linear-gradient(150deg, #3a3a3a 0%, #1f1f1f 55%, #0f0f0f 100%)",
		backgroundColor:     "linear-gradient(150deg, #3a3a3a 0%, #1f1f1f 55%, #0f0f0f 100%)",
		incomingBubbleColor: "#4a4a4a",
		outgoingBubbleColor: "#606060",
		incomingTextColor:   "#f3f4f6",
		outgoingTextColor:   "#ffffff",
		sortOrder:           16,
	},
	{
		presetID:            "ocean-deep",
		name:                "Ocean Deep",
		background:          "linear-gradient(150deg, #1a3c5e 0%, #0f2440 52%, #071628 100%)",
		backgroundColor:     "linear-gradient(150deg, #1a3c5e 0%, #0f2440 52%, #071628 100%)",
		incomingBubbleColor: "#1e4570",
		outgoingBubbleColor: "#2a5d8f",
		incomingTextColor:   "#dbeafe",
		outgoingTextColor:   "#ffffff",
		sortOrder:           17,
	},
	{
		presetID:            "forest-night",
		name:                "Forest Night",
		background:          "linear-gradient(148deg, #1a3326 0%, #0f2318 52%, #071510 100%)",
		backgroundColor:     "linear-gradient(148deg, #1a3326 0%, #0f2318 52%, #071510 100%)",
		incomingBubbleColor: "#1e3d2c",
		outgoingBubbleColor: "#2a5038",
		incomingTextColor:   "#dcfce7",
		outgoingTextColor:   "#ffffff",
		sortOrder:           18,
	},
}

func (s *ThemeSeeder) Run(db *gorm.DB) error {
	if err := db.Where("1 = 1").Delete(&model.Theme{}).Error; err != nil {
		return fmt.Errorf("delete themes: %w", err)
	}

	now := time.Now()

	for _, p := range themeDefs {
		theme := model.Theme{
			PresetID:            p.presetID,
			Name:                p.name,
			Background:          p.background,
			BackgroundColor:     p.backgroundColor,
			IncomingBubbleColor: p.incomingBubbleColor,
			OutgoingBubbleColor: p.outgoingBubbleColor,
			IncomingTextColor:   p.incomingTextColor,
			OutgoingTextColor:   p.outgoingTextColor,
			Status:              "active",
			SortOrder:           p.sortOrder,
			CreatedAt:           now,
			UpdatedAt:           now,
		}
		if err := db.Create(&theme).Error; err != nil {
			return fmt.Errorf("insert theme %q: %w", p.presetID, err)
		}
	}

	fmt.Printf("[ThemeSeeder] seeded %d themes\n", len(themeDefs))
	return nil
}

