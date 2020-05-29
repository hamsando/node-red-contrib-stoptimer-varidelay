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

    this.units = n.units || "Second";
    this.durationType = n.durationType;
    this.duration = parseInt(RED.util.evaluateNodeProperty(n.duration, this.durationType, this, null), 10) || 5;
    this.payloadval = n.payloadval || "0";
    this.payloadtype = n.payloadtype || "num";
    this.reporting = n.reporting || "None";

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
          node.send([null, msg2, null]);
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
              node.send([msg, msg2, msg3]);
            }
            timeout = null;
            countdown = null;
            miniTimeout = null;
          }, actualDelay);

          var msg3 = "";
          if (reporting == "none") {
            msg3 = {payload: new Date(actualDelay).toISOString().substr(11, 10)};
            node.status({fill: "green", shape: "dot", text: msg3.payload});
          } else {
            msg3 = {payload: new Date(actualDelay).toISOString().substr(11, 8)};
            node.status({fill: "green", shape: "dot", text: msg3.payload});
            node.send([null, null, msg3]);
            //report every minute, but during the last minute, every second
            if ((actualDelay > 60000) && (reporting == "last_minute_seconds")) {
              //for the first period, if we have a non-full minute increment
              //we need to execute a special interval to use it up.
              miniTimeout = setTimeout(function() {
                //clearInterval(countdown);
                if ((actualDelay % 60000) != 0) {
                  actualDelay = actualDelay - (actualDelay % 60000);
                  var msg3 = {payload: new Date(actualDelay).toISOString().substr(11, 8)};
                  node.status({fill: "green", shape: "dot", text: msg3.payload});
                  node.send([null, null, msg3]);
                }

                if (actualDelay <= 60000) {
                  countdown = setInterval(function() {
                    actualDelay = actualDelay - 1000;
                    var msg3 = {payload: new Date(actualDelay).toISOString().substr(11, 8)};
                    node.status({fill: "green", shape: "dot", text: msg3.payload});
                    node.send([null, null, msg3]);
                  }, 1000);
                } else {
                  countdown = setInterval(function() {
                    if (actualDelay > 60000) {
                      actualDelay = actualDelay - 60000;
                      var msg3 = {payload: new Date(actualDelay).toISOString().substr(11, 8)};
                      node.status({fill: "green", shape: "dot", text: msg3.payload});
                      node.send([null, null, msg3]);
                    }

                    //once we are less than 1 minute, switch to updates every second
                    if (actualDelay <= 60000) {
                      clearInterval(countdown);
                      countdown = null;
                      countdown = setInterval(function() {
                        actualDelay = actualDelay - 1000;
                        var msg3 = {payload: new Date(actualDelay).toISOString().substr(11, 8)};
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
                var msg3 = {payload: new Date(actualDelay).toISOString().substr(11, 8)};
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
        clearInterval(countdown);
        clearTimeout(miniTimeout);
      }
      node.status({});
    });
  }
  RED.nodes.registerType("stoptimer-varidelay", StopTimerVariDelay);
}
