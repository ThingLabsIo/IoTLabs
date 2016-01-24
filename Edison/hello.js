// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license.
'use strict';
// Define the Johnny Five component
var five = require ("johnny-five");
var Edison = require ("edison-io")

// Create a Johnny Five board instance to represent your Arduino.
// Board is simply an abstraction of the physical hardware, whether it is 
// an Arduino, Raspberry Pi, Particle Photon, or other boards. 
var board = new five.Board({
    io: new Edison()
});

// Define the pin that is connected to the LED 
// The following is for use with the SparkFun GPIO block.
// See https://github.com/rwaldron/galileo-io/#pin-mapping-table- 
// for valid pin assignments.
var LEDPIN = "GP14";

// The board.on() executes the anonymous function when the
// board reports back that it is initialized and ready. 
board.on("ready", function() {
  console.log("Board connected...");
  
  // Set the pin you connected to the LED to OUTPUT mode
  this.pinMode(LEDPIN, five.Pin.OUTPUT);
  
  // Create a loop to "flash/blink/strobe" an led
  var val = 0;
  
  this.loop( 1000, function() {
    this.digitalWrite(LEDPIN, (val = val ? 0 : 1));
  });
});