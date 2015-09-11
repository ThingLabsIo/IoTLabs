/*
Particle Photon 'Night Light' with Node.js and Johnny-Five
By: Doug Seven
License: MIT

This example is based on the documentation for the Particle-IO
plug-in for Johnny Five by Rick Waldron <waldron.rick@gmail.com>.
See https://github.com/rwaldron/spark-io for the complete
documentation. 
*/

// Define the Jonny Five and Particle-IO variables
var five = require("johnny-five");
var particle = require("particle-io");
// Define the Johnny Five board as your Particle Photon
var board = new five.Board({
  io: new particle({
    token: process.env.PARTICLE_KEY || 'YOUR API KEY HERE',
    deviceId: process.env.PARTICLE_DEVICE || 'YOUR DEVICE ID OR ALIAS HERE'
  })
});

// Define the pin that is connected to the LED
var LEDPIN = "D0";
// Define the pin you will use to read the residual voltage 
// coming from the photoresistor
var ANALOGPIN = "A0";
// The board.on() executes the anonymous function when the 
// Partile Photon reports back that it is initialized and ready.
board.on("ready", function() {
  // Set the pin you connected to the LED to OUTPUT mode
  this.pinMode(LEDPIN, five.Pin.PWM);
   // Read the input on analog pin 0:
  this.analogRead(ANALOGPIN, function(val) {
    // Map the analog value (0-1023) to an 8-bit value (0-255)
    // so it can be used to define the LED output. 
    var brightness = map(val, 950, 1023, 0, 255);
    // Use the constrain function to ensure the right values
    brightness = constrain(brightness, 0, 255);
    
    console.log('val: ' + val + '; voltage: ' + (val * (3.3 / 1024.0)) + '; brightness: ' + brightness);
    
    // Set the brigthness of the LED
    this.analogWrite(LEDPIN, brightness);
  });
});

// This function maps a value from one range into another range
// Example: map (25, 0, 25, 0, 50) returns 50
// Example: map (20, 0, 100, 0, 10) returns 2
function map(x, in_min, in_max, out_min, out_max) {
  return Math.round((x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min);
}

// This function ensures a value is within a defined range
function constrain(x, in_min, in_max) {
  return Math.round(x < in_min ? in_min : x > in_max ? in_max : x);
}