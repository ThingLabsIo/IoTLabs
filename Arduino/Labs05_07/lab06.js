'use strict';
// Define the Johnny Five, Particle and Azure IoT objects
var five = require ("johnny-five");
var device = require('azure-iot-device');

// Create a Johnny-Five board instance to represent your Particle Photon
// Board is simply an abstraction of the physical hardware, whether is is an 
// Arduino, Raspberry Pi, Particle Photon, or other boards.
var board = new five.Board();
var LEDPIN = 11;
var ANALOGPIN = 0;

var deviceId = process.env.DEVICE_NAME || 'YOUR AZURE GATEWAY DEVICE NAME HERE (E.G. RICKGRIMES-HUB)';
var location = process.env.DEVICE_LOCATION || 'THE LOCATION OF THE DEVICE (E.G. HOME OFFICE)';
var connectionString = process.env.IOTHUB_CONN || 'YOUR AZURE IOT HUB DEVICE-SPECIFIC CONNECTION STRING HERE';

// Create an Azure IoT client that will manage the connection to your IoT Hub
// The client is created in the context of an Azure IoT device, which is why
// you use a device-specific connection string.
var client = new device.Client(connectionString, new device.Https());

board.on("ready", function() {
  console.log("Board connected...");
  
  // Set pin 13 to PWM mode - See Lab 04 for more information on PWM
  this.pinMode(LEDPIN, five.Pin.PWM);
    
  // Create a new 'photoresistor' hardware instance.
  var photoresistor = new five.Sensor({
    pin: ANALOGPIN,  // Analog pin 0
    freq: 1000 // Set the callback frequency to 1-second
  });
  
  // Define the callback function for the photoresistor reading.
  // The Sensor class raises the "data" event every 25ms by default.
  photoresistor.scale(0, 255).on("data", function() {
    var darkIntensity = this.value;
    
    // Write the value to the PWM output pin
    // As the detected light intensity decreases (it gets darker)
    // the value coming in on pin A0 increase.
    // Using the value as output will make the LED grow brighter
    // as the room gets darker.
    board.analogWrite(LEDPIN, this.value);
    
    var payload = JSON.stringify({
        deviceId: deviceId,
        location: location,
        messurementType: 'darkness',
        messurementValue: darkIntensity
      });
      
      // Create the message based on the payload JSON
      var message = new device.Message(payload);
      // For debugging purposes, write out the message payload to the console
      console.log("Sending message: " + message.getData());
      // Send the message to Azure IoT Hub
      client.sendEvent(message, printResultFor('send'));
  });
});

// Helper function to print results in the console
function printResultFor(op) {
  return function printResult(err, res) {
    if (err) console.log(op + ' error: ' + err.toString());
    if (res && (res.statusCode !== 204)) console.log(op + ' status: ' + res.statusCode + ' ' + res.statusMessage);
  };
}