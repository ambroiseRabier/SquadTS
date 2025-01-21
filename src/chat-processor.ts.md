Inspect: PLAYER_WARNED, does the message provide ids ? if yes it would remove condition for `...(matches.groups?.ids ? extractIDsLower(matches.groups.ids) : undefined)`.

Breaking change: "SQUAD_CREATED" event doesn't return `playerEOSID` and `playerSteamID` anymore but `eosID` and `steamID` instead.
This is more coherent with the others events.
