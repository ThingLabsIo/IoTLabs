// Copyright (c) ThingLabs. All rights reserved.
// Licensed under the MIT license.
'use strict';
// Define the objects you will be working with
var five = require ("johnny-five");
var device = require('azure-iot-device');

// Add the following definition for the Particle plugin for Johnny-Five
var Particle = require("particle-io");

// Use factory function from AMQP-specific package
// Other options include HTTP (azure-iot-device-http) and MQTT (azure-iot-device-mqtt)
var clientFromConnectionString = require('azure-iot-device-amqp').clientFromConnectionString;

var token = process.env.PARTICLE_KEY || 'YOUR PARTICLE ACCESS TOKEN HERE';
var location = process.env.DEVICE_LOCATION || 'GIVE A NAME TO THE LOCATION OF THE THING';
var connectionString = process.env.IOTHUB_CONN || 'YOUR IOT HUB DEVICE-SPECIFIC CONNECTION STRING HERE';

// Create an Azure IoT client that will manage the connection to your IoT Hub
// The client is created in the context of an Azure IoT device, which is why
// you use a device-specific connection string.
var client = clientFromConnectionString(connectionString);
var deviceId = device.ConnectionString.parse(connectionString).DeviceId;

// Create a Johnny-Five board instance to represent your Particle Photon
// Board is simply an abstraction of the physical hardware, whether is is a 
// Photon, Arduino, Raspberry Pi or other boards.
// When creating a Board instance for the Photon you must specify the token and device ID
// for your Photon using the Particle-IO Plugin for Johnny-five.
// Replace the Board instantiation with the following:
var board = new five.Board({
  io: new Particle({
    token: token,
    deviceId: 'YOUR PARTICLE PHOTON DEVICE IS OR ALIAS'
  })
});

// Define the pins used for the LED, photoresistor and the value from the voltage divider.
var LEDPIN = "D1";
var ANALOGPIN = 0;
var darkIntensity = 0;

// The board.on() executes the anonymous function when the 
// board reports back that it is initialized and ready.
board.on("ready", function() {
    console.log("Board connected...");
    
    // Set pin connected to the LED to PWM mode
    this.pinMode(LEDPIN, five.Pin.PWM);
    
    // Create a new 'photoresistor' hardware instance.
    var photoresistor = new five.Sensor({
      pin: ANALOGPIN,  // Analog pin 0
    });
    
    // The photoresistor.on("data", callback) function invokes the anonymous callback function 
    // whenever the data from the sensor changes every 25ms. The anonymous function is scoped 
    // to the object (e.g. this == the instance of Sensor class object). 
    // The scale(min, max) function scales the value to the defined range.
    photoresistor.scale(0, 255).on("data", function() {
      // Assign the value from the voltage divider to the darkIntensity variable 
      darkIntensity = this.value;
      
      // Write the value to the PWM output pin
      // As the detected light intensity decreases (it gets darker)
      // the value coming in on pin A0 increase.
      // Using the value as output will make the LED grow brighter
      // as the room gets darker.
      board.analogWrite(LEDPIN, this.value);
    });
    
    // Execute a function once per second that will create send a new Azure IoT message with
    // the device information and the darkness value.
    setInterval(function(){
      var payload = JSON.stringify({
        deviceId: deviceId,
        location: location,
        messurementType: 'darkness',
        messurementValue: darkIntensity
      });
      
      // Create the message based on the payload JSON string
      var message = new device.Message(payload);
      // For debugging purposes, write out the message payload to the console
      console.log("Sending message: " + message.getData());
      // Send the message to Azure IoT Hub
      client.sendEvent(message, printResultFor('send'));
    }, 1000);
});
     
// Helper function to print results in the console
function printResultFor(op) {
  return function printResult(err, res) {
    if (err) console.log(op + ' error: ' + err.toString());
  };
}