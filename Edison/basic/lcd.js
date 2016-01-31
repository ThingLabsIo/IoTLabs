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

// How to write to the Seeed LCD Screen
// NOTE: You *MUST* plug the LCD into an I2C slot or this will not work!
var five = require("johnny-five");
var Edison = require("edison-io");
var board = new five.Board({
  io: new Edison()
});

board.on("ready", function() {
  var lcd = new five.LCD({
    controller: "JHD1313M1"
  });
  
  var light = new five.Sensor("A1");

  lcd.useChar("heart");
  lcd.cursor(0, 0).print("I :heart: Johnny-Five");
  
  // Set scaling of the Rotary angle
  // sensor's output to 0-255 (8-bit)
  // range. Set the LCD's background
  // color to a RGB value between
  // Red and Violet based on the
  // value of the rotary sensor.
  light.scale(0, 255).on("change", function() {
    var r = linear(0xFF, 0x4B, this.value, 0xFF);
    var g = linear(0x00, 0x00, this.value, 0xFF);
    var b = linear(0x00, 0x82, this.value, 0xFF);

    lcd.bgColor(r, g, b);
  });
});

// [Linear Interpolation](https://en.wikipedia.org/wiki/Linear_interpolation)
function linear(start, end, step, steps) {
  return (end - start) * step / steps + start;
}