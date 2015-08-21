int LEDPIN = D7;

void setup()
{
  pinMode(LEDPIN, OUTPUT);

  digitalWrite(LEDPIN, LOW);
}

void loop()
{
  digitalWrite(LEDPIN, HIGH);
  delay(2000);
  digitalWrite(LEDPIN, LOW);
  delay(2000);
}
