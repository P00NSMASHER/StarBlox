--!strict

local StoreCatalog = table.freeze({
	SchemaVersion = 1,
	CatalogRevision = "phase7-starter-home-store-v1",
	Items = table.freeze({
		table.freeze({Id = "beds-1", Name = "Starter Bed", Category = "Furniture", Kind = "bed", Price = 44}),
		table.freeze({Id = "seating-1", Name = "Floor Cushion", Category = "Furniture", Kind = "chair", Price = 44}),
		table.freeze({Id = "desks-1", Name = "Tiny Homework Desk", Category = "Furniture", Kind = "desk", Price = 44}),
		table.freeze({Id = "lighting-1", Name = "Starter Lamp", Category = "Furniture", Kind = "lamp", Price = 44}),
		table.freeze({Id = "wall-1", Name = "School Star Poster", Category = "Decor", Kind = "poster", Price = 44}),
		table.freeze({Id = "rugs-1", Name = "Starter Mat", Category = "Decor", Kind = "rug", Price = 44}),
		table.freeze({Id = "decor-1", Name = "Book Crate", Category = "Decor", Kind = "books", Price = 44}),
	}),
	Homes = table.freeze({
		table.freeze({Tier = 1, Name = "Tiny Starter Studio", Price = 0}),
		table.freeze({Tier = 2, Name = "Cozy Loft", Price = 250}),
		table.freeze({Tier = 3, Name = "Creator Bedroom", Price = 750}),
		table.freeze({Tier = 4, Name = "Skyline Penthouse", Price = 2000}),
		table.freeze({Tier = 5, Name = "Star Mansion", Price = 5000}),
	}),
})

return StoreCatalog
