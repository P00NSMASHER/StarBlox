--!strict

local StoreCatalog = table.freeze({
	SchemaVersion = 1,
	CatalogRevision = "phase9-long-horizon-learning-economy-v1",
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
		table.freeze({Tier = 1, Name = "Tiny Starter Studio", Price = 0}),
		table.freeze({Tier = 2, Name = "Cozy Loft", Price = 1000}),
		table.freeze({Tier = 3, Name = "Creator Bedroom", Price = 3500}),
		table.freeze({Tier = 4, Name = "Skyline Penthouse", Price = 9000}),
		table.freeze({Tier = 5, Name = "Star Mansion", Price = 24000}),
	}),
	Styles = table.freeze({
		table.freeze({Id = "home-starter", Name = "Starter Home", RequiredTier = 1, Price = 0, Kind = "starter"}),
		table.freeze({Id = "home-suburban", Name = "Suburban Home", RequiredTier = 2, Price = 1500, Kind = "suburban"}),
		table.freeze({Id = "home-modern", Name = "Modern Glass Home", RequiredTier = 2, Price = 2500, Kind = "modern"}),
		table.freeze({Id = "home-ranch", Name = "Ranch House", RequiredTier = 3, Price = 5000, Kind = "ranch"}),
		table.freeze({Id = "home-townhouse", Name = "Townhouse", RequiredTier = 3, Price = 6500, Kind = "townhouse"}),
		table.freeze({Id = "home-lakehouse", Name = "Lake House", RequiredTier = 4, Price = 10000, Kind = "lakehouse"}),
		table.freeze({Id = "home-villa", Name = "Modern Villa", RequiredTier = 4, Price = 14000, Kind = "villa"}),
		table.freeze({Id = "home-mansion", Name = "Star Mansion", RequiredTier = 5, Price = 30000, Kind = "mansion"}),
	}),
})

return StoreCatalog
