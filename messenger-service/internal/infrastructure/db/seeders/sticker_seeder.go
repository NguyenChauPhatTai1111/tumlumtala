package seeders

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/tumlumtala/messenger-service/internal/infrastructure/persistence/model"
	"github.com/tumlumtala/messenger-service/pkg/bunnycdn"
)

type StickerSeeder struct{}

func (s *StickerSeeder) Name() string { return "StickerSeeder" }

type stickerPackDef struct {
	name        string
	description string
	folder      string
	stickers    []stickerDef
}

type stickerDef struct {
	name      string
	file      string
	sortOrder int
}

var packDefs = []stickerPackDef{
	{
		name: "Happy Faces", description: "Khuôn mặt vui vẻ, hạnh phúc", folder: "happy_faces",
		stickers: []stickerDef{
			{"Grinning", "grinning", 1}, {"Smiley", "smiley", 2}, {"Smile", "smile", 3},
			{"Beaming", "beaming", 4}, {"Grin Sweat", "grin_sweat", 5}, {"ROFL", "rofl", 6},
			{"Joy", "joy", 7}, {"Slightly Smiling", "slightly_smiling", 8}, {"Wink", "wink", 9}, {"Blush", "blush", 10},
		},
	},
	{
		name: "Love & Affection", description: "Tình yêu và cảm xúc yêu thương", folder: "love_affection",
		stickers: []stickerDef{
			{"Heart Eyes", "heart_eyes", 1}, {"Star Struck", "star_struck", 2}, {"Face Blowing Kiss", "face_blowing_kiss", 3},
			{"Kissing", "kissing", 4}, {"Kissing Closed Eyes", "kissing_closed_eyes", 5}, {"Kissing Smiling Eyes", "kissing_smiling_eyes", 6},
			{"Money Mouth", "money_mouth", 7}, {"Hugging", "hugging", 8}, {"Red Heart", "red_heart", 9}, {"Beating Heart", "beating_heart", 10},
		},
	},
	{
		name: "Silly & Playful", description: "Biểu cảm nghịch ngợm và vui tươi", folder: "silly_playful",
		stickers: []stickerDef{
			{"Tongue", "tongue", 1}, {"Wink Tongue", "wink_tongue", 2}, {"Zany", "zany", 3},
			{"Squinting Tongue", "squinting_tongue", 4}, {"Yum", "yum", 5}, {"Upside Down", "upside_down", 6},
			{"Shushing", "shushing", 7}, {"Shushing Finger", "shushing_finger", 8}, {"Thinking", "thinking", 9}, {"Zipper Mouth", "zipper_mouth", 10},
		},
	},
	{
		name: "Sad & Crying", description: "Biểu cảm buồn và khóc", folder: "sad_crying",
		stickers: []stickerDef{
			{"Cry", "cry", 1}, {"Sad Relieved", "sad_relieved", 2}, {"Sob", "sob", 3},
			{"Hushed", "hushed", 4}, {"Fearful", "fearful", 5}, {"Weary", "weary", 6},
			{"Dizzy Face", "dizzy_face", 7}, {"Sick", "sick", 8}, {"Bandage", "bandage", 9}, {"Neutral", "neutral", 10},
		},
	},
	{
		name: "Angry & Frustrated", description: "Biểu cảm tức giận và bực bội", folder: "angry_frustrated",
		stickers: []stickerDef{
			{"Triumph", "triumph", 1}, {"Angry", "angry", 2}, {"Rage", "rage", 3},
			{"Cursing", "cursing", 4}, {"Eye Roll", "eye_roll", 5}, {"Confused", "confused", 6},
			{"No Mouth", "no_mouth", 7}, {"Sleepy", "sleepy", 8}, {"Expressionless", "expressionless", 9}, {"Frowning", "frowning", 10},
		},
	},
	{
		name: "Hearts & Symbols", description: "Trái tim và ký hiệu tình cảm", folder: "hearts_symbols",
		stickers: []stickerDef{
			{"Orange Heart", "orange_heart", 1}, {"Yellow Heart", "yellow_heart", 2}, {"Green Heart", "green_heart", 3},
			{"Blue Heart", "blue_heart", 4}, {"Purple Heart", "purple_heart", 5}, {"Broken Heart", "broken_heart", 6},
			{"Two Hearts", "two_hearts", 7}, {"Sparkling Heart", "sparkling_heart", 8}, {"Growing Heart", "growing_heart", 9}, {"Heart Arrow", "heart_arrow", 10},
		},
	},
	{
		name: "Cute Animals", description: "Các con vật dễ thương", folder: "cute_animals",
		stickers: []stickerDef{
			{"Cat", "cat", 1}, {"Bear", "bear", 2}, {"Panda", "panda", 3},
			{"Lion", "lion", 4}, {"Frog", "frog", 5}, {"Fox", "fox", 6},
			{"Unicorn", "unicorn", 7}, {"Snake", "snake", 8}, {"Turtle", "turtle", 9}, {"Bird", "bird", 10},
		},
	},
	{
		name: "Party & Celebration", description: "Tiệc tùng và lễ kỷ niệm", folder: "party_celebration",
		stickers: []stickerDef{
			{"Party Popper", "party_popper", 1}, {"Confetti Ball", "confetti_ball", 2}, {"Balloon", "balloon", 3},
			{"Gift", "gift", 4}, {"Trophy", "trophy", 5}, {"Gold Medal", "gold_medal", 6},
			{"Birthday Cake", "birthday_cake", 7}, {"Pizza", "pizza", 8}, {"Hamburger", "hamburger", 9}, {"Soft Ice Cream", "soft_ice_cream", 10},
		},
	},
	{
		name: "Nature & Plants", description: "Thiên nhiên và cây cối", folder: "nature_plants",
		stickers: []stickerDef{
			{"Seedling", "seedling", 1}, {"Four Leaf Clover", "four_leaf_clover", 2}, {"Maple Leaf", "maple_leaf", 3},
			{"Mushroom", "mushroom", 4}, {"Tulip", "tulip", 5}, {"Cherry Blossom", "cherry_blossom", 6},
			{"Doughnut", "doughnut", 7}, {"Cookie", "cookie", 8}, {"Ice Cream", "ice_cream", 9}, {"Strawberry", "strawberry", 10},
		},
	},
	{
		name: "Misc & Fun", description: "Sticker vui nhộn tổng hợp", folder: "misc_fun",
		stickers: []stickerDef{
			{"Relieved", "relieved", 1}, {"Nerd", "nerd", 2}, {"Disguised", "disguised", 3},
			{"Monocle", "monocle", 4}, {"Dizzy", "dizzy", 5}, {"Exploding Head", "exploding_head", 6},
			{"Skull", "skull", 7}, {"Ghost", "ghost", 8}, {"Hundred", "hundred", 9}, {"Kiss Mark", "kiss_mark", 10},
		},
	},
	{
		name: "Special Faces", description: "Biểu cảm đặc biệt và độc đáo", folder: "special_faces",
		stickers: []stickerDef{
			{"Angel", "angel", 1}, {"Cowboy", "cowboy", 2}, {"Partying", "partying", 3},
			{"Woozy", "woozy", 4}, {"Hot Face", "hot_face", 5}, {"Cold Face", "cold_face", 6},
			{"Crying Cat", "crying_cat", 7}, {"Pleading", "pleading", 8}, {"Smiling Hearts", "smiling_hearts", 9}, {"Yawning", "yawning", 10},
		},
	},
	{
		name: "Fantasy & Creatures", description: "Sinh vật huyền bí và fantasy", folder: "fantasy_creatures",
		stickers: []stickerDef{
			{"Alien", "alien", 1}, {"Alien Monster", "alien_monster", 2}, {"Imp", "imp", 3},
			{"Skull", "skull", 4}, {"Poop", "poop", 5}, {"Smiling Devil", "smiling_devil", 6},
			{"Ghost", "ghost", 7}, {"Jack O Lantern", "jack_o_lantern", 8}, {"Brain", "brain", 9}, {"Disguised Face", "disguised_face", 10},
		},
	},
	{
		name: "Hands & Gestures", description: "Cử chỉ tay và ngôn ngữ cơ thể", folder: "hands_gestures",
		stickers: []stickerDef{
			{"Sign Of Horns", "sign_of_horns", 1}, {"Call Me", "call_me", 2}, {"Raised Back Hand", "raised_back_hand", 3},
			{"Left Fist", "left_fist", 4}, {"Right Fist", "right_fist", 5}, {"Handshake", "handshake", 6},
			{"Crossed Fingers", "crossed_fingers", 7}, {"Love You", "love_you", 8}, {"Palms Up", "palms_up", 9}, {"Selfie", "selfie", 10},
		},
	},
	{
		name: "Weather & Nature", description: "Thời tiết và thiên nhiên", folder: "weather_nature",
		stickers: []stickerDef{
			{"Lightning", "lightning", 1}, {"Star", "star", 2}, {"Glowing Star", "glowing_star", 3},
			{"Rainbow", "rainbow", 4}, {"Cloud Rain", "cloud_rain", 5}, {"Snowman", "snowman", 6},
			{"Fire", "fire", 7}, {"Collision", "collision", 8}, {"Dizzy", "dizzy", 9}, {"White Heart", "white_heart", 10},
		},
	},
	{
		name: "Sports & Music", description: "Thể thao và âm nhạc", folder: "sports_activities",
		stickers: []stickerDef{
			{"Guitar", "guitar", 1}, {"Trumpet", "trumpet", 2}, {"Violin", "violin", 3},
			{"Tennis", "tennis", 4}, {"Skis", "skis", 5}, {"Basketball", "basketball", 6},
			{"Finish Flag", "finish_flag", 7}, {"Rugby", "rugby", 8}, {"Silver Medal", "silver_medal", 9}, {"Bronze Medal", "bronze_medal", 10},
		},
	},
	{
		name: "Fresh Food", description: "Rau củ quả và thức ăn lành mạnh", folder: "food_snacks",
		stickers: []stickerDef{
			{"Avocado", "avocado", 1}, {"Cucumber", "cucumber", 2}, {"Bacon", "bacon", 3},
			{"Potato", "potato", 4}, {"Carrot", "carrot", 5}, {"Green Salad", "green_salad", 6},
			{"Kiwi", "kiwi", 7}, {"Pancakes", "pancakes", 8}, {"Broccoli", "broccoli", 9}, {"Leafy Green", "leafy_green", 10},
		},
	},
	{
		name: "Sweet Treats", description: "Đồ ngọt và tráng miệng", folder: "food_sweets",
		stickers: []stickerDef{
			{"Pie", "pie", 1}, {"Pretzel", "pretzel", 2}, {"Mango", "mango", 3},
			{"Softball", "softball", 4}, {"Flying Disc", "flying_disc", 5}, {"Chopsticks", "chopsticks", 6},
			{"Smiling Tear", "smiling_tear", 7}, {"Face Monocle", "face_monocle", 8}, {"Baby Angel", "baby_angel", 9}, {"Smirking Devil", "smirking_devil", 10},
		},
	},
	{
		name: "Objects & Things", description: "Đồ vật và biểu tượng thường dùng", folder: "objects_misc",
		stickers: []stickerDef{
			{"Speech Bubble", "speech_bubble", 1}, {"Hundred Points", "hundred_points", 2}, {"Pinching", "pinching", 3},
			{"Pinched Fingers", "pinched_fingers", 4}, {"Socks", "socks", 5}, {"Wilted Flower", "wilted_flower", 6},
			{"Drum", "drum", 7}, {"Clinking Glasses", "clinking_glasses", 8}, {"Martial Arts", "martial_arts", 9}, {"Lacrosse", "lacrosse", 10},
		},
	},
}

