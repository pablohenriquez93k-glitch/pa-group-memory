// Group Memory: mirror control groups as unit ids, store them with each save, restore on load.
// Unit ids persist across save/load, so re-selecting them and capturing rebuilds the groups.
(function () {
    var STORE = 'groupmemory_saves';
    var PENDING = 'groupmemory_pending';
    var MAX_SAVES = 200;
    var PENDING_MAX_AGE = 10 * 60 * 1000;
    var CAPTURE_SETTLE = 250;
    var WAIT_INTERVAL = 250;
    var WAIT_TRIES = 120;

    var groups = {}; // group index -> [unit ids]
    var touched = null; // groups the player changed while a restore is running
    var captureToken = {};

    var log = function (text) { console.log('[GroupMemory] ' + text); };

    // The save dialog only allows letters, digits, _, - and spaces, and the engine
    // uses the typed name as the file name, so the name itself is the key.
    var saveKey = function (name) {
        return String(name || '')
            .replace(/^.*[\\\/]/, '')
            .replace(/#.*$/, '')
            .replace(/\.par(\.gz)?$/i, '')
            .trim()
            .toLowerCase();
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

    var setGroup = function (group, ids) {
        if (ids.length)
            groups[group] = ids.slice();
        else
            delete groups[group];
    };

    var onCapture = function (group) {
        if (touched)
            touched[group] = true;

        var ids = selectedIds();
        setGroup(group, ids);

        // The engine can change the selection right after a capture: Add to Control Groups
        // recalls the old group first, and the commander's automatic group 1 is captured
        // before its selection arrives. Read again once it settles.
        var token = captureToken[group] = (captureToken[group] || 0) + 1;
        _.delay(function () {
            if (captureToken[group] !== token)
                return;
            var later = selectedIds();
            if (later.length && (!ids.length || _.difference(ids, later).length === 0))
                setGroup(group, later);
        }, CAPTURE_SETTLE);
    };

    var onForget = function (group) {
        if (touched)
            touched[group] = true;
        captureToken[group] = (captureToken[group] || 0) + 1;
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

    // Saves of games on a remote server can not be loaded from this computer.
    var isLocalServer = function () {
        var host = model.gameHostname && model.gameHostname();
        return !host || host === 'localhost' || host === '127.0.0.1';
    };

    var persist = function (name) {
        var key = saveKey(name);
        if (!key)
            return;
        if (model.serverMode && model.serverMode() === 'game_over')
            return log('not storing groups for "' + name + '": saves after game over load as replays');
        if (!isLocalServer())
            return log('not storing groups for "' + name + '": game is on a remote server');

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
        var everyone = _.uniq(_.flatten(_.values(saved)));
        var attempts = 0;

        // A save made while the restore runs keeps the stored groups.
        groups = _.cloneDeep(saved);
        touched = {};

        // Selection changes are the player's, except the ones the restore makes itself.
        var playerSelection = selectedIds();
        var busy = false;
        var watcher = model.selection.subscribe(function () {
            if (!busy)
                playerSelection = selectedIds();
        });

        var finish = function () {
            touched = null;
            if (playerSelection.length)
                engine.call('select.byIds', playerSelection);
            else
                api.select.empty();
            watcher.dispose();
            log('restored ' + _.keys(groups).length + ' groups');
        };

        var restoreGroup = function (index) {
            if (index >= order.length)
                return finish();

            var group = order[index];
            if (touched[group])
                return restoreGroup(index + 1);

            engine.call('select.byIds', saved[group]).then(function (ok) {
                if (ok) {
                    capture.call(api.select, Number(group));
                } else {
                    delete groups[group];
                    log('group ' + group + ' has no living units, skipped');
                }
                restoreGroup(index + 1);
            });
        };

        // Units stream in after the scene starts. Wait once for all of them, then restore each group.
        var waitForUnits = function () {
            busy = true;
            engine.call('select.byIds', everyone).then(function (ok) {
                if (ok)
                    return restoreGroup(0);
                busy = false;
                if (++attempts < WAIT_TRIES)
                    return _.delay(waitForUnits, WAIT_INTERVAL);
                touched = null;
                watcher.dispose();
                log('no living units found, nothing restored');
            });
        };

        if (everyone.length)
            waitForUnits();
        else
            finish();
    };

    try {
        var pending = JSON.parse(localStorage.getItem(PENDING));
        localStorage.removeItem(PENDING);
        if (pending && Date.now() - pending.t < PENDING_MAX_AGE) {
            var key = saveKey(pending.path);
            var entry = readStore()[key];
            if (entry && !_.isEmpty(entry.groups))
                restore(_.cloneDeep(entry.groups));
            else
                log('no groups stored for "' + key + '"');
        }
    } catch (e) {
        log('restore error ' + e);
    }
})();
