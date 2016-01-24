// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license.
'use strict';
// Define the Johnny Five component
var five = require("johnny-five");

// Define the pin you will use to read the residual voltage 
// coming from the photoresistor
var ANALOGPIN = 0;

// Create a Johnny Five board instance to represent your Arduino.
// Board is simply an abstraction of the physical hardware, whether it is 
// a Arduino, Raspberry Pi, Particle Photon, or other boards. 
var board = new five.Board();

// The board.on() executes the anonymous function when the
// board reports back that it is initialized and ready.
board.on("ready", function() {
    console.log("Board connected...");
    // read the input on analog pin 0:
    this.analogRead(ANALOGPIN, function(voltage) {
        console.log(voltage * (5.0 / 1024.0));
    });
});