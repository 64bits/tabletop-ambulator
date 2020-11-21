local gameCode = ''
local target = '$HOSTNAME'
local pointers = {}
function getAllData(t, prevData)
    -- if prevData == nil, start empty, otherwise start with prevData
    local data = prevData or {}

    -- copy all the attributes from t
    for k,v in pairs(t) do
        data[k] = data[k] or v
    end

    -- get t's metatable, or exit if not existing
    local mt = getmetatable(t)
    if type(mt)~='table' then return data end

    -- get the __index from mt, or exit if not table
    local index = mt.__index
    if type(index)~='table' then return data end

    -- include the data from index into data, recursively, and return
    return getAllData(index, data)
end

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
--                for key,value in pairs(parsed) do
--                    print("found parsed " .. key .. ":");
--                    print(value);
--                end
                local custom = cardValue.getCustomObject()
--                print('custom');
--                print(custom);
--                for key,value in pairs(custom) do
--                    print("found custom " .. key .. ":");
--                    print(value);
--                end
                if next(custom) == nil then
--                    print('buit-in object: ' ..parsed.Name);
                    builtInToCard(cardValue)
                    Wait.time(sendToServer, 0.5)
                    return
                    --                    table.insert(fullData[value], )
                elseif custom.face ~= nil then
                    -- send a card
                    table.insert(fullData[value], {
                        face = encodeURI(custom.face),
                        back = encodeURI(custom.back),
                        width = custom.width,
                        height = custom.height,
                        guid = parsed.GUID,
                        offset = parsed.CardID % 100
                    })
                else
                    -- send a mesh
                    table.insert(fullData[value], {
                        mesh = encodeURI(custom.mesh),
                        diffuse = encodeURI(custom.diffuse),
                        guid = parsed.GUID,
                    })
                end
            end
        end
    end
    WebRequest.post(target .. '/hands?code=' .. gameCode, { payload = JSON.encode(fullData) })
end
function builtInToCard(builtin)
    local parsed = JSON.decode(builtin.getJSON())
    local name = parsed.Name
    local card
    local data = {
        face = "http://cloud-3.steamusercontent.com/ugc/1663479592506990057/B6EEB9A683A57C9A41CC9782993A8BAF9DCD72A1/",
        back = "http://cloud-3.steamusercontent.com/ugc/1663479592507076702/D16FFBC8D87B4D4FB21C0057F2BBC9DC4D4FD379/",
        width = 5,
        height = 7,
        number = 6,
    };
    local deck = spawnObject({type = "DeckCustom"})
    deck.setCustomObject(data)
    if name == 'Die_4' then
        card = deck.takeObject({position=builtin.getPosition(), index=0, smooth=false})
    elseif name == 'Die_6' or name == 'Die_6_Rounded' then
        card = deck.takeObject({position=builtin.getPosition(), index=1, smooth=false})
    elseif name == 'Die_8' then
        card = deck.takeObject({position=builtin.getPosition(), index=2, smooth=false})
    elseif name == 'Die_10' then
        card = deck.takeObject({position=builtin.getPosition(), index=3, smooth=false})
    elseif name == 'Die_12' then
        card = deck.takeObject({position=builtin.getPosition(), index=4, smooth=false})
    elseif name == 'Die_20' then
        card = deck.takeObject({position=builtin.getPosition(), index=5, smooth=false})
    end
    card.setName(name)
    destroyObject(deck)
    destroyObject(builtin)
    return clone
end
function cardToBuildIn(card,options)
    if card == nil then
        return card
    end
    local name = JSON.decode(card.getJSON()).Nickname
--    print("name: ")
--    print(name)
    if (name == nil) then
       return card
    end
    local builtin
    if name == 'Die_4' then
        builtin = spawnObject({type = "Die_4", position=card.getPosition(), callback_function = function(obj) Wait.time(function() obj.roll() end,1) end})
        destroyObject(card)
        builtin.use_hands = true
        builtin.setColorTint(options.color)
        return builtin
    elseif name == 'Die_6' or name == 'Die_6_Rounded' then
        builtin = spawnObject({type = "Die_6_Rounded", position=card.getPosition(), callback_function = function(obj) Wait.time(function() obj.roll() end,1) end})
        destroyObject(card)
        builtin.use_hands = true
        builtin.setColorTint(options.color)
        return builtin
    elseif name == 'Die_8' then
        builtin = spawnObject({type = "Die_8", position=card.getPosition(), callback_function = function(obj) Wait.time(function() obj.roll() end,1) end})
        destroyObject(card)
        builtin.use_hands = true
        builtin.setColorTint(options.color)
        return builtin
    elseif name == 'Die_10' then
        builtin = spawnObject({type = "Die_10", position=card.getPosition(), callback_function = function(obj) Wait.time(function() obj.roll() end,1) end})
        destroyObject(card)
        builtin.use_hands = true
        builtin.setColorTint(options.color)
        return builtin
    elseif name == 'Die_12' then
        builtin = spawnObject({type = "Die_12", position=card.getPosition(), callback_function = function(obj) Wait.time(function() obj.roll() end,1) end})
        destroyObject(card)
        builtin.use_hands = true
        builtin.setColorTint(options.color)
        return builtin
    elseif name == 'Die_20' then
        builtin = spawnObject({type = "Die_20", position=card.getPosition(), callback_function = function(obj) Wait.time(function() obj.roll() end,1) end})
        destroyObject(card)
        builtin.use_hands = true
        builtin.setColorTint(options.color)
        return builtin
    else
        return card
    end
end

function sendDecks ()
    local decks = {}
    for key, value in pairs(getAllObjects()) do
        if value.name == 'DeckCustom' or value.name == 'Deck' then
            local deckInfo = value.getCustomObject()[1]
            table.insert(decks, {
                name = value.getName(),
                back = encodeURI(deckInfo.back),
                unique = deckInfo.unique_back,
                guid = value.guid
            })
        end
    end
    WebRequest.post(target .. '/decks?code=' .. gameCode, { payload = JSON.encode(decks) })
end
function sendPointers ()
    if tableSize == nil then
        return
    end
    local relativePointers = {}
    for key, value in pairs(pointers) do
        local relativePosition = Vector((tableSize.x/2 + value.getPosition().x) / tableSize.x, 0,(tableSize.z/2 + value.getPosition().z) /  tableSize.z)
        relativePointers[key] = relativePosition
    end
    WebRequest.post(target .. '/pointers?code=' .. gameCode, { payload = JSON.encode(relativePointers) })
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
                local options = value.options
                local card = cardToBuildIn(getObjectFromGUID(value.guid), options)
                if card == nil then
                    return getServerHighlights()
                end
                local pointer = pointers[value.color]
                local flip = options.flip
                local pos =  pointer.getPosition()
                local card_size = card.getBounds().size
--                print("play")
--                for key,value in pairs(card_size) do
--                    print("found component " .. key .. ":");
--                    print(value);
--                end
--                print(card_size)
                pos.x = pos.x - pointer.getTransformForward().x - card.getTransformForward().x*0.5*card_size.z
                pos.y = 5
                pos.z = pos.z - pointer.getTransformForward().z - card.getTransformForward().z*0.5*card_size.z
                card.setPosition(pos)
                if (flip) then
                    card.flip()
                end
--                local pos = card.getPosition()
--                pos.x = card.getTransformForward().x * 10 + math.random()
--                pos.z = card.getTransformForward().z * 10 + math.random()
--                card.setPosition(pos)
--                card.flip()
--                Wait.time(function()  cardToBuildIn(getObjectFromGUID(value.guid)) end, 2)
                Wait.time(sendToServer, 0.5)
            elseif key == 'highlight' then
                local card = getObjectFromGUID(value)
                if card == nil then
                    return getServerHighlights()
                end
                card.highlightOn({0, 0, 1}, 10)
            elseif key == 'draw' then
                getObjectFromGUID(value.guid).deal(1, value.color)
                Wait.time(sendToServer, 0.5)
            elseif key == 'join' then
                local hand = spawnObject({type = "Custom_Model", callback_function = function(obj) hand_spawn_callback(obj,   value) end})
                hand.setCustomObject({mesh = "http://cloud-3.steamusercontent.com/ugc/1679241899330247621/C0740C530F159EC17366B0ED6A9E1C2044E16DA5/" });
                hand.setScale(Vector(0.05,0.05,0.05))
                pointers[value] = hand
            elseif key == 'pointer' then
                local movedPointer = pointers[value.color]
                local relativePosition = Vector(value.guid.x, value.guid.y, value.guid.z)
                local absolutePosition = Vector(relativePosition.x*tableSize.x - tableSize.x/2, 5,relativePosition.z*tableSize.z - tableSize.z/2)
                movedPointer.setPosition(absolutePosition)
            end
        end
    end
    getServerHighlights()
end
function add_mat()
    getTableSize()
    if tableSize == nil then
        local mat = spawnObject({type= "BlockSquare",position=Vector(0,-10,0),scale=Vector(45,5,45), callback_function = function() Wait.time(getTableSize,2) end})
        mat.setName("Mat")
        mat.setLock(true)
        mat.setColorTint({r=1,g=1,b=1,a=0.1})
    end
end
function getTableSize()
    for _,obj in ipairs(getAllObjects()) do
        if JSON.decode(obj.getJSON()).Nickname == 'Mat' then
            tableSize = obj.getScale()
            obj.setPosition(Vector(0,obj.getPosition().y,0))
        end
    end
end
function hand_spawn_callback(object_spawned, join_color)
    object_spawned.setColorTint(join_color)
    object_spawned.use_hands = true
    object_spawned.deal(1, join_color)
    Wait.time(function() place_hand(object_spawned) end, 1)

end
function place_hand(item)
    local pos = item.getPosition()
    pos.x = item.getTransformForward().x * 10
    pos.z = item.getTransformForward().z * 10
    item.setPosition(pos)
    Wait.time(sendPointers, 0.5)
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

function onObjectLeaveContainer( container,  exit_object)
    if gameCode ~= '' and exit_object.name == 'Card' then
        Wait.time(sendToServer, 1.5)
    end
end

function reload()
    WebRequest.get(target .. '/create', function (data)
        if data.is_error == true then
            print('Something went wonky - please try reloading ambulator')
        else
            gameCode = JSON.decode(data.text).code
            print('Ambulated - go to ' .. target .. ' and enter code ' .. gameCode .. ' to join')

            getServerHighlights()
            sendToServer()
            sendDecks()
            self.UI.setValue("ttacode", gameCode)
        end
    end)
end

getTableSize()
reload()