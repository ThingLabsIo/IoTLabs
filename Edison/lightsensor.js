// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license.
'use strict';
// Define the Johnny Five component
var five = require("johnny-five");
var Edison = require ("edison-io")

// Create a Johnny Five board instance to represent your Arduino.
// Board is simply an abstraction of the physical hardware, whether it is 
// an Arduino, Raspberry Pi, Particle Photon, or other boards. 
var board = new five.Board({
    io: new Edison()
});

// Define the pin you will use to read the residual voltage 
// coming from the photoresistor
var ANALOGPIN = 0;

// The board.on() executes the anonymous function when the
// board reports back that it is initialized and ready.
board.on("ready", function() {
    console.log("Board connected...");
    
    // read the input on analog pin 0:
    this.analogRead(ANALOGPIN, function(voltage) {
        console.log(voltage * (3.3 / 4096.0));
    });
});