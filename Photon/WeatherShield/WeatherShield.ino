/*
Particle Photon with SparkFun WeatherShield Example App
By: Doug Seven
Licence: MIT

This example borrows heavily from the SparkFun example for the
Particle Weather Shield by Joel Bartlett @ SparkFun Electronics
and the project on Hackster.io by Paul Decalro @ Microsoft.

This example compensates for the inoperable snprintf(%f) in the
Photon firmware v0.4.1 and later.
*/
// This #include statement was automatically added by the Particle IDE.
#include "HTU21D.h"
// This #include statement was automatically added by the Particle IDE.
#include "SparkFun_MPL3115A2.h"

float humidity = 0;
float tempf = 0;
float pascals = 0;
float altf = 0;
float baroTemp = 0;

int count = 0;

String Org = "ThingLabs.io";
String Disp = "Office";
String Locn = "Sammamish, WA";

HTU21D htu = HTU21D();
MPL3115A2 baro = MPL3115A2();

void setup()
{
	Serial.begin(9600);

	Serial.println("HTU21D test");

	while(! htu.begin()){
	    Serial.println("HTU21D not found");
	    delay(1000);
	}

	Serial.println("HTU21D OK");
	delay(1000);

	while(! baro.begin()){
	    Serial.println("MPL3115A2 not found");
	    delay(1000);
	}

	   baro.setModeAltimeter();
     baro.setOversampleRate(7);
     baro.enableEventFlags();
}

void loop()
{
    //Get readings from all sensors
    calcWeather();
    //Rather than use a delay, keeping track of a counter allows the photon to
    //still take readings and do work in between printing out data.
    count++;
    //alter this number to change the amount of time between each reading
    if(count == 10)//prints roughly every 10 seconds for every 5 counts
    {
        publishTemp();
    }

    if(count == 20)//prints roughly every 10 seconds for every 5 counts
    {
        publishHumidity();
        count = 0;
    }
}

void publishTemp()
{
    //Take the temp reading from each sensor and average them.
    String f((tempf+baroTemp)/2, 2);

    Particle.publish("ThingLabs",
        "{ \"s\":\"wthr\", \"u\":\"F\",\"l\":\"" +
        Locn +
        "\",\"m\":\"Temperature\",\"o\":\"" +
        Org +
        "\",\"v\": " +
        f +
        ",\"d\":\"" +
        Disp +
        "\" }"
    );
}

void publishHumidity()
{
    //Convert the humidity to a string
    String h(humidity, 2);

    Particle.publish("ThingLabs",
        "{ \"s\":\"wthr\", \"u\":\"F\",\"l\":\"" +
        Locn +
        "\",\"m\":\"Humidity\",\"o\":\"" +
        Org +
        "\",\"v\": " +
        h +
        ",\"d\":\"" +
        Disp +
        "\" }"
    );
}

void getTempHumidity()
{
    float temp = 0;

    temp = htu.readTemperature();
    tempf = (temp * 9)/5 + 32;

    humidity = htu.readHumidity();
}

void getBaro()
{
  baroTemp = baro.readTempF();//get the temperature in F

  pascals = baro.readPressure();//get pressure in Pascals

  altf = baro.readAltitudeFt();//get altitude in feet
}

void calcWeather()
{
    getTempHumidity();
    getBaro();
}
