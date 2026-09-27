// Group Memory: mirror control groups as unit ids, store them with each save, restore on load.
// Unit ids persist across save/load, so re-selecting them and capturing rebuilds the groups.
(function () {
    var STORE = 'groupmemory_saves';
    var PENDING = 'groupmemory_pending';
    var MAX_SAVES = 50;
    var PENDING_MAX_AGE = 10 * 60 * 1000;

    var groups = {}; // group index -> [unit ids]
    var restoring = false;

    var log = function (text) { console.log('[GroupMemory] ' + text); };

    // Save name typed by the player vs. file name on disk differ in punctuation.
    var saveKey = function (name) {
        return String(name || '')
            .replace(/^.*[\\\/]/, '')
            .replace(/#.*$/, '')
            .replace(/\.par(\.gz)?$/i, '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');
    };

    var readStore = function () {
        try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; }
    };

    var writeStore = function (store) {
        var keys = _.sortBy(_.keys(store), function (key) { return -store[key].t; });
        _.forEach(keys.slice(MAX_SAVES), function (key) { delete store[key]; });
        try { localStorage.setItem(STORE, JSON.stringify(store)); } catch (e) { log('store error ' + e); }
    };

    var selectedIds = function () {
        var selection = model.selection();
        if (!selection || !selection.spec_ids)
            return [];
        return _.flatten(_.values(selection.spec_ids));
    };

    var onCapture = function (group) {
        if (restoring)
            return;
        var ids = selectedIds();
        if (ids.length)
            groups[group] = ids;
        else
            delete groups[group];
    };

    var onForget = function (group) {
        if (!restoring)
            delete groups[group];
    };

    // Hotkeys (inputmap) call api.select in this panel.
    var capture = api.select.captureGroup;
    var forget = api.select.forgetGroup;
    api.select.captureGroup = function (group) {
        onCapture(typeof group === 'number' ? group : 0);
        return capture.apply(this, arguments);
    };
    api.select.forgetGroup = function (group) {
        onForget(typeof group === 'number' ? group : 0);
        return forget.apply(this, arguments);
    };

    // Clicks on the control group bar arrive from its panel.
    handlers['groupmemory.capture'] = onCapture;
    handlers['groupmemory.forget'] = onForget;

    var persist = function (name) {
        var key = saveKey(name);
        if (!key)
            return;
        var store = readStore();
        store[key] = { name: String(name), t: Date.now(), groups: _.cloneDeep(groups) };
        writeStore(store);
        log('saved ' + _.keys(groups).length + ' groups for "' + name + '"');
    };

    // model.send_message is created by app.registerWithCoherent, which runs after scene mods.
    var hookSave = function () {
        if (!model.send_message)
            return _.delay(hookSave, 100);
        var send = model.send_message;
        model.send_message = function (message, payload) {
            if (message === 'write_replay' && payload && payload.name && payload.type !== 'replay')
                persist(payload.name);
            return send.apply(this, arguments);
        };
    };
    hookSave();

    var restore = function (saved) {
        var order = _.keys(saved);
        var anyRestored = false;
        var playerSelection = selectedIds();
        restoring = true;

        var finish = function () {
            restoring = false;
            groups = _.cloneDeep(saved);
            if (playerSelection.length)
                engine.call('select.byIds', playerSelection);
            else
                api.select.empty();
            log('restored ' + order.length + ' groups');
        };

        // Units stream in after the scene starts, so the first successful select may take a while.
        var restoreGroup = function (index, attempt) {
            if (index >= order.length)
                return finish();

            var group = Number(order[index]);
            engine.call('select.byIds', saved[order[index]]).then(function (ok) {
                if (ok) {
                    anyRestored = true;
                    capture.call(api.select, group);
                    return restoreGroup(index + 1, 0);
                }
                if (attempt < (anyRestored ? 2 : 120))
                    return _.delay(restoreGroup, 250, index, attempt + 1);
                log('group ' + group + ' has no living units, skipped');
                delete saved[order[index]];
                restoreGroup(index + 1, 0);
            });
        };

        restoreGroup(0, 0);
    };

    try {
        var pending = JSON.parse(localStorage.getItem(PENDING));
        localStorage.removeItem(PENDING);
        if (pending && Date.now() - pending.t < PENDING_MAX_AGE) {
            var entry = readStore()[saveKey(pending.path)];
            if (entry && !_.isEmpty(entry.groups))
                restore(_.cloneDeep(entry.groups));
            else
                log('no groups stored for ' + pending.path);
        }
    } catch (e) {
        log('restore error ' + e);
    }
})();
