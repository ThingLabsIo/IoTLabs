using System;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Media;

using Windows.Devices.Gpio;

namespace Lab01
{
    /// <summary>
    /// In this Raspberry Pi 2 / WIndows IoT Core sample, 
    /// the app sends voltage out over GPIO pin 5 to create a blonking LED.
    /// This is the 'Hello, World!' of the IoT space.
    /// This code is based on the Blinky sample at 
    /// http://ms-iot.github.io/content/en-US/win10/samples/Blinky.htm
    /// </summary>
    public sealed partial class MainPage : Page
    {
        // Define the physical pin connected to the LED.
        private const int LED_PIN = 5;
        // Deifne a valiable to represent the pin as an object.
        private GpioPin pin;
        // Define a valiable to hold the value of the pin (HIGH or LOW).
        private GpioPinValue pinValue;
        // Define a time used to control the frequency of events.
        private DispatcherTimer timer;
        // Define a color bruch for the on screen representation of the LED and initialize it to Red.
        private SolidColorBrush brush = new SolidColorBrush(Windows.UI.Colors.Red);

        public MainPage()
        {
            this.InitializeComponent();
            // Create an instance of a Timer that will raise an event every 500ms
            timer = new DispatcherTimer();
            timer.Interval = TimeSpan.FromMilliseconds(500);
            timer.Tick += Timer_Tick;
            // Initilize the GPIO bus
            InitGpio();
            // As long as the pin object is not null, proceed with the timer.
            if (pin != null)
            {
                timer.Start();
            }
        }

        private void InitGpio()
        {
            // Get the default GPIO controller
            var gpio = GpioController.GetDefault();
            // If the default GPIO controller is not present, then the device 
            // running this app isn't capable of GPIO operations.
            if (gpio == null)
            {
                pin = null;
                GpioStatus.Text = "There is no GPIO controller on this device.";
                return;
            }
            // Open the GPIO pin channel
            pin = gpio.OpenPin(LED_PIN);
            // Define the pin as an OUTPUT pin
            pin.SetDriveMode(GpioPinDriveMode.Output);
            // Define the initial state as LOW (off)
            pinValue = GpioPinValue.Low;
            // Write the state to to pin
            pin.Write(pinValue);
            // Update the on screen text to indicate that GPIO is ready
            GpioStatus.Text = "GPIO pin initialized correctly.";
        }

        private void Timer_Tick(object sender, object e)
        {
            // This Timer event will be raised on each timer interval (defined above)
            
            if (pinValue == GpioPinValue.Low)
            {
                // If the current state of the pin is LOW (off), then set it to HIGH (on)
                // and update the on screen UI to represent the LED in the on state
                pinValue = GpioPinValue.High;
                brush = new SolidColorBrush(Windows.UI.Colors.Red);
            }
            else
            {
                // If the current state of the pin is HIGH (on), then set it to LOW (off)
                // and update the on screen UI to represent the LED in the off state
                pinValue = GpioPinValue.Low;
                brush = new SolidColorBrush(Windows.UI.Colors.LightGray); ;
            }
            // Write the state to to pin
            pin.Write(pinValue);
            // Update the on screen UI
            LedGraphic.Fill = brush;
        }
    }
}
