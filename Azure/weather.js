// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license.
'use strict';
// Define the objects you will be working with
var five = require ("johnny-five");
var Shield = require("j5-sparkfun-weather-shield")(five);
var device = require('azure-iot-device');

/* 
// PARTICLE PHOTON USERS
// Add the following definition for the Particle plugin for Johnny-Five
var Particle = require("particle-io");

var token = 'YOUR PARTICLE ACCESS TOKEN HERE';
*/

var sensorName = process.env.DEVICE_LOCATION || 'GIVE A UNIQUE NAME TO THE SENSOR';
var location = process.env.DEVICE_LOCATION || 'GIVE A NAME TO THE LOCATION OF THE THING';
var connectionString = process.env.IOTHUB_CONN || 'YOUR IOT HUB DEVICE-SPECIFIC CONNECTION STRING HERE';

// Create an Azure IoT client that will manage the connection to your IoT Hub
// The client is created in the context of an Azure IoT device, which is why
// you use a device-specific connection string.
var client = device.Client.fromConnectionString(connectionString);
var deviceId = device.ConnectionString.parse(connectionString).DeviceId;

// Create a Johnny-Five board instance to represent your Particle Photon
// Board is simply an abstraction of the physical hardware, whether is is a 
// Photon, Arduino, Raspberry Pi or other boards.
var board = new five.Board();
/* 
// PARTICLE PHOTON USERS
// When creating a Board instance for the Photon you must specify the token and device ID
// for your Photon using the Particle-IO Plugin for Johnny-five.
// Replace the Board instantiation with the following:
var board = new five.Board({
  io: new Particle({
    token: token,
    deviceId: 'YOUR PARTICLE PHOTON DEVICE IS OR ALIAS'
  })
});
*/

// The board.on() executes the anonymous function when the 
// board reports back that it is initialized and ready.
board.on("ready", function() {
    console.log("Board connected...");
    
    // The SparkFun Weather Shield has two sensors on the I2C bus - 
    // a humidity sensor (HTU21D) which can provide both humidity and temperature, and a 
    // barometer (MPL3115A2) which can provide both barometric pressure and humidity.
    // Controllers for these are wrapped in a convenient plugin class:
    var weather = new Shield({
      variant: "ARDUINO", // or PHOTON
      freq: 1000,         // Set the callback frequency to 1-second
      elevation: 100      // Go to http://www.WhatIsMyElevation.com to get your current elevation
    });
    
    // The weather.on("data", callback) function invokes the anonymous callback function 
    // whenever the data from the sensor changes (no faster than every 25ms). The anonymous 
    // function is scoped to the object (e.g. this == the instance of Weather class object). 
    weather.on("data", function () {
      var payload = JSON.stringify({
        deviceId: deviceId,
        sensorName: sensorName,
        location: location,
        // celsius & fahrenheit are averages taken from both sensors on the shield
        celsius: this.celsius,
        fahrenheit: this.fahrenheit,
        relativeHumidity: this.relativeHumidity,
        pressure: this.pressure,
        feet: this.feet,
        meters: this.meters
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