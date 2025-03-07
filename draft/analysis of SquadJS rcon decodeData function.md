Looking at rcon.js decodeData function in SquadJS, it handles the follow packet correctly:
Reading the code it reads:
Starting from: `const decodedPacket = this.decodePacket(packet);`
decode the packet, find matching id (count), if matching id or auth_res or chat_value,
then send the packet to onPacket, `continue` means going at the top of the while, to search
for more packets (I use recursion, a while loop is better though).
We recheck while condition which is `this.incomingData.byteLength >= 4`,
in case we have not enough bytes, we need to wait for more data `decodeData` call, if we have enough
check packet size and wait for more data if needed.
Once we think we have the full packet, we check id, but since this is a follow response, there is no matching id.
In this case we end up at `const probePacketSize = 21;` line.
We likely don't need to check if size is 10. if incoming data length is less than 21 (14 + 7 bytes of the follow response)
we wait for more data, else, we confirm the "broken packet" (follow response), remove it and check for more data
by going at the top of while loop.
Looks fine to me.

Does SquadJS actually need the `matchCount` false to detect "follow response"?
Any packet of size 10, that is not of type auth_res or chat_val, should have 7 extra bytes checked before being sent.

Conclusion: I like the while loop. I see no issue with SquadJS implementation.

Extra: I have no idea what this issue is about, and if I am concerned: https://github.com/Team-Silver-Sphere/SquadJS/pull/291
