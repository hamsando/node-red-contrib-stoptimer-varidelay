Stop Timer (Variable Delay) for node-red
----------------------------------------

__General usage__
Sends the msg through the first output after the set timer duration. If a new msg is received before the timer has ended, it will replace the existing msg and the timer will be restarted, unless the new msg has a payload of 'stop' or 'STOP', in which case it will stop the timer. The second output allows you to send an additional payload of a number, string or boolean. If the timer is stopped, the second and third output will automatically send a payload of 'stopped'. The third output will send the time remaining, in HH:MM:SS format as time ticks away. The status below the node as well as the third output can be configured to update:

* Never(default)
* Every Second
* Every Minute, Last minute by seconds

The last option works as follows:
* While there is more than 1 minute remaining, the timer will decrement every minute. At the 1 minute point, it will switch to reporting every second.
* The exception to this rule is if your duration is not a minute increment. In that case, the first update will be for the partial minute, after which it will operate as noted above. (for example: 2.5 minutes will decrement to 2 minutes, then 1 minute, then every second down to zero)

This is like the built in delay function of node-red, but with the ability to not only restart the timer, but to stop it as well.

__Overriding the node via incoming messages__
If the input contains msg.delay, then the delay will be msg.delay units of time, where the units are whatever the units are defaulted to in the node iteself. In the absense of a msg.delay, or a value in msg.delay that can not be converted to an int, the value configured within the node will be used. If the value of msg.delay is less than 0, then 0 is used.

If the input contains msg.units, with a value of "Milliseconds", "Seconds", "Minutes" or "Hours" then that will over-ride what is defaulted in the node. In the absense of a msg.units, or an unknown string in msg.units the units configured within the node will be used. In the case of an unknown string, a warning message will appear in the Debug logs.

__Special Note on Milliseconds__
While you can set Milliseconds, I would not rely on the accuracy for anything critical. For the purposes of the node status and output 3, except in the 
case where Reporting is set to None, the milliseconds are not displayed or provided on the 3rd output as it wouldn't make sense based on the available
reporting rates.

__Resume timer on deploy/restart__
This option is "DISABLED" by default. If you "ENABLE" it (check the checkbox) then if the stoptimer is running and you re-Deploy the flow, or restart Node-RED, then the timer will automatically restart itself where it should be. What does that mean? A couple of examples will help here. 	  
* If you had a 10 minute stoptimer running, with 6 minutes elapsed (ie: 4 minutes left) and you hit Deploy, normally the stoptimer would no longer be running, but if you have this feature enabled, the timer will continue running from the 6 minute mark (ie: counting down 4 more minutes and then trigger).
* If you had a 10 minute stoptimer running, with 6 minutes elapsed (ie: 4 minutes left) and you <i>stopped</i> Node-RED for 2 minutes and then restarted it, normally the stoptimer would no longer be running, but if you have this feature enabled, the timer will continue running from the 8 minute mark (6 minutes from the original run + 2 minutes of Node-RED downtime) -- counting down 2 more minutes and then trigger.
* **Special Case** If on restart or re-Deploy, there is less than 3 seconds remaining on the stoptimer (or if the stoptimer should have elapsed already) then the stoptimer is set to a random amount between 3 and 8 seconds. This helps to ensure than anything else that needs to initialize before the stoptimer triggers, has a chance to initialize, it also helps so that if you happen to have a lot of timers, they don't all trigger at once and flood unsuspecting nodes/devices.		

__Release Notes__
0.0.1 
- Initial Release

0.0.2 
- Fixed an issue with using the timer in a repeating flow which caused it to either send an additional msg after being stopped, or, in some cases, not allowing a new msg to pass through after the node had been previously stopped.

0.0.3 
- README.md update

0.0.4 
- Updated icon for less confusion with other nodes

0.0.5 
- As per request, I have included a second output. You can set the payload for the second output to a number, string or boolean, however, if the timer is stopped with an incoming msg, the second output will send the payload of "stopped".

0.0.6 
- Forgot to update the "info" panel instructions inside of node-red to include the new features.

0.0.7 
- Clarified the instructions with respect to the what happens to the existing message when a new message arrives.

0.1.0 
- merc1031: Simple support for setting time from environment to allow parametrized use in subflows

0.1.1 
- putch: Simple support for msg.delay field to set the delay duration

0.2.0 
- putch: Added support for msg.units field to over-ride the units set in the node.

0.3.0 
- putch: changed the way that time is shown in the node status (from text Seconds/Minutes/Hours to HH:MM:SS)
- putch: Added support for 3rd output indicating time remaining
- putch: added option to define the rate of updates. 
- putch: Cleaned up internal references of node name
- putch: Fixed milliseconds timer setting 
- putch: Fixed icon

0.3.1
- putch: Fixed,3rd output should output 'stopped' if the stoptimer is sent 'stop' command

0.3.2
- putch: Fixed time output when time is greater/equal 24 hours

0.4.0
- putch: Optimized code which displays the countdown 
- putch: Fixed missing 'Units' label in node config screen.
- putch: Added stoptime countdown persistance across Deploy/Restart