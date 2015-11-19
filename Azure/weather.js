// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license.
'use strict';
// Define the Johnny Five, Particle and Azure IoT objects
var Five = require ("johnny-five");
var Weather = require("j5-sparkfun-weather-shield")(five);
var Device = require('azure-iot-device');
var Particle = require("particle-io");

// Set up the access credentials for Particle and Azure
var token = process.env.PARTICLE_KEY || 'YOUR PARTICLE ACCESS TOKEN HERE';
var deviceId = process.env.DEVICE_NAME || 'YOUR PARTICLE PHOTON DEVICE ID/ALIAS HERE';
var location = process.env.DEVICE_LOCATION || 'THE LOCATION OF THE PARTICLE PHOTON DEVICE';
var connectionString = process.env.IOTHUB_CONN || 'YOUR IOT HUB DEVICE-SPECIFIC CONNECTION STRING HERE';

// Create a Johnny-Five board instance to represent your Particle Photon
// Board is simply an abstraction of the physical hardware, whether is is a 
// Photon, Arduino, Raspberry Pi or other boards.
var board = new Five.Board({
  io: new Particle({
    token: token,
    deviceId: deviceId
  })
});

// Create an Azure IoT client that will manage the connection to your IoT Hub
// The client is created in the context of an Azure IoT device, which is why
// you use a device-specific connection string.
var client = Device.Client.fromConnectionString(connectionString);

// The board.on() executes the anonymous function when the 
// board reports back that it is initialized and ready.
board.on("ready", function() {
    console.log("Board connected...");
    // The SparkFun Weather Shield for the Particle Photon has two sensors on the I2C bus - 
    // a humidity sensor (HTU21D) which can provide both humidity and temperature, and a 
    // barometer (MPL3115A2) which can provide both barometric pressure and humidity.
    // Controllers for these are wrapped in the convenient `Weather` plugin class:
    var weather = new Weather({
      variant: "PHOTON",
      freq: 1000,
      elevation: 0
    });
    
    // The weather.on("data", callback) function invokes the anonymous callback function 
    // whenever the data from the sensor changes (no faster than every 25ms). The anonymous 
    // function is scoped to the object (e.g. this == the instance of Weather class object). 
    weather.on("data", function () {
      var payload = JSON.stringify({
        deviceId: deviceId,
        location: location,
        // celsius & fahrenheit are averages taken from both sensors
        celsius: this.celsius,
        fahrenheit: this.fahrenheit,
        relativeHumidity: this.relativeHumidity,
        pressure: this.pressure,
        feet: this.feet,
        meters: this.meters
      });
      
      // Create the message based on the payload JSON
      var message = new Device.Message(payload);
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