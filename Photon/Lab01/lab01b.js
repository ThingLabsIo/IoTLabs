/*
Particle Photon 'Hello World' with Node.js and Johnny-Five
By: Doug Seven
Licence: MIT

This example is based on the documentation for the Spark-IO
plug-in for Johnny Five by Rick Waldron <waldron.rick@gmail.com>.
See https://github.com/rwaldron/spark-io for the complete
documentation. 
*/

// Define the Johnny Five and Spark-IO variables
var five = require("johnny-five");
var particle = require("particle-io");
// Define the Johnny Five board as your Particle Photon
var board1 = new five.Board({
  io: new particle({
    token: process.env.PARTICLE_KEY || 'YOUR API KEY HERE',
    deviceId: 'D7P003'
  })
});

var board2 = new five.Board({
  io: new particle({
    token: process.env.PARTICLE_KEY || 'YOUR API KEY HERE',
    deviceId: 'D7P004'
  })
});
// Define the pin that is connected to the LED
var LEDPIN = "D7";
// THe board.on() executes the anonymous function when the 
// Partile Photon reports back that it is initialized and ready.
board1.on("ready", function(){
  // Set the pin you connected to the LED to OUTPUT mode
  this.pinMode(LEDPIN, five.Pin.OUTPUT);
  // Create a loop to "flash/blink/strobe" an led
  var val = 0;
  this.loop( 1000, function() {
    this.digitalWrite(LEDPIN, (val = val ? 0 : 1));
  });
});

board2.on("ready", function(){
  // Set the pin you connected to the LED to OUTPUT mode
  this.pinMode(LEDPIN, five.Pin.OUTPUT);
  // Create a loop to "flash/blink/strobe" an led
  var val = 0;
  this.loop( 500, function() {
    this.digitalWrite(LEDPIN, (val = val ? 0 : 1));
  });
});