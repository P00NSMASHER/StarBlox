--!strict

local MirrorCatalog = table.freeze({
	SchemaVersion = 1,
	Revision = "phase8-mirror-catalog-v1",
	Vehicles = table.freeze({
		table.freeze({Id = "vehicle-compact", Name = "Compact", Price = 120, Kind = "car", Seats = 2, Speed = 46}),
		table.freeze({Id = "vehicle-sedan", Name = "Sedan", Price = 180, Kind = "car", Seats = 4, Speed = 52}),
		table.freeze({Id = "vehicle-suv", Name = "SUV", Price = 260, Kind = "car", Seats = 5, Speed = 48}),
		table.freeze({Id = "vehicle-pickup", Name = "Pickup", Price = 300, Kind = "truck", Seats = 4, Speed = 46}),
		table.freeze({Id = "vehicle-van", Name = "Van", Price = 360, Kind = "van", Seats = 6, Speed = 43}),
		table.freeze({Id = "vehicle-sports", Name = "Sports Car", Price = 700, Kind = "car", Seats = 2, Speed = 68}),
		table.freeze({Id = "vehicle-motorcycle", Name = "Motorcycle", Price = 420, Kind = "bike", Seats = 1, Speed = 62}),
		table.freeze({Id = "vehicle-cart", Name = "Golf Cart", Price = 220, Kind = "cart", Seats = 4, Speed = 34}),
	}),
	Inventory = table.freeze({
		table.freeze({Id = "tool-phone", Name = "Phone", Price = 0, Kind = "phone"}),
		table.freeze({Id = "tool-flashlight", Name = "Flashlight", Price = 40, Kind = "flashlight"}),
		table.freeze({Id = "tool-laptop", Name = "Laptop", Price = 120, Kind = "laptop"}),
		table.freeze({Id = "tool-camera", Name = "Camera", Price = 90, Kind = "camera"}),
		table.freeze({Id = "tool-umbrella", Name = "Umbrella", Price = 70, Kind = "umbrella"}),
		table.freeze({Id = "tool-book", Name = "Book", Price = 30, Kind = "book"}),
		table.freeze({Id = "tool-clipboard", Name = "Clipboard", Price = 50, Kind = "clipboard"}),
		table.freeze({Id = "tool-guitar", Name = "Guitar", Price = 160, Kind = "guitar"}),
		table.freeze({Id = "tool-binoculars", Name = "Binoculars", Price = 100, Kind = "binoculars"}),
		table.freeze({Id = "tool-stroller", Name = "Stroller", Price = 180, Kind = "stroller"}),
		table.freeze({Id = "tool-extinguisher", Name = "Fire Extinguisher", Price = 110, Kind = "extinguisher"}),
		table.freeze({Id = "tool-backpack", Name = "Backpack", Price = 80, Kind = "backpack"}),
	}),
})

return MirrorCatalog
