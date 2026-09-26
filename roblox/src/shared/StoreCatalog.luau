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
})

return StoreCatalog
