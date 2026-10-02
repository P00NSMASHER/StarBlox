--!strict

local CampusDestinationAdapter = require(script.Parent.Parent.src.shared.CampusDestinationAdapter)

local function binding(sourcePartName: string, physicalRoomId: string, label: string)
	return {
		SourcePartName = sourcePartName,
		Label = label,
		PhysicalRoomId = physicalRoomId,
		PhysicalClassroomVerified = true,
	}
end

local function verifiedBindings()
	return {
		SchoolBuildingId = "legacy-brookhaven-school-complex",
		AllowFallbackSource = false,
		FallbackCampusEnabled = false,
		RequireVerifiedPhysicalClassrooms = true,
		Entrance = binding("LBH_08511", "legacy-school-entrance", "School Entrance"),
		Cafeteria = binding("LBH_11807", "legacy-school-cafeteria", "Cafeteria"),
		Library = binding("LBH_14137", "legacy-school-study-room", "Study Room / Make-Up"),
		Classes = {
			["word-skills"] = binding("LBH_14137", "legacy-classroom-03", "Word Skills"),
			["reading"] = binding("LBH_11970", "legacy-classroom-01", "Reading"),
			["teacher-choice"] = binding("LBH_11970", "legacy-classroom-01", "Teacher's Choice"),
			["star-lab"] = binding("LBH_12380", "legacy-classroom-02", "STAR Lab"),
			["math"] = binding("LBH_12380", "legacy-classroom-02", "Math"),
		},
	}
end

return function()
	describe("CampusDestinationAdapter", function()
		it("adapts verified school bindings into stable route nodes", function()
			local catalog = CampusDestinationAdapter.fromSchoolBindings(verifiedBindings())
			expect(catalog.buildingId).to.equal("legacy-brookhaven-school-complex")
			expect(#catalog.nodes).to.equal(5)
			expect(catalog.sourcePartByDestinationId[catalog.entranceDestinationId]).to.equal("LBH_08511")
			expect(catalog.sourcePartByDestinationId[catalog.cafeteriaDestinationId]).to.equal("LBH_11807")
		end)

		it("deduplicates scheduled classes that share a verified physical anchor", function()
			local catalog = CampusDestinationAdapter.fromSchoolBindings(verifiedBindings())
			expect(catalog.classDestinationIds["reading"]).to.equal(catalog.classDestinationIds["teacher-choice"])
			expect(catalog.classDestinationIds["math"]).to.equal(catalog.classDestinationIds["star-lab"])
		end)

		it("allows the study destination to share a verified classroom anchor", function()
			local catalog = CampusDestinationAdapter.fromSchoolBindings(verifiedBindings())
			expect(catalog.studyDestinationId).to.equal(catalog.classDestinationIds["word-skills"])
			expect(catalog.physicalRoomByClassId["word-skills"]).to.equal("legacy-classroom-03")
		end)

		it("sorts route nodes deterministically regardless of class table order", function()
			local first = CampusDestinationAdapter.fromSchoolBindings(verifiedBindings())
			local secondBindings = verifiedBindings()
			secondBindings.Classes = {
				math = secondBindings.Classes.math,
				reading = secondBindings.Classes.reading,
				["star-lab"] = secondBindings.Classes["star-lab"],
				["teacher-choice"] = secondBindings.Classes["teacher-choice"],
				["word-skills"] = secondBindings.Classes["word-skills"],
			}
			local second = CampusDestinationAdapter.fromSchoolBindings(secondBindings)
			for index, node in ipairs(first.nodes) do
				expect(node.id).to.equal(second.nodes[index].id)
			end
		end)

		it("fails closed for unverified or fallback-enabled world bindings", function()
			local unverified = verifiedBindings()
			unverified.Classes.math.PhysicalClassroomVerified = false
			expect(function()
				CampusDestinationAdapter.fromSchoolBindings(unverified)
			end).to.throw()

			local fallback = verifiedBindings()
			fallback.FallbackCampusEnabled = true
			expect(function()
				CampusDestinationAdapter.fromSchoolBindings(fallback)
			end).to.throw()
		end)

		it("rejects unsafe anchor collisions for entrance and cafeteria", function()
			local bindings = verifiedBindings()
			bindings.Cafeteria.SourcePartName = bindings.Entrance.SourcePartName
			expect(function()
				CampusDestinationAdapter.fromSchoolBindings(bindings)
			end).to.throw()

			bindings = verifiedBindings()
			bindings.Library.SourcePartName = bindings.Entrance.SourcePartName
			expect(function()
				CampusDestinationAdapter.fromSchoolBindings(bindings)
			end).to.throw()

			bindings = verifiedBindings()
			bindings.Library.SourcePartName = bindings.Cafeteria.SourcePartName
			expect(function()
				CampusDestinationAdapter.fromSchoolBindings(bindings)
			end).to.throw()

			bindings = verifiedBindings()
			bindings.Classes.reading.SourcePartName = bindings.Entrance.SourcePartName
			expect(function()
				CampusDestinationAdapter.fromSchoolBindings(bindings)
			end).to.throw()
		end)
	end)
end
