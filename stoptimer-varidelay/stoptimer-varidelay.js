/**
 * Modifications copyright (C) 2020 hamsando
 * Copyright jbardi
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 **/

module.exports = function(RED) {
  "use strict";
  function StopTimerVariDelay(n) {
    RED.nodes.createNode(this, n);
    var fs = require('fs');

    this.units = n.units || "Second";
    this.durationType = n.durationType;
    this.duration = parseInt(RED.util.evaluateNodeProperty(n.duration, this.durationType, this, null), 10) || 5;
    this.payloadval = n.payloadval || "0";
    this.payloadtype = n.payloadtype || "num";
    this.reporting = n.reporting || "None";
    this.persist = n.persist || false;

    if (this.duration <= 0) {
        this.duration = 0;
    } else {
      if (this.units == "Second") {
          this.duration = this.duration * 1000;
      }
      if (this.units == "Minute") {
          this.duration = this.duration * 1000 * 60;
      }
      if (this.units == "Hour") {
          this.duration = this.duration * 1000 * 60 * 60;
      }
    }

    if ((this.payloadtype === "num") && (!isNaN(this.payloadval))) {
      this.payloadval = Number(this.payloadval);
    } else if (this.payloadval === 'true' || this.payloadval === 'false') {
      this.payloadval = Boolean(this.payloadval);
    } else if (this.payloadval == "null") {
      this.payloadtype = 'null';
      this.payloadval = null;
    } else {
      this.payloadval = String(this.payloadval);
    }

    // Read the state from a perisistent file
  	if (this.persist == true) {
  	  try {
  		  if (fs.existsSync("states/" + n.id.toString())) {
          var savedState = JSON.parse(readState(fs,n));
          var targetMS = (new Date(savedState.time.toString())).getTime();
          var nowMS = (new Date).getTime();
          this.reporting = savedState.reporting.toString();

          if ((targetMS-nowMS) <= 3000) {
            targetMS = (Math.floor((Math.random() * 5) + 3)*1000);
          } else {
            targetMS = (Math.round((targetMS - nowMS)/1000))*1000;
          }

          savedState.origmsg.units = "millisecond";
          savedState.origmsg.delay = targetMS;
          this.emit("input", savedState.origmsg);
  			}
  		} catch (error) {
        n.error("Error processing persistent file data for stoptimer-varidelay node " + n.id.toString());
        n.error(error.toString());
  		}
  	} else {
      deleteState(fs, n);
    }

    var node = this;
    var timeout = null;
    var miniTimeout = null;
    var countdown = null;
    var stopped = false;
    var actualDelay = 0;
    var delayFactor = 1000;
    var reporting = "none";

    this.on("input", function(msg) {
      node.status({});
      var delayUnits = node.units;
      reporting = node.reporting;
      if(stopped === false || msg._timerpass !== true) {
        stopped = false;
        clearTimeout(timeout);
        clearTimeout(miniTimeout);
        clearInterval(countdown);
        timeout = null;
        countdown = null;
        if (msg.payload == "stop" || msg.payload == "STOP") {
          node.status({fill: "red", shape: "ring", text: "stopped"});
          stopped = true;
          var msg2 = RED.util.cloneMessage(msg);
          msg2.payload = "stopped";
          deleteState(fs, node);
          node.send([null, msg2, msg2]);
        } else {
          msg._timerpass = true;
          if (msg.units != null) {
            if (msg.units.toLowerCase().includes("millisecond")) {
              delayUnits = "Millisecond";
            } else if (msg.units.toLowerCase().includes("second")) {
              delayUnits = "Second";
            } else if (msg.units.toLowerCase().includes("minute")) {
              delayUnits = "Minute";
            } else if (msg.units.toLowerCase().includes("hour")) {
              delayUnits = "Hour";
            } else {
              node.warn("Unknown units in message, using node default: " + delayUnits);
            }
          }

          if (delayUnits == "Second") {
            delayFactor = 1000;
          } else if (delayUnits == "Minute") {
            delayFactor = 1000 * 60;
          } else if (delayUnits == "Hour") {
            delayFactor = 1000 * 60 * 60;
          } else {
            delayFactor = 1;
          }

          if ((msg.delay != null) && (!isNaN(parseInt(msg.delay,10)))) {
            actualDelay = msg.delay * delayFactor;
          } else {
            actualDelay = node.duration;
          }
          writeState(fs, node, msg, actualDelay);
          timeout = setTimeout(function() {
            clearInterval(countdown);
            node.status({});
            if(stopped === false) {
              var msg2 = RED.util.cloneMessage(msg);
              var msg3 = { payload: "00:00:00" };
              msg2.payload = node.payloadval;
              if (reporting == "none") {
                msg3 = null;
              }
              deleteState(fs, node);
              node.send([msg, msg2, msg3]);
            }
            timeout = null;
            countdown = null;
            miniTimeout = null;
          }, actualDelay);

          var msg3 = "";
          if (reporting == "none") {
            msg3 = {payload: displayTime(actualDelay)};
            node.status({fill: "green", shape: "dot", text: msg3.payload});
          } else {
            msg3 = {payload: displayTime(actualDelay)};
            node.status({fill: "green", shape: "dot", text: msg3.payload});
            node.send([null, null, msg3]);
            //report every minute, but during the last minute, every second
            if ((actualDelay > 60000) && (reporting == "last_minute_seconds")) {
              //for the first period, if we have a non-full minute increment
              //we need to execute a special interval to use it up.
              miniTimeout = setTimeout(function() {
                if ((actualDelay % 60000) != 0) {
                  actualDelay = actualDelay - (actualDelay % 60000);
                  var msg3 = {payload: displayTime(actualDelay)};
                  node.status({fill: "green", shape: "dot", text: msg3.payload});
                  node.send([null, null, msg3]);
                }

                if (actualDelay <= 60000) {
                  countdown = setInterval(function() {
                    actualDelay = actualDelay - 1000;
                    var msg3 = {payload: displayTime(actualDelay)};
                    node.status({fill: "green", shape: "dot", text: msg3.payload});
                    node.send([null, null, msg3]);
                  }, 1000);
                } else {
                  countdown = setInterval(function() {
                    if (actualDelay > 60000) {
                      actualDelay = actualDelay - 60000;
                      var msg3 = {payload: displayTime(actualDelay)};
                      node.status({fill: "green", shape: "dot", text: msg3.payload});
                      node.send([null, null, msg3]);
                    }

                    //once we are less than 1 minute, switch to updates every second
                    if (actualDelay <= 60000) {
                      clearInterval(countdown);
                      countdown = null;
                      countdown = setInterval(function() {
                        actualDelay = actualDelay - 1000;
                        var msg3 = {payload: displayTime(actualDelay)};
                        node.status({fill: "green", shape: "dot", text: msg3.payload});
                        node.send([null, null, msg3]);
                      }, 1000);
                    }
                  }, 60000);
                }
                miniTimeout = null;
              }, actualDelay % 60000);
            } else {
              //Update every second, always
              countdown = setInterval(function() {
                actualDelay = actualDelay - 1000;
                var msg3 = {payload: displayTime(actualDelay)};
                node.status({fill: "green", shape: "dot", text: msg3.payload});
                node.send([null, null, msg3]);
              }, 1000);
            }
          }
        }
      }
    });

    this.on("close", function() {
      if (timeout) {
        clearTimeout(timeout);
      }

      if (countdown) {
        clearInterval(countdown);
      }

      if (miniTimeout) {
        clearTimeout(miniTimeout);
      }
      node.status({});
    });
  }


  function displayTime(actualDelay) {
    //var aD = actualDelay;
    var timeToDisplay = "";
    var hours,minutes,seconds;

    actualDelay = actualDelay / 1000;
    hours = String(Math.floor(actualDelay / 3600)).padStart(2,"0");
    actualDelay %= 3600;
    minutes = String(Math.floor(actualDelay / 60)).padStart(2,"0");
    seconds = String(actualDelay % 60).padStart(2,"0");
    timeToDisplay = hours+":"+minutes+":"+seconds;
    return timeToDisplay;
  }

  function writeState(fs, node, msg, delay) {
    if (node.persist == true) {
  		try {
  			if (!fs.existsSync("states")) fs.mkdirSync("states");
        var target = (new Date((new Date().getTime() + delay))).toISOString();
  			fs.writeFileSync("states/" + node.id.toString(), "{\"reporting\":\"" + node.reporting + "\",\"time\":\"" + target + "\", \"origmsg\":" + JSON.stringify(msg) + "}");
  		} catch (error) {
        node.error("Error writing persistent file for stoptimer-varidelay node " + node.id.toString());
  			node.error(error.toString());
  		}
		}
  }

  function readState(fs, node) {
    var retVal = -1;
		try {
			var contents = fs.readFileSync("states/" + node.id.toString()).toString();
			if (typeof contents !== 'undefined') {
				retVal = contents;
			}
		} catch (error) {
      node.error("Error reading persistent file for stoptimer-varidelay node " + node.id.toString());
			node.error(error.toString());
		}
    return retVal;
  }

  function deleteState(fs, node) {
    try {
      if (fs.existsSync("states/" + node.id.toString())) {
        fs.unlinkSync("states/" + node.id.toString());
      }
    } catch (error) {
      node.error("Error deleting persistent file for stoptimer-varidelay node " + node.id.toString());
      node.error(error.toString());
    }
  }
  RED.nodes.registerType("stoptimer-varidelay", StopTimerVariDelay);
}
