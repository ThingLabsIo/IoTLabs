/* Lab 02 Button Input
 * In this lab you will create a button that causes an LED
 * to turn off, on, or pulse if the button is held down. You will
 * learn how to detect button up, down and hold states.
 *
 * For this lab, wire up a button on a voltage divide similar to how
 * you wired up the photoresistor in Lab 02. Use a 10k Ohm resistor in the 
 * voltage divider and connect the voltage divider to digital output 2. 
 * Wire up an LED to digital output 13.
 */
 var five = require("johnny-five"),
	button, led;
	
var board = new five.Board();

board.on("ready", function() {
    console.log("Board connected...");

    // Create instances of the button and led
    button = new five.Button(2);
    led = new five.Led(13);

    // Inject the objects into REPL (optional)
    board.repl.inject({
      button: button,
      led: led
    });

    // Respond to the button down press by 
    // turning on the LED
    button.on("down", function() {
      console.log("down");
      led.on();
    });

    // Respond to the button hold press by
    // causing the LED to pulsate
    button.on("hold", function() {
      console.log("hold");
      led.pulse();
    });

    // Respond to the button release by stopping
    // the pulsing and turning the LED off.
    button.on("up", function() {
      console.log("up");
      led.stop().off();
    });
});