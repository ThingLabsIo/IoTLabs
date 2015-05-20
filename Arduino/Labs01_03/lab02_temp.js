/* Lab 02 Temperature Input
 * In this lab you will create a temperature sensor that changes the brightness
 * of an LED based on the ambient temperature.
 * 
 * You could easily replace the LED with another variable output device,
 * like a servoe or a motor.
 *
 * For this lab, wire up a TMP36 temperature sensor with the center pin 
 * connected to Analog Input 3.
 * Wire up an LED to digital output 13.
 */
 var five = require("johnny-five"),
  tmp, led;

var board = new five.Board();

board.on("ready", function() {
    console.log("Board connected...");

    var temperature = new five.Temperature({
      controller: "TMP36",
      pin: "A2",
      freq: 500
    });

    led = new five.Led(13);

    var brightness = 0;
    
    temperature.on("data", function(err, data) {
      var c, f;
      
      c = Math.floor(data.celsius);
      f = Math.floor(data.fahrenheit);
      
      console.log(c + "°C", f + "°F");
      
      // Map the temperature value (a °F range of 75-100 is pretty good)
      // to the range for LED brightness
      brightness = map(f, 75, 100, 0, 255);
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