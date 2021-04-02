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
    let fs = require('fs');
    let path = require('path');
    let nodefile = n.id.toString();
    let nodepath = "";
    require('./cycle.js');
    
    if (n._alias != null) {
      nodepath = n._flow.path.replace(/\//g, "-") + "-";
      nodefile = n._alias;
    }

    const stvdtimersFile = path.join(RED.settings.userDir, "stvd-timers", nodepath +  nodefile);


    this.units = n.units || "Second";
    this.durationType = n.durationType;
    this.duration = isNaN(Number(RED.util.evaluateNodeProperty(n.duration, this.durationType, this, null))) ? 5 : Number(RED.util.evaluateNodeProperty(n.duration, this.durationType, this, null));
    this.payloadval = n.payloadval || "0";
    this.payloadtype = n.payloadtype || "num";
    this.reporting = n.reporting || "None";
    this.persist = n.persist || false;
    this.ignoretimerpass = n.ignoretimerpass || false;

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
      let bValue = false;
      if (this.payloadval === 'true') {
        bValue = true;
      } 
      this.payloadval = bValue;      
    } else if (this.payloadval == "null") {
      this.payloadtype = 'null';
      this.payloadval = null;
    } else {
      this.payloadval = String(this.payloadval);
    }

    let node = this;

    let timeout = null;
    let miniTimeout = null; 
    let countdown = null;
    let stopped = false;
    let delayRemainingDisplay = 0;
    let delayFactor = 1000;
    let reporting = "none";
    
    const maxTimeout = 2147483647; //max duration of setTimeout
    let actualDelayInUse = 0;
    let actualDelayRemaining = 0;

    // Read the state from a perisistent file
    if (this.persist == true) {
      try {
        if (fs.existsSync(stvdtimersFile)) {
          let savedState = JSON.retrocycle(JSON.parse(readState()));
          let targetMS = (new Date(savedState.time.toString())).getTime();
          let nowMS = (new Date).getTime();
          this.reporting = savedState.reporting.toString();
          if ((targetMS-nowMS) <= 3000) {
            targetMS = (Math.floor((Math.random() * 5) + 3)*1000);
          } else {
            targetMS = (Math.round((targetMS - nowMS)/1000))*1000;
          }
          savedState.origmsg.units = "millisecond";
          savedState.origmsg.delay = targetMS;
          handleInputEvent(savedState.origmsg);
        }
      } catch (error) {
        this.error("Error processing persistent file data for stoptimer-varidelay node " + n.id.toString()  + "\n\n" + error.toString());
      }
    } else {
      deleteState();
    }

    this.on("input", function(msg) {
      handleInputEvent(msg);
    });

    this.on("close", function(removed, done) {
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

      if (removed) {
        deleteState();
      }
      done();
    });

    function handleInputEvent(msg) {    
      node.status({});
      let delayUnits = node.units;
      reporting = node.reporting;    

      if(stopped === false || msg._timerpass !== true || node.ignoretimerpass === true) {
        stopped = false;
        clearTimeout(timeout);
        clearTimeout(miniTimeout);
        clearInterval(countdown);
        timeout = null;
        countdown = null;
        if (msg.payload == "stop" || msg.payload == "STOP") {      
          node.status({fill: "red", shape: "ring", text: "stopped"});
          stopped = true;
          let msg2 = RED.util.cloneMessage(msg);
          msg2.payload = "stopped";
          deleteState();
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
            delayRemainingDisplay = msg.delay * delayFactor;
          } else {
            delayRemainingDisplay = node.duration;
          }
          writeState(msg);
          actualDelayRemaining = delayRemainingDisplay;        
          if (actualDelayRemaining > maxTimeout) {
            actualDelayInUse = maxTimeout;
            actualDelayRemaining = actualDelayRemaining - maxTimeout;
          } else {
            actualDelayInUse = actualDelayRemaining;
            actualDelayRemaining = 0;
          }
          timeout = setTimeout(timerElapsed,actualDelayInUse,msg);
          let msg3 = "";
          if (reporting == "none") {
            msg3 = {payload: displayTime(delayRemainingDisplay)};
            node.status({fill: "green", shape: "dot", text: msg3.payload});
          } else {
            msg3 = {payload: displayTime(delayRemainingDisplay)};
            node.status({fill: "green", shape: "dot", text: msg3.payload});
            node.send([null, null, msg3]);
            //report every minute, but during the last minute, every second
            if ((delayRemainingDisplay > 60000) && (reporting == "last_minute_seconds")) {
              //for the first period, if we have a non-full minute increment
              //we need to execute a special interval to use it up.
              miniTimeout = setTimeout(function() {
                if ((delayRemainingDisplay % 60000) != 0) {
                  delayRemainingDisplay = delayRemainingDisplay - (delayRemainingDisplay % 60000);
                  let msg3 = {payload: displayTime(delayRemainingDisplay)};
                  node.status({fill: "green", shape: "dot", text: msg3.payload});
                  node.send([null, null, msg3]);
                }

                if (delayRemainingDisplay <= 60000) {
                  countdown = setInterval(function() {
                    delayRemainingDisplay = delayRemainingDisplay - 1000;
                    let msg3 = {payload: displayTime(delayRemainingDisplay)};
                    node.status({fill: "green", shape: "dot", text: msg3.payload});
                    node.send([null, null, msg3]);
                  }, 1000);
                } else {
                  countdown = setInterval(function() {
                    if (delayRemainingDisplay > 60000) {
                      delayRemainingDisplay = delayRemainingDisplay - 60000;
                      let msg3 = {payload: displayTime(delayRemainingDisplay)};
                      node.status({fill: "green", shape: "dot", text: msg3.payload});
                      node.send([null, null, msg3]);
                    }

                    //once we are less than 1 minute, switch to updates every second
                    if (delayRemainingDisplay <= 60000) {
                      clearInterval(countdown);
                      countdown = null;
                      countdown = setInterval(function() {
                        delayRemainingDisplay = delayRemainingDisplay - 1000;
                        let msg3 = {payload: displayTime(delayRemainingDisplay)};
                        node.status({fill: "green", shape: "dot", text: msg3.payload});
                        node.send([null, null, msg3]);
                      }, 1000);
                    }
                  }, 60000);
                }
                miniTimeout = null;
              }, delayRemainingDisplay % 60000);
            } else {
              //Update every second, always
              countdown = setInterval(function() {
                delayRemainingDisplay = delayRemainingDisplay - 1000;
                let msg3 = {payload: displayTime(delayRemainingDisplay)};
                node.status({fill: "green", shape: "dot", text: msg3.payload});
                node.send([null, null, msg3]);
              }, 1000);
            }
          }
        }
      } else {
        node.status({fill: "red", shape: "ring", text: "stopped"});
      }    
    }

    function timerElapsed(msg) {
      if (actualDelayRemaining == 0) {
        clearInterval(countdown);
        //node.status({});
        node.status({fill: "blue", shape: "square", text: "expired"});
        
        if(stopped === false) {
          let msg2 = RED.util.cloneMessage(msg);          
          let msg3 = { payload: "00:00:00" };
          msg2.payload = node.payloadval;
          if (reporting == "none") {
            msg3 = null;
          }
          deleteState();
          node.send([msg, msg2, msg3]);
          return;
        }
        timeout = null;
        countdown = null;
        miniTimeout = null;
      } else if (actualDelayRemaining > maxTimeout) {
        actualDelayInUse = maxTimeout;
        actualDelayRemaining = actualDelayRemaining - maxTimeout;
      } else {
        actualDelayInUse = actualDelayRemaining;
        actualDelayRemaining = 0;
      }

      timeout = setTimeout(timerElapsed,actualDelayInUse,msg);
    }

    function displayTime(delayToDisplay) {
      let timeToDisplay = "";
      let hours,minutes,seconds;

      delayToDisplay = delayToDisplay / 1000;
      hours = String(Math.floor(delayToDisplay / 3600)).padStart(2,"0");
      delayToDisplay %= 3600;
      minutes = String(Math.floor(delayToDisplay / 60)).padStart(2,"0");
      seconds = String(delayToDisplay % 60).padStart(2,"0");
      timeToDisplay = hours+":"+minutes+":"+seconds;
      return timeToDisplay;
    }

    function writeState(msg) {
      if (node.persist == true) {
        try {
          if (!fs.existsSync(path.dirname(stvdtimersFile))) fs.mkdirSync(path.dirname(stvdtimersFile), { recursive: true });
          let target = (new Date((new Date().getTime() + delayRemainingDisplay))).toISOString();
          fs.writeFileSync(stvdtimersFile, JSON.stringify(JSON.decycle({reporting: node.reporting, time: target, origmsg: msg})));          
        } catch (error) {
          node.error("Error writing persistent file for stoptimer-varidelay node " + node.id.toString() + "\n\n" + error.toString());
        }
      }
    }

    function readState() {
      let retVal = -1;
      try {
        let contents = fs.readFileSync(stvdtimersFile).toString();
        if (typeof contents !== 'undefined') {
          retVal = contents;
        }
      } catch (error) {
        node.error("Error reading persistent file for stoptimer-varidelay node " + node.id.toString() + "\n\n" + error.toString());
      }
      return retVal;
    }

    function deleteState() {
      try {
        if (fs.existsSync(stvdtimersFile)) {
          fs.unlinkSync(stvdtimersFile);
        }
      } catch (error) {
        node.error("Error deleting persistent file for stoptimer-varidelay node " + node.id.toString() + "\n\n" + error.toString());
      }
    }
  }
  RED.nodes.registerType("stoptimer-varidelay", StopTimerVariDelay);
}