func (s *StickerSeeder) Run(db *gorm.DB) error {
	ctx := context.Background()
	skipUpload := os.Getenv("SKIP_CDN_UPLOAD") == "true"

	var client *bunnycdn.Client
	if !skipUpload {
		var err error
		client, err = bunnycdn.NewClientFromEnv()
		if err != nil {
			return fmt.Errorf("bunnycdn init: %w", err)
		}
	}

	// Resolve assets dir outside the block so it's available below
	assetsDir := os.Getenv("STICKER_ASSETS_DIR")
	if assetsDir == "" {
		cwd, _ := os.Getwd()
		assetsDir = filepath.Join(cwd, "..", "..", "backend", "seed-assets", "stickers")
	}

	now := time.Now()

	// Drop existing stickers so re-seeding is idempotent
	if err := db.Where("1 = 1").Delete(&model.Sticker{}).Error; err != nil {
		return fmt.Errorf("delete stickers: %w", err)
	}
	if err := db.Where("1 = 1").Delete(&model.StickerPack{}).Error; err != nil {
		return fmt.Errorf("delete sticker_packs: %w", err)
	}

	resolveURL := func(folder, file string) (string, error) {
		if skipUpload {
			return fmt.Sprintf("local://%s/%s", folder, file), nil
		}
		return uploadStickerFile(ctx, client, assetsDir, folder, file)
	}

	for _, pd := range packDefs {
		thumbURL, err := resolveURL(pd.folder, "thumbnail")
		if err != nil {
			fmt.Printf("  ⚠  thumbnail upload failed for %s: %v — skipping pack\n", pd.name, err)
			continue
		}

		desc := pd.description
		pack := model.StickerPack{
			Name:         pd.name,
			Description:  &desc,
			ThumbnailURL: &thumbURL,
			IsActive:     true,
			CreatedAt:    now,
			UpdatedAt:    now,
		}
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "name"}},
			DoUpdates: clause.AssignmentColumns([]string{"thumbnail_url", "is_active", "updated_at"}),
		}).Create(&pack).Error; err != nil {
			return fmt.Errorf("insert pack %q: %w", pd.name, err)
		}

		for _, sd := range pd.stickers {
			imageURL, err := resolveURL(pd.folder, sd.file)
			if err != nil {
				fmt.Printf("  ⚠  upload failed %s/%s: %v — skipping\n", pd.folder, sd.file, err)
				continue
			}

			sticker := model.Sticker{
				PackID:    pack.ID,
				Name:      sd.name,
				ImageURL:  imageURL,
				SortOrder: sd.sortOrder,
				IsActive:  true,
				CreatedAt: now,
				UpdatedAt: now,
			}
			if err := db.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "pack_id"}, {Name: "name"}},
				DoUpdates: clause.AssignmentColumns([]string{"image_url", "sort_order", "updated_at"}),
			}).Create(&sticker).Error; err != nil {
				return fmt.Errorf("insert sticker %q: %w", sd.name, err)
			}
		}

		if skipUpload {
			fmt.Printf("  ✓  pack %-30s seeded (no upload)\n", pd.name)
		} else {
			fmt.Printf("  ✓  pack %-30s uploaded\n", pd.name)
		}
	}

	fmt.Printf("[StickerSeeder] seeded %d sticker packs\n", len(packDefs))
	return nil
}

// uploadStickerFile finds a file by base name (any extension) in dir/folder/, uploads to CDN, returns public URL.
func uploadStickerFile(ctx context.Context, client *bunnycdn.Client, assetsDir, folder, baseName string) (string, error) {
	dir := filepath.Join(assetsDir, folder)
	entries, err := os.ReadDir(dir)
	if err != nil {
		return "", fmt.Errorf("read dir %s: %w", dir, err)
	}

	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		nameNoExt := strings.TrimSuffix(e.Name(), filepath.Ext(e.Name()))
		if nameNoExt != baseName {
			continue
		}

		localPath := filepath.Join(dir, e.Name())
		raw, err := os.ReadFile(localPath)
		if err != nil {
			return "", fmt.Errorf("read %s: %w", localPath, err)
		}

		mimeType := http.DetectContentType(raw)
		remotePath := fmt.Sprintf("stickers/%s/%s", folder, e.Name())
		url, err := client.Upload(ctx, remotePath, raw, mimeType)
		if err != nil {
			return "", fmt.Errorf("upload %s: %w", remotePath, err)
		}
		return url, nil
	}

	return "", fmt.Errorf("file not found: %s/%s.*", folder, baseName)
}

