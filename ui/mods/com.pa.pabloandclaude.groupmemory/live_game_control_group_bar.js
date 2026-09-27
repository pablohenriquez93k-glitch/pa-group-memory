// Group Memory: forward control group changes made from the bar to live_game.
(function () {
    var capture = api.select.captureGroup;
    var forget = api.select.forgetGroup;

    api.select.captureGroup = function (group) {
        var result = capture.apply(this, arguments);
        api.Panel.message(api.Panel.parentId, 'groupmemory.capture', typeof group === 'number' ? group : 0);
        return result;
    };

    api.select.forgetGroup = function (group) {
        var result = forget.apply(this, arguments);
        api.Panel.message(api.Panel.parentId, 'groupmemory.forget', typeof group === 'number' ? group : 0);
        return result;
    };
})();
