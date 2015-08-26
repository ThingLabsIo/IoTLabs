var five = require("johnny-five");
var spark = require("spark-io");
// Define the Johnny Five board as your Particle Photon
var board = new five.Board({
  io: new spark({
    token: process.env.PARTICLE_KEY || 'YOUR API KEY HERE',
    deviceId: 'D7P001'
  })
});

board.on("ready", function() {
  var temperature = new five.Temperature({
    controller: "MPL115A2"
  });

  temperature.on("data", function() {
    console.log("temperature");
    console.log("  celsius      : ", this.celsius);
    console.log("  fahrenheit   : ", this.fahrenheit);
    console.log("  kelvin       : ", this.kelvin);
    console.log("--------------------------------------");
  });
});