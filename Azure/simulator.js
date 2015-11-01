// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license.

'use strict';

var device = require('azure-iot-device');

// Use the DeviceExplorer or IotHub-Exploror tools to create a device and get its connection string.
var connectionString = process.env.IOTHUB_CONN || 'YOUR IOT HUB DEVICE-SPECIFIC CONNECTION STRING HERE';
// Create the Azure IoT Hub Client, which is the local instance of the connected device
var client = new device.Client(connectionString, new device.Https());

// For this simulation, create an Array of five simulated devices
var sensors = new Array();
createSimulatedSensors();

// Use setInterval to send the data from each of the five simulated device
// in 10-second intervals (i.e. five device messages every 10 seconds,
// which is 30 messages per minute, or 43,200 messages per day).
// This is simulating five independent devices sending messages.
// An alternative would be to collect the data from five devices
// in a field gateway and aggregate the data into a single message.
// This would reduce the message count.
setInterval(function(){
  // Set up valiables used for the simulation
  var sensor;
  // Iterate through each of the five devices to gather the device data
  for(var i=0; i< sensors.length; i++) {
    sensor = updateSensor(sensors[i]);
    
    // Create a new message using random values based on the last known values
    var payload = JSON.stringify({
        deviceId: sensor.deviceId,
        location: sensor.location,
        celsius: sensor.celsius,
        fahrenheit: sensor.fahrenheit,
        relativeHumidity: sensor.relativeHumidity,
        pressure: sensor.pressure,
        feet: sensor.altitude_f,
        meters: sensor.altitude_f,
      });
      
      // Create the message based on the payload JSON
      var message = new device.Message(payload);
      // For debugging purposes, write out the message payload to the console
      console.log("Sending message: " + message.getData());
      // Send the message to Azure IoT Hub
      client.sendEvent(message, printResultFor('send'));
  }
}, 10000);

// Helper function to print results in the console
function printResultFor(op) {
  return function printResult(err, res) {
    if (err) console.log(op + ' error: ' + err.toString());
    if (res && (res.statusCode !== 204)) console.log(op + ' status: ' + res.statusCode + ' ' + res.statusMessage);
  };
}


function createSimulatedSensors(){
  sensors.push({"deviceId":"MyDevice01","location":"kitchen","fahrenheit":74,"celsius":23.3,"relativeHumidity":38.124603271484375,"pressure":100.9900,"altitude_f":198.6958725,"altitude_m":60.5625});
  sensors.push({"deviceId":"MyDevice02","location":"living-room","fahrenheit":72,"celsius":22.2,"relativeHumidity":38.124603271484375,"pressure":100.9900,"altitude_f":198.6958725,"altitude_m":60.5625});
  sensors.push({"deviceId":"MyDevice03","location":"bedroom1","fahrenheit":71,"celsius":21.6,"relativeHumidity":38.124603271484375,"pressure":100.9900,"altitude_f":198.6958725,"altitude_m":60.5625});
  sensors.push({"deviceId":"MyDevice04","location":"front-porch","fahrenheit":61,"celsius":16.6,"relativeHumidity":38.124603271484375,"pressure":100.9900,"altitude_f":198.6958725,"altitude_m":60.5625});
  sensors.push({"deviceId":"MyDevice05","location":"garage","fahrenheit":69,"celsius":20.5,"relativeHumidity":38.124603271484375,"pressure":100.9900,"altitude_f":198.6958725,"altitude_m":60.5625});
}

function updateSensor(sensor){
  var newSensor = sensor;
  newSensor.celsius = randomXToY(sensor.celsius, 0.2);
  newSensor.fahrenheit = (newSensor.celsius * 9/5) + 32;
  newSensor.relativeHumidity = randomXToY(sensor.relativeHumidity, 0.2);
  newSensor.pressure = randomXToY(sensor.pressure, 1);
  newSensor.altitude_f = randomXToY(sensor.altitude_f, 0.1);
  newSensor.altitude_m = randomXToY(sensor.altitude_f, 0.03);
  
  return newSensor;
}

function randomXToY(val,deviation)
{
  val = parseFloat(val);
  deviation = parseFloat(deviation)
  var minVal = val - deviation;
  var maxVal = val + deviation;
  var randVal = minVal+(Math.random()*(maxVal-minVal));
  return randVal.toFixed(13);
}
