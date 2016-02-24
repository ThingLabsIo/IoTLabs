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
var five = require('johnny-five');
var Edison = require('edison-io');
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
var thermometer, lcd, led, button;

// Define some variable for holding sensor values
var tempC, tempF, r, g, b = 0;

// Define the board, which is an abstraction of the Intel Edison
var board = new five.Board({
  io: new Edison()
});



// *********************************************
// Send a messae to Azure IoT Hub.
// Always send the same message format (to 
// ensure the StreamAnalytics job doesn't fail)
// includng deviceId, location and the sensor 
// type/value combination.
// *********************************************
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
    console.log('Sending message: ' + message.getData());
    
    // Send the message to Azure IoT Hub
    client.sendEvent(message, printResultFor('send'));
}



// *********************************************
// Helper function to print results in the console
// *********************************************
function printResultFor(op) {
  return function printResult(err, res) {
    if (err) console.log(op + ' error: ' + err.toString());
    if (res) console.log(op + ' status: ' + res.constructor.name);
  };
}



// *********************************************
// Open the connection to Azure IoT Hub.
// When the connection respondes (either open or 
// error) the anonymous function is executed.
// *********************************************
var connectCallback = function (err) {
    console.log('Open Azure IoT connection...');
    
    
    
    // *********************************************
    // If there is a connection error, display it 
    // in the console.
    // *********************************************
    if(err) {
        console.error('...could not connect: ' + err);
        
        
        
    // *********************************************
    // If there is no error, send and receive
    // messages, and process completed messages.
    // *********************************************
    } else {
        console.log('...client connected');
        
        
        
        // *********************************************
        // Create a message and send it to the IoT Hub
        // every second
        // *********************************************
        var sendInterval = setInterval(function () {
            sendMessage('temperature', tempC);
        }, 2000);
        
        
        
        // *********************************************
        // Listen for incoming messages
        // *********************************************
        client.on('message', function (msg) {
            console.log('*********************************************');
            console.log('**** Message Received - Id: ' + msg.messageId + ' Body: ' + msg.data);
            console.log('*********************************************');
            
            // Split the message on a delimiter.
            var body = msg.data.split(':');
            
            // Look for the 'ledl' indicator.
            var indexOfLed = body.indexOf('led');
            
            // If 'led' is found, look at the next node in 
            // the message body, and turn the led on or off 
            // accordingly.
            if(indexOfLed >= 0) {
                if(body[indexOfLed+1] === 'on') led.on();
                else if(body[indexOfLed+1] === 'off') led.off();
            }



            // *********************************************
            // Process completed messages and remove them 
            // from the message queue.
            // *********************************************
            client.complete(msg, printResultFor('completed'));
            // reject and abandon follow the same pattern.
            // /!\ reject and abandon are not available with MQTT
        });
            
            
            
        // *********************************************
        // If the client gets an error, dsiplay it in
        // the console.
        // *********************************************
        client.on('error', function (err) {
            console.error(err.message);
        });
            
            
            
        // *********************************************
        // If the client gets disconnected, cleanup and
        // reconnect.
        // *********************************************
        client.on('disconnect', function () {
            clearInterval(sendInterval);
            client.removeAllListeners();
            client.connect(connectCallback);
        });
    }
}



// *********************************************
// The board.on() executes the anonymous
// function when the 'board' reports back that
// it is initialized and ready.
// *********************************************
board.on('ready', function() {
    console.log('Board connected...');
    
    // Plug the Temperature sensor module
    // into the Grove Shield's A0 jack
    thermometer = new five.Thermometer({
        pin: 'A0',
        controller: 'GROVE'
    });
    
    // Plug the LCD module into any of the
    // Grove Shield's I2C jacks.
    lcd = new five.LCD({
        controller: 'JHD1313M1'
    });
    
    // Plug the LED module into the
    // Grove Shield's D6 jack.
    led = new five.Led(6);
    
    // Plug the Button module into the
    // Grove Shield's D4 jack.
    button = new five.Button(4);
    
    
    
    // *********************************************
    // The thermometer object will invoke a callback
    // everytime it reads data as fast as every 25ms
    // or whatever the 'freq' argument is set to.
    // *********************************************
    thermometer.on('data', function() {
        // Set the state of the variables based on the 
        // value read from the thermometer
        // 'this' scope is the thermometer
        tempC = this.celsius;
        tempF = this.fahrenheit;
        
        // Use a simple linear function to determine
        // the RGB color to paint the LCD screen.
        // The LCD's background will change color
        // according to the temperature.
        // Hot -> Moderate -> Cold
        // 100°F ->  66°F  -> 32°F
        // 38°C  ->  19°C  -> 0°C
        // Red ->  Violet  -> Blue
        r = linear(0x00, 0xFF, tempC, 38);
        g = linear(0x00, 0x00, tempC, 38);
        b = linear(0xFF, 0x00, tempC, 38);
        
        // Paint the LCD and print the temperture
        // (rounded up to the nearest whole integer)
        lcd.bgColor(r, g, b).cursor(0, 0).print('Fahrenheit: ' + Math.ceil(tempF));
    });
    
    
    
    // *********************************************
    // The button.on('press') invokes the anonymous 
    // callback when the button is pressed.
    // *********************************************
    button.on('press', function() {
        led.on();
        console.log('*********************************************');
        sendMessage('led', 'on');
        console.log('*********************************************');
    });
    
    
    
    // *********************************************
    // The button.on('release') invokes the
    // anonymous callback when the button is
    // released.
    // *********************************************
    button.on('release', function() {
        led.off();
        console.log('*********************************************');
        sendMessage('led', 'off');
        console.log('*********************************************');
    });
    
    
    
    // *********************************************
    // Open the connection to Azure IoT Hubs and
    // begin sending messages.
    // *********************************************
    client.open(connectCallback);
});



// *********************************************
// Helper method for painting the LCD.
// Linear Interpolation
// (https://en.wikipedia.org/wiki/Linear_interpolation)
// *********************************************
function linear(start, end, step, steps) {
  return (end - start) * step / steps + start;
}