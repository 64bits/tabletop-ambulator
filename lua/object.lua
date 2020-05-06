local target = 'https://tabletop-ambulator.herokuapp.com'

WebRequest.get(target .. '/ambulator', function (data)
    if data.is_error == true then
        print('Something went wrong - please try reloading ambulator')
    else
        spawnObjectJSON({
            json = data.text
        })
        destroyObject(self)
    end
end)
