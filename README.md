Stop Timer for node-red
----------------------------

Sends the `msg` through the first output after the set timer duration. If a new `msg` is received before the timer has ended, it will replace the existing `msg` and the timer will be restarted, unless the new `msg` has a payload of `stop` or `STOP`, in which case it will stop the timer. The second output allows you to send an additional payload of a number, string or boolean. If the timer is stopped, the second output will automatically send a payload of `stopped`.

This is like the built in delay function of node-red, but with the ability to not only restart the timer, but to stop it as well.

In addition to the ability to use environemtn vars as the delay (added by stoptimer2), this version adds the ability to define the delay based on the contents of the msg.delay field.

0.0.1 - Initial Release

0.0.2 - Fixed an issue with using the timer in a repeating flow which caused it to either send an additional msg after being stopped, or, in some cases, not allowing a new msg to pass through after the node had been previously stopped.

0.0.3 - README.md update

0.0.4 - Updated icon for less confusion with other nodes

0.0.5 - As per request, I have included a second output. You can set the payload for the second output to a number, string or boolean, however, if the timer is stopped with an incoming msg, the second output will send the payload of "stopped".

0.0.6 - Forgot to update the "info" panel instructions inside of node-red to include the new features.

0.0.7 - Clarified the instructions with respect to the what happens to the existing message when a new message arrives.

0.1.0 - merc1031: Simple support for setting time from environment to allow parametrized use in subflows

0.1.1 - putch: Simple support for msg.delay field to set the delay duration

0.2.0 - putch: Added support for msg.units field to over-ride the units set in the node.
