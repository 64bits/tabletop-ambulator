local target = 'https://tabletop-ambulator.herokuapp.com'
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
        spawnObjectJSON({
            json = data.text
        })
        destroyObject(self)
    end
end

tryGetScript()
