/*
Particle Photon 'Ambient Light' with Node.js and Johnny-Five
By: Doug Seven
Licence: MIT

This example is based on the documentation for the Spark-IO
plug-in for Johnny Five by Rick Waldron <waldron.rick@gmail.com>.
See https://github.com/rwaldron/spark-io for the complete
documentation. 
*/

// Define the Jonny Five and Spark-IO variables
var five = require("johnny-five");
var Spark = require("spark-io");
// Define the Johnny Five board as your Particle Photon
var board = new five.Board({
  io: new Spark({
    token: process.env.PARTICLE_KEY || 'YOUR API KEY HERE',
    deviceId: process.env.PARTICLE_DEVICE || 'YOUR DEVICE ID OR ALIAS HERE'
  })
});

// Define the pin you will use to read the residual voltage 
// coming from the photoresistor
var ANALOGPIN = "A0";
// THe board.on() executes the anonymous function when the 
// Partile Photon reports back that it is initialized and ready.
board.on("ready", function(){
  // Read the residual voltage coming from the photoresistor
  this.analogRead(ANALOGPIN, function(voltage) {
    // Multiple the value by 3.3V / 1024, which the the
    // value range of the photoresistor
    console.log(voltage * (3.3 / 1024.0));
  });
});