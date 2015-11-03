// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license.
'use strict';
// Define the Johnny Five component
var five = require("johnny-five");

// Create a Johnny Five board instance to represent your Arduino.
// Board is simply an abstraction of the physical hardware, whether it is 
// a Arduino, Raspberry Pi, Particle Photon, or other boards. 
var board = new five.Board();

// Define the pin that is connected to the LED 
var LEDPIN = 11;

// Define the pin you will use to read the residual voltage 
// coming from the photoresistor
var ANALOGPIN = 0;

// The board.on() executes the anonymous function when the
// board reports back that it is initialized and ready.
board.on("ready", function() {
  console.log("Board connected...");
  
  // Set pin 13 to PWM mode
  this.pinMode(LEDPIN, five.Pin.PWM);
  
  // Create a new 'photoresistor' hardware instance.
  var photoresistor = new five.Sensor({
    pin: ANALOGPIN  // Analog pin 0
  });
  
  // Define the callback function for the photoresistor reading.
  // The Sensor class raises the "data" event every 25ms by default.
  photoresistor.scale(0, 255).on("data", function() {
    var darkIntensity = this.value;
    
    // Write the value to the PWM output pin
    // As the detected light intensity decreases (it gets darker)
    // the value coming in on pin A0 increases.
    // Using the value as output will make the LED grow brighter
    // as the room gets darker.
    board.analogWrite(LEDPIN, darkIntensity);
    
    console.log('value: ' + darkIntensity + ' ; voltage: '  + (darkIntensity * (5.0 / 256.0)));
  });
});