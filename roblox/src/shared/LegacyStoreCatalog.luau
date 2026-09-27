--!strict

-- Generated from the pinned legacy Brookhaven house selector.
local LegacyStoreCatalog = table.freeze({
	SchemaVersion = 1,
	CatalogRevision = "legacy-source-house-catalog-v1",
	Items = table.freeze({
		table.freeze({Id = "beds-1", Name = "Starter Bed", Category = "Furniture", Kind = "bed", Price = 180}),
		table.freeze({Id = "seating-1", Name = "Floor Cushion", Category = "Furniture", Kind = "chair", Price = 140}),
		table.freeze({Id = "desks-1", Name = "Tiny Homework Desk", Category = "Furniture", Kind = "desk", Price = 220}),
		table.freeze({Id = "lighting-1", Name = "Starter Lamp", Category = "Furniture", Kind = "lamp", Price = 160}),
		table.freeze({Id = "wall-1", Name = "School Star Poster", Category = "Decor", Kind = "poster", Price = 120}),
		table.freeze({Id = "rugs-1", Name = "Starter Mat", Category = "Decor", Kind = "rug", Price = 180}),
		table.freeze({Id = "decor-1", Name = "Book Crate", Category = "Decor", Kind = "books", Price = 200}),
	}),
	Homes = table.freeze({
		table.freeze({Tier = 1, Name = "Starter Home", Price = 0}),
		table.freeze({Tier = 2, Name = "Neighborhood Home", Price = 2500}),
		table.freeze({Tier = 3, Name = "Expanded Home", Price = 6500}),
		table.freeze({Tier = 4, Name = "Premium Home", Price = 14000}),
		table.freeze({Tier = 5, Name = "Legacy Mansion", Price = 30000}),
	}),
	Styles = table.freeze({
		table.freeze({Id = "home-starter", Name = "Brookhaven House 1", RequiredTier = 1, Price = 0, Kind = "starter", SourceButton = "001_House"}),
		table.freeze({Id = "legacy-house-002", Name = "Brookhaven House 2", RequiredTier = 1, Price = 1800, Kind = "suburban", SourceButton = "002_House"}),
		table.freeze({Id = "legacy-house-003", Name = "Brookhaven House 3", RequiredTier = 1, Price = 2700, Kind = "modern", SourceButton = "003_House"}),
		table.freeze({Id = "legacy-house-004", Name = "Brookhaven House 4", RequiredTier = 2, Price = 3600, Kind = "ranch", SourceButton = "004_House"}),
		table.freeze({Id = "legacy-house-005", Name = "Brookhaven House 5", RequiredTier = 2, Price = 4500, Kind = "townhouse", SourceButton = "005_House"}),
		table.freeze({Id = "legacy-house-006", Name = "Brookhaven House 6", RequiredTier = 2, Price = 5400, Kind = "lakehouse", SourceButton = "006_House"}),
		table.freeze({Id = "legacy-house-007", Name = "Brookhaven House 7", RequiredTier = 3, Price = 6300, Kind = "villa", SourceButton = "007_House"}),
		table.freeze({Id = "legacy-house-008", Name = "Brookhaven House 8", RequiredTier = 3, Price = 7200, Kind = "mansion", SourceButton = "008_House"}),
		table.freeze({Id = "legacy-house-009", Name = "Brookhaven House 9", RequiredTier = 3, Price = 8100, Kind = "starter", SourceButton = "009_House"}),
		table.freeze({Id = "legacy-house-010", Name = "Brookhaven House 10", RequiredTier = 4, Price = 9000, Kind = "suburban", SourceButton = "010_House"}),
		table.freeze({Id = "legacy-house-011", Name = "Brookhaven House 11", RequiredTier = 4, Price = 9900, Kind = "modern", SourceButton = "011_House"}),
		table.freeze({Id = "legacy-house-012", Name = "Brookhaven House 12", RequiredTier = 4, Price = 10800, Kind = "ranch", SourceButton = "012_House"}),
	}),
})
return LegacyStoreCatalog
