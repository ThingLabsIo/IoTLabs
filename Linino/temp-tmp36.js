/*
 * Copyright (c) 2015 Intel Corporation.
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// This example uses the Seeed Studio Grove Starter Kit Plus - Intel IoT Edition


'use strict';
// Define the objects you will be working with
var five = require("johnny-five");
var Edison = require("edison-io");
var device = require('azure-iot-device');

console.log('Begining');

// location is simply a string that you can filter on later
var location = process.env.DEVICE_LOCATION || 'GIVE A NAME TO THE LOCATION OF THE THING';

console.log("location: " + location);

// The device-specific connection string to your Azure IoT Hub
var connectionString = process.env.IOTHUB_DEVICE_CONN || 'YOUR IOT HUB DEVICE-SPECIFIC CONNECTION STRING HERE';

console.log("connectionString: " + connectionString);

// Define the protocol that will be used to send messages to Azure IoT Hub
// For this lab we will use AMQP over Web Sockets.
// If you want to use a different protocol, comment out the protocol you want to replace, 
// and uncomment one of the other transports.
// var Protocol = require('azure-iot-device-amqp-ws').AmqpWs;
var Protocol = require('azure-iot-device-amqp').Amqp;
// var Protocol = require('azure-iot-device-http').Http;
// var Protocol = require('azure-iot-device-mqtt').Mqtt;

console.log("Protocol defined");

// Define the client object that communicates with Azure IoT Hubs
var Client = require('azure-iot-device').Client;
// Define the message object that will define the message format going into Azure IoT Hubs
var Message = require('azure-iot-device').Message;
// Create the client instanxe that will manage the connection to your IoT Hub
// The client is created in the context of an Azure IoT device.
var client = Client.fromConnectionString(connectionString, Protocol);

console.log("client defined");


// Extract the Azure IoT Hub device ID from the connection string 
// (this may not be the same as the Photon device ID)
var deviceId = device.ConnectionString.parse(connectionString).DeviceId;

console.log("Device ID: " + deviceId);

var board = new five.Board({
  io: new Edison()
});

// The board.on() executes the anonymous function when the 
// board reports back that it is initialized and ready.
board.on("ready", function() {
    console.log("Board connected...");
    
    // Open the connection to Azure IoT Hub
    // When the connection respondes (either open or error)
    // the anonymous function is executed
    var connectCallback = function (err) {
        console.log("Azure IoT connection open...");
        
        if(err) {
            // If there is a connection error, show it
            console.err('Could not connect: ' + err.message);
        } else {
            console.log('Client connected');
            
            
            var therm = new five.Thermometer({
                pin: "A0", // Plug the temperature sensor into the Analog port A0
                controller: "GROVE",
                freq: 2000
            });

            therm.on("data", function() {
                console.log("== therm 'data' event fired ==");
                
                console.log("%d°C", Math.round(therm.celsius));
                console.log("%d°F", Math.round(therm.fahrenheit));
                
                var payload = JSON.stringify({
                    deviceId: deviceId,
                    location: location,
                    celsius: this.celsius, // Scope (this) is the therm object
                    fahrenheit: this.fahrenheit
                });
                
                // Create the message based on the payload JSON
                var message = new Message(payload);
                // For debugging purposes, write out the message payload to the console
                console.log("Sending message: " + message.getData());
                // Send the message to Azure IoT Hub
                client.sendEvent(message, printResultFor('send'));
            });
            
            client.on('message', function (msg) {
                console.log('Id: ' + msg.messageId + ' Body: ' + msg.data);
                client.complete(msg, printResultFor('completed'));
                // reject and abandon follow the same pattern.
                // /!\ reject and abandon are not available with MQTT
            });
            
            // If the client gets an error, handle it
            client.on('error', function (err) {
                console.error(err.message);
            });
            
            // If the client gets disconnected, cleanup and reconnect
            client.on('disconnect', function () {
                client.removeAllListeners();
                client.connect(connectCallback);
            });
        }
    }
    
    client.open(connectCallback);
});

// Helper function to print results in the console
function printResultFor(op) {
  return function printResult(err, res) {
    if (err) console.log(op + ' error: ' + err.toString());
    if (res) console.log(op + ' status: ' + res.constructor.name);
  };
}