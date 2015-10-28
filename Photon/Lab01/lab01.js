/*
Particle Photon 'Hello World' with Node.js and Johnny-Five
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
    token: 'ee83f8e456dcc565806917774937e2fa3180a058',
    deviceId: 'D7P001'
  })
});
// Define the pin that is connected to the LED
var LEDPIN = "D7";
// THe board.on() executes the anonymous function when the 
// Partile Photon reports back that it is initialized and ready.
board.on("ready", function(){
  // Set the pin you connected to the LED to OUTPUT mode
  this.pinMode(LEDPIN, five.Pin.OUTPUT);
  // Create a loop to "flash/blink/strobe" an led
  var val = 0;
  this.loop( 1000, function() {
    this.digitalWrite(LEDPIN, (val = val ? 0 : 1));
  });
});