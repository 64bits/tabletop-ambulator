local gameCode = ''
local target = '$HOSTNAME'

function encodeURI(str)
    if (str) then
        str = string.gsub (str, "\n", "\r\n")
        str = string.gsub (str, "([^%w ])",
        function (c) return string.format ("%%%02X", string.byte(c)) end)
        str = string.gsub (str, " ", "+")
    end
    return str
end

function sendToServer ()
    --[[ Build and post JSON regarding users' hands --]]
    local fullData = {}
    for key, value in pairs(Player.getColors()) do
        if value ~= 'Grey' and Player[value] ~= nil and Player[value].getHandCount() > 0 then
            --[[ Iterate one player's hand --]]
            fullData[value] = {}
            for cardIndex, cardValue in pairs(Player[value].getHandObjects()) do
                local parsed = JSON.decode(cardValue.getJSON())
                local custom = cardValue.getCustomObject()
                table.insert(fullData[value], {
                    face = encodeURI(custom.face),
                    back = encodeURI(custom.back),
                    width = custom.width,
                    height = custom.height,
                    guid = parsed.GUID,
                    offset = parsed.CardID % 100
                })
            end
        end
    end
    WebRequest.post(target .. '/hands?code=' .. gameCode, { payload = JSON.encode(fullData) })
end

function sendDecks ()
    local decks = {}
    for key, value in pairs(getAllObjects()) do
        if value.name == 'DeckCustom' then
            local deckInfo = value.getCustomObject()[1]
            table.insert(decks, {
                back = encodeURI(deckInfo.back),
                unique = deckInfo.unique_back,
                guid = value.guid
            })
        end
    end
    WebRequest.post(target .. '/decks?code=' .. gameCode, { payload = JSON.encode(decks) })
end

function getServerHighlights ()
    WebRequest.get(target .. '/highlights?code=' .. gameCode, processServerHighlights)
end

function processServerHighlights (data)
    local function starts_with(str, start)
        local trim = str:gsub("%s+", "")
        return trim:sub(1, #start) == start
    end
    if data.is_error == false and starts_with(data.text, "{") then
        local highlights = JSON.decode(data.text)
        for key, value in pairs(highlights) do
            -- let's try moving the object rather than highlighting
            if key == 'play' then
                local card = getObjectFromGUID(value)
                local pos = card.getPosition()
                pos.x = card.getTransformForward().x * 10 + math.random()
                pos.z = card.getTransformForward().z * 10 + math.random()
                card.setPosition(pos)
                card.flip()
                Wait.time(sendToServer, 0.5)
            elseif key == 'highlight' then
                getObjectFromGUID(value).highlightOn({0, 0, 1}, 10)
            elseif key == 'draw' then
                getObjectFromGUID(value.guid).deal(1, value.color)
                Wait.time(sendToServer, 0.5)
            end
        end
    end
    getServerHighlights()
end

function onObjectDrop(dropped_object, player_color)
    if gameCode ~= '' then
        sendToServer()
    end
end

function onObjectPickUp(picked_up_object, player_color)
    if gameCode ~= '' then
        sendToServer()
    end
end

WebRequest.get(target .. '/create', function (data)
    if data.is_error == true then
        print('Something went wonky - please try reloading ambulator')
    else
        gameCode = JSON.decode(data.text).code
        print('Ambulated - go to ' .. target .. ' and enter code ' .. gameCode .. ' to join')
        getServerHighlights()
        sendToServer()
        sendDecks()
    end
end)