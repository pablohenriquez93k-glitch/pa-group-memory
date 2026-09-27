# Group Memory

Client mod for **Planetary Annihilation: TITANS**.

PA forgets your control groups (1–0) when you load a saved game. Group Memory remembers them: when you save from the in-game menu it stores the unit ids of each group, and when you load that save it rebuilds the groups automatically.

- Works with Ctrl+number and with clicks on the control group bar.
- Units that died before saving are simply left out.
- A unit can be in several groups, same as in the base game.
- Groups are stored locally (PA's UI local storage), keyed by save name. The last 50 saves are kept.

## Install

Enable **Group Memory** in Community Mods, or copy this folder to
`%LOCALAPPDATA%\Uber Entertainment\Planetary Annihilation\mods\com.pa.pabloandclaude.groupmemory`.

## Notes

- Only saves made from the in-game **Save Game** menu are tracked.
- Tested in single-player skirmish vs AI.

## License

MIT — see `LICENSE`.
