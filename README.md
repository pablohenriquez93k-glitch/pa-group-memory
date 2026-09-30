# Group Memory

Client mod for **Planetary Annihilation: TITANS**.

PA forgets your control groups (1–0) when you load a saved game. Group Memory remembers them: when you save from the in-game menu it stores the unit ids of each group, and when you load that save it rebuilds the groups automatically.

- Works with Ctrl+number and with clicks on the control group bar.
- Units that died before saving are simply left out.
- A unit can be in several groups, same as in the base game.
- Groups are stored locally (PA's UI local storage), keyed by the name of the save. The last 200 saves are kept.

## Install

Enable **Group Memory** in Community Mods.

For a manual install, unzip so that the `com.pa.pabloandclaude.groupmemory` folder (the one with `modinfo.json`) is in
`%LOCALAPPDATA%\Uber Entertainment\Planetary Annihilation\mods\`. This is the folder used while developing and testing this mod.

## Limits

- Only saves made from the in-game **Save Game** menu are tracked.
- Only games on a server that runs on your own computer, such as a skirmish against the AI, are restored. Saves of games on a remote server are not stored, because they can not be loaded from this computer.
- A save made after game over is a replay, so no groups are stored for it.
- Galactic War battles are not tracked.
- Tested in single-player skirmish vs AI.

## License

MIT — see `LICENSE`.
