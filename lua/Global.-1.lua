--[[ Lua code. See documentation: https://api.tabletopsimulator.com/ --]]
-- #include ambulator
local target = 'http://localhost:3000'
local numTries = 0
local waitSeconds = { 5, 10 }
function tryGetScript()
    WebRequest.get(target .. '/ambulator', handleResult)
end

function handleResult(data)
    if data.is_error == true and numTries < 2 then
        numTries = numTries + 1
        print('Could not load ambulator...trying again in ' .. waitSeconds[numTries] .. ' seconds')
        Wait.time(tryGetScript, waitSeconds[numTries])
    elseif numTries >= 2 then
        print('Something went wrong - please try reloading ambulator')
    else
        -- print('WELL Loaded ' ..  data.text)
        -- print(data)
        spawnObjectJSON({
            json = data.text
        })
    end
end

--[[ The onLoad event is called after the game save finishes loading. --]]
function onLoad()
    tryGetScript()

end


--[[ The onUpdate event is called once per frame. --]]
function onUpdate()
    --[[ print('onUpdate loop!') --]]
end
