--!strict

local MirrorCatalog = table.freeze({
	SchemaVersion = 1,
	Revision = "phase9-long-horizon-mirror-catalog-v1",
	Vehicles = table.freeze({
		table.freeze({Id = "vehicle-compact", Name = "Compact", Price = 750, Kind = "car", Seats = 2, Speed = 46}),
		table.freeze({Id = "vehicle-sedan", Name = "Sedan", Price = 1200, Kind = "car", Seats = 4, Speed = 52}),
		table.freeze({Id = "vehicle-suv", Name = "SUV", Price = 1800, Kind = "car", Seats = 5, Speed = 48}),
		table.freeze({Id = "vehicle-pickup", Name = "Pickup", Price = 2200, Kind = "truck", Seats = 4, Speed = 46}),
		table.freeze({Id = "vehicle-van", Name = "Van", Price = 3000, Kind = "van", Seats = 6, Speed = 43}),
		table.freeze({Id = "vehicle-sports", Name = "Sports Car", Price = 12000, Kind = "car", Seats = 2, Speed = 68}),
		table.freeze({Id = "vehicle-motorcycle", Name = "Motorcycle", Price = 4500, Kind = "bike", Seats = 1, Speed = 62}),
		table.freeze({Id = "vehicle-cart", Name = "Golf Cart", Price = 1500, Kind = "cart", Seats = 4, Speed = 34}),
	}),
	Inventory = table.freeze({
		table.freeze({Id = "tool-phone", Name = "Phone", Price = 0, Kind = "phone"}),
		table.freeze({Id = "tool-flashlight", Name = "Flashlight", Price = 120, Kind = "flashlight"}),
		table.freeze({Id = "tool-laptop", Name = "Laptop", Price = 1000, Kind = "laptop"}),
		table.freeze({Id = "tool-camera", Name = "Camera", Price = 700, Kind = "camera"}),
		table.freeze({Id = "tool-umbrella", Name = "Umbrella", Price = 240, Kind = "umbrella"}),
		table.freeze({Id = "tool-book", Name = "Book", Price = 80, Kind = "book"}),
		table.freeze({Id = "tool-clipboard", Name = "Clipboard", Price = 160, Kind = "clipboard"}),
		table.freeze({Id = "tool-guitar", Name = "Guitar", Price = 1500, Kind = "guitar"}),
		table.freeze({Id = "tool-binoculars", Name = "Binoculars", Price = 600, Kind = "binoculars"}),
		table.freeze({Id = "tool-stroller", Name = "Stroller", Price = 800, Kind = "stroller"}),
		table.freeze({Id = "tool-extinguisher", Name = "Fire Extinguisher", Price = 450, Kind = "extinguisher"}),
		table.freeze({Id = "tool-backpack", Name = "Backpack", Price = 300, Kind = "backpack"}),
	}),
})

return MirrorCatalog
