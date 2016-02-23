/*
 * Copyright (c) 2016 Microsoft Corporation.
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
// This example incorporates examples from the Johnny-Five API examples at
// http://johnny-five.io/examples/grove-lcd-rgb-temperature-display-edison/

'use strict';
// Define the objects you will be working with
var five = require("johnny-five");
var Edison = require("edison-io");
var device = require('azure-iot-device');

// Define the client object that communicates with Azure IoT Hubs
var Client = require('azure-iot-device').Client;
// Define the message object that will define the message format going into Azure IoT Hubs
var Message = require('azure-iot-device').Message;

// Define the protocol that will be used to send messages to Azure IoT Hub
// For this lab we will use AMQP over Web Sockets.
// If you want to use a different protocol, comment out the protocol you want to replace, 
// and uncomment one of the other transports.
// var Protocol = require('azure-iot-device-amqp-ws').AmqpWs;
var Protocol = require('azure-iot-device-amqp').Amqp;
// var Protocol = require('azure-iot-device-http').Http;
// var Protocol = require('azure-iot-device-mqtt').Mqtt;

// The device-specific connection string to your Azure IoT Hub
var connectionString = process.env.IOTHUB_DEVICE_CONN || 'YOUR IOT HUB DEVICE-SPECIFIC CONNECTION STRING HERE';

// Create the client instanxe that will manage the connection to your IoT Hub
// The client is created in the context of an Azure IoT device.
var client = Client.fromConnectionString(connectionString, Protocol);

// Extract the Azure IoT Hub device ID from the connection string
var deviceId = device.ConnectionString.parse(connectionString).DeviceId;

// location is simply a string that you can filter on later
var location = process.env.DEVICE_LOCATION || 'GIVE A NAME TO THE LOCATION OF THE THING';

// Define the sensors you will use
var thermometer, lcd, led;

// Define some variable for holding sensor values
var c, f, r, g, b = 0;

// Define the board, which is an abstraction of the Intel Edison
var board = new five.Board({
  io: new Edison()
});

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
        
        // Create a message and send it to the IoT Hub every second
        var sendInterval = setInterval(function () {
            sendMessage('temperature', c);
        }, 2000);
        
        client.on('message', function (msg) {
            console.log('Id: ' + msg.messageId + ' Body: ' + msg.data);
            
            var body = msg.data.split(":");
            var indexOfLed = body.indexOf("led");
            
            if(indexOfLed >= 0) {
                if(body[indexOfLed+1] === "on"){
                    led.on();
                } else if(body[indexOfLed+1] === "off"){
                    led.off();
                }
            }
            
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
            clearInterval(sendInterval);
            client.removeAllListeners();
            client.connect(connectCallback);
        });
    }
}

function sendMessage(src, val){
    // Define the message body
    var payload = JSON.stringify({
        deviceId: deviceId,
        location: location,
        sensorType: src,
        sensorValue: val
    });
    
    // Create the message based on the payload JSON
    var message = new Message(payload);
    
    // For debugging purposes, write out the message payload to the console
    console.log("Sending message: " + message.getData());
    
    // Send the message to Azure IoT Hub
    client.sendEvent(message, printResultFor('send'));
}
    
// Helper function to print results in the console
function printResultFor(op) {
  return function printResult(err, res) {
    if (err) console.log(op + ' error: ' + err.toString());
    if (res) console.log(op + ' status: ' + res.constructor.name);
  };
}

// [Linear Interpolation](https://en.wikipedia.org/wiki/Linear_interpolation)
function linear(start, end, step, steps) {
  return (end - start) * step / steps + start;
}

// The board.on() executes the anonymous function when the 
// board reports back that it is initialized and ready.
board.on("ready", function() {
    console.log("Board connected...");
    
    client.open(connectCallback);
    
    // Plug the Temperature sensor module
    // into the Grove Shield's A0 jack
    thermometer = new five.Thermometer({
        pin: "A0",
        controller: "GROVE"
    });
    
    // Plug the LCD module into any of the
    // Grove Shield's I2C jacks.
    lcd = new five.LCD({
        controller: "JHD1313M1"
    });
    
    // Plug the LED module into the
    // Grove Shield's D6 jack.
    led = new five.Led(6);
    
    // Plug the Button module into the
    // Grove Shield's D4 jack.
    var button = new five.Button(4);
    
    // The following will turn the Led
    // on when the button is pressed.
    button.on("press", function() {
        led.on();
        sendMessage("led", "on");
    });
    
    // The following will turn the Led
    // off when the button is released.
    button.on("release", function() {
        led.off();
        sendMessage("led", "off");
    });
    
    // The thermometer object will invoke a callback everytime it reads data
    // as fast as every 25ms or whatever the 'freq' argument is set to
    thermometer.on("data", function() {
        /* 
        * The LCD's background will change color according to the temperature.
        * Hot -> Warm: Red -> Yellow
        * Moderate: Green
        * Cool -> Cold: Blue -> Violet
        */
    
        f = this.fahrenheit;
        c = this.celsius;
        
        var cRounded = Math.round(c);
        
        r = linear(0x00, 0xFF, cRounded, 40);
        g = linear(0x00, 0x00, cRounded, 40);
        b = linear(0xFF, 0x00, cRounded, 40);
                
        lcd.bgColor(r, g, b).cursor(0, 0).print("Fahrenheit: " + Math.round(f));
    });
});