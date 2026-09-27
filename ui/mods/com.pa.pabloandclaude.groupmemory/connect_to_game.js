// Group Memory: remember which save is being loaded so live_game can restore its groups.
(function () {
    var PENDING = 'groupmemory_pending';
    try {
        var loadpath = $.url().param('loadpath');
        if ($.url().param('mode') === 'loadsave' && loadpath)
            localStorage.setItem(PENDING, JSON.stringify({ path: loadpath, t: Date.now() }));
        else
            localStorage.removeItem(PENDING);
    } catch (e) {
        console.log('[GroupMemory] connect_to_game error ' + e);
    }
})();
