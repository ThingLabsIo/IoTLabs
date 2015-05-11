var five = require("johnny-five");
var board = new five.Board();
var LEDPIN = 13;
var ANALOGPIN = 0;

board.on("ready", function() {
  
  // Set pin 13 to PWM mode
  this.pinMode(LEDPIN, five.Pin.PWM);

   // read the input on analog pin 0:
  this.analogRead(ANALOGPIN, function(val) {

    // Map the analog value (0-1023) to an 8-bit value (0-255)
    // so it can be used to define the LED output. 
    var brightness = map(val, 350, 1023, 0, 255);
    
    // Use the constrain function to ensure the right values
    brightness = constrain(brightness, 0, 255);

    console.log('val: ' + (val * (5.0 / 1024.0)) + '; brightness: ' + brightness);

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