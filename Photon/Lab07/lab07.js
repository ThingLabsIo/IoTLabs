// Define the Jonny Five and Spark-IO variables
var five = require ("johnny-five"),
    board, photoresistor;
var Spark = require("spark-io");
var https = require('https');
var crypto = require('crypto');

var namespace = process.env.EH_NAMESPACE || 'YOUR NAMESPACE NAME HERE';
var hubName = process.env.EH_HOSTNAME || 'YOUR EVENT HUB NAME HERE';
var deviceName = process.env.PARTICLE_DEVICE || 'YOUR DEVICE ID OR ALIAS HERE';

var publisherUri = 'https://' + namespace + '.servicebus.windows.net' + '/' + hubName + '/publishers/' + deviceName + '/messages';

var keyName = 'send';
var keyValue = process.env.EH_KEY || 'YOUR EVENT HUB KEY HERE';

// Define the Johnny Five board as your Particle Photon
var board = new five.Board({
  io: new Spark({
    token: process.env.PARTICLE_KEY || 'YOUR API KEY HERE',
    deviceId: process.env.PARTICLE_DEVICE || 'YOUR DEVICE ID OR ALIAS HERE'
  })
});

// The board.on() executes the anonymous function when the 
// Partile Photon reports back that it is initialized and ready.
board.on("ready", function(){
  console.log("Board connected...");
  // Create the SAS token used for Event Hubs
  var sasToken = createSasToken(publisherUri, keyName, keyValue);
  
  // Create a new 'photoresistor' hardware instance.
  photoresistor = new five.Sensor({
    pin: "A0",  // Analog pin 0
    freq: 1000  // Collect data once per second
  });
  
  // Inject the 'sensor' hardware into the Repl instance's context;
  // Allows direct command line access
  board.repl.inject({
    pot: photoresistor
  });
  
  // Define the callback function for the photoresistor reading
  // The freq value used when the photoresistor was defined
  // determines how often this is invoked, thus controlling
  // the frequency of Nitrogen messages.
  photoresistor.on('data', function() {
    // Capture the ambient light level from the photoresistor
    var lightLevel = this.value;
    
    var payload = '{\"_lightLevel\": ' + lightLevel + '}';
    
    console.log(payload);
    
    // Define the metadata associated with the message 
    // being sent to Event Hubs
    var options = {
      hostname: namespace + '.servicebus.windows.net',
      port: 443,
      path: '/' + hubName + '/publishers/' + deviceName + '/messages',
      method: 'POST',
      headers: {
        'Authorization': sasToken,
        'Content-Length': payload.length,
        'Content-Type': 'application/atom+xml;type=entry;charset=utf-8'
      }
    };
    
    // Create an HTTP request and a callback for error conditions
    var req = https.request(options);
    req.on('error', function(e) {
      console.error(e);
    });
    
    // Write the message paylod to the request stream
    req.write(payload);
    // End/close the request
    req.end();
  });
});

// Helper function to create the SAS token needed to send messages to Azure Event Hubs
function createSasToken(uri, keyName, keyV)
{
    // Token expires in 24 hours
    var expiry = Math.floor(new Date().getTime()/1000+3600*24);

    var string_to_sign = encodeURIComponent(uri) + '\n' + expiry;
    var hmac = crypto.createHmac('sha256', keyValue);
    hmac.update(string_to_sign);
    var signature = hmac.digest('base64');
    var token = 'SharedAccessSignature sr=' + encodeURIComponent(uri) + '&sig=' + encodeURIComponent(signature) + '&se=' + expiry + '&skn=' + keyName;

    return token;
}
