--!strict

local function referenceSmall(id: string, number: number, name: string, kind: string, requirement: string)
	return table.freeze({
		Id = id,
		Name = name,
		Price = 0,
		Kind = kind,
		Category = "Small",
		ParityStatus = "verified-reference-only",
		RuntimePlayable = false,
		Requirement = requirement,
		ReferenceOrdinal = number,
		Seats = 0,
		Speed = 0,
	})
end

local MirrorCatalog = table.freeze({
	SchemaVersion = 3,
	Revision = "brookhaven-small-reference-v3",
	Vehicles = table.freeze({
		table.freeze({Id = "vehicle-compact", Name = "Compact", Price = 750, Kind = "car", Category = "Street", ParityStatus = "temporary-starblox", RuntimePlayable = true, Seats = 2, Speed = 46}),
		table.freeze({Id = "vehicle-sedan", Name = "Sedan", Price = 1200, Kind = "car", Category = "Street", ParityStatus = "temporary-starblox", RuntimePlayable = true, Seats = 4, Speed = 52}),
		table.freeze({Id = "vehicle-suv", Name = "SUV", Price = 1800, Kind = "car", Category = "Work", ParityStatus = "temporary-starblox", RuntimePlayable = true, Seats = 5, Speed = 48}),
		table.freeze({Id = "vehicle-pickup", Name = "Pickup", Price = 2200, Kind = "truck", Category = "Work", ParityStatus = "temporary-starblox", RuntimePlayable = true, Seats = 4, Speed = 46}),
		table.freeze({Id = "vehicle-van", Name = "Van", Price = 3000, Kind = "van", Category = "Work", ParityStatus = "temporary-starblox", RuntimePlayable = true, Seats = 6, Speed = 43}),
		table.freeze({Id = "vehicle-sports", Name = "Sports Car", Price = 12000, Kind = "car", Category = "Street", ParityStatus = "temporary-starblox", RuntimePlayable = true, Seats = 2, Speed = 68}),
		table.freeze({Id = "vehicle-motorcycle", Name = "Motorcycle", Price = 4500, Kind = "bike", Category = "Street", ParityStatus = "temporary-starblox", RuntimePlayable = true, Seats = 1, Speed = 62}),
		table.freeze({Id = "vehicle-cart", Name = "Golf Cart", Price = 1500, Kind = "cart", Category = "Street", ParityStatus = "temporary-starblox", RuntimePlayable = true, Seats = 4, Speed = 34}),

		-- Verified factual Small-category metadata only. These stay non-playable
		-- until original StarBlox geometry/behavior is attached.
		referenceSmall("reference-small-01-scooter", 1, "Scooter", "scooter", "Free"),
		referenceSmall("reference-small-02-skateboard", 2, "Skateboard", "skateboard", "Free"),
		referenceSmall("reference-small-03-segway", 3, "Segway", "segway", "Premium"),
		referenceSmall("reference-small-04-unicycle", 4, "Unicycle", "unicycle", "Summer Carnival"),
		referenceSmall("reference-small-05-wheelchair", 5, "Wheelchair", "wheelchair", "Free"),
		referenceSmall("reference-small-06-baby-walker", 6, "Baby Walker", "walker", "Free"),
		referenceSmall("reference-small-07-bike", 7, "Bike", "bike", "Free"),
		referenceSmall("reference-small-08-girls-bike", 8, "Girls Bike", "bike", "Free"),
		referenceSmall("reference-small-09-tandem-bike", 9, "Tandem Bike", "bike", "Free"),
		referenceSmall("reference-small-10-wicked-wheelchair", 10, "Wicked Collaboration (Wheelchair)", "wheelchair", "No"),
		referenceSmall("reference-small-11-wicked-cargo-bike", 11, "Wicked Collaboration (Cargo Bike)", "bike", "Free"),
		referenceSmall("reference-small-12-cargo-bike", 12, "Cargo Bike", "bike", "Free"),
		referenceSmall("reference-small-13-pogo-stick", 13, "Pogo Stick", "pogo", "VIP"),
		referenceSmall("reference-small-14-party-bike", 14, "Party Bike", "bike", "Premium"),
		referenceSmall("reference-small-15-mini-horse", 15, "Mini Horse", "horse", "Horse Upgrade"),
		referenceSmall("reference-small-16-donkey", 16, "Donkey", "donkey", "Horse Upgrade"),
		referenceSmall("reference-small-17-akhal-horse", 17, "Akhal Horse", "horse", "Horse Upgrade"),
		referenceSmall("reference-small-18-shire-horse", 18, "Shire Horse", "horse", "Horse Upgrade"),
		referenceSmall("reference-small-19-friesian-horse", 19, "Friesian Horse", "horse", "Horse Upgrade"),
		referenceSmall("reference-small-20-clydesdale-horse", 20, "Clydesdale Horse", "horse", "Horse Upgrade"),
		referenceSmall("reference-small-21-normal-horse", 21, "Normal Horse", "horse", "Free"),
		referenceSmall("reference-small-22-original-horse", 22, "Original Horse", "horse", "Free"),
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
