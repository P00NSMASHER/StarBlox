--!strict
local FeedbackController={}
FeedbackController.__index=FeedbackController
function FeedbackController.new(context:any)
 local self=setmetatable({context=context,connections={}},FeedbackController)
 table.insert(self.connections,context.resultReceived:Connect(function(result)
  if result.code=="MISSION_COMPLETE" then local cam=workspace.CurrentCamera;if cam then local original=cam.FieldOfView;cam.FieldOfView=original-3;task.delay(.18,function() if cam then cam.FieldOfView=original end end) end end
 end));return self
end
function FeedbackController:mount(_playerGui:PlayerGui) end
function FeedbackController:destroy() for _,c in ipairs(self.connections) do c:Disconnect() end end
return FeedbackController