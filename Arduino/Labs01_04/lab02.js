// Define the Johnny Five and Particle-IO variables
var five = require("johnny-five"); 
// Define the pin that is connected to the LED 
var LEDPIN = 13;

// Create a Johnny Five board instance to represent your Arduino.
// Board is simply an abstraction of the physical hardware, whether it is 
// a Arduino, Raspberry Pi, Particle Photon, or other boards. 
var board = new five.Board();

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