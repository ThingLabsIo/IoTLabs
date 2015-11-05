/* Lab 03 Flex Resistor Input
 * In this lab you will create a flex device that changes the brightness
 * of an LED based on the amount the flex sensor is bent.
 * 
 * You could easily replace the LED with another variable output device,
 * like a servoe or a motor.
 *
 * For this lab, wire up a flex sensor on a voltage divide similar to how
 * you wired up the photoresistor in Lab 02. Use a 10k Ohm resistor in the 
 * voltage divider and connect the positive line to A1. 
 * Wire up an LED to digital output 13.
 */
 var five = require("johnny-five"),
  flex, led;

var board = new five.Board();

board.on("ready", function() {
    console.log("Board connected...");

    // Create a new instance of the Sensor type for the Flex sensor
    flex = new five.Sensor({
      pin: "A1", // The Analog In pin
      freq: 25 // The frequency to read data in (25 milliseconds)
    });

    led = new five.Led(13);

    var brightness = 0;
    
    // Scale the sensor's value to the LED's brightness range
    flex.on("data", function() {
      
      console.log("Flex position: " + this.value);
     
      // Mapp the flex value (typically between 600-900) to 
      // the range for LED brightness
      brightness = map(this.value, 660, 900, 0, 255);
      brightness = constrain(brightness, 0, 255);
     
      // Set the LED brightness using PWM.
      led.brightness(brightness);
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