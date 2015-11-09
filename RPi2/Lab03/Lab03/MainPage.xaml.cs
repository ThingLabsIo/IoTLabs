using System;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Media;

using Windows.Devices.Gpio;
using Windows.Devices.Spi;
using Windows.Devices.Enumeration;
using System.Threading;
using System.Threading.Tasks;
using System.Text;
using Microsoft.Azure.Devices.Client;

// The Blank Page item template is documented at http://go.microsoft.com/fwlink/?LinkId=402352&clcid=0x409

namespace Lab03
{
    /// <summary>
    /// An empty page that can be used on its own or navigated to within a Frame.
    /// </summary>
    public sealed partial class MainPage : Page
    {
        // Use the device specific connection string here
        private const string IOT_HUB_CONN_STRING = "YOUR DEVICE SPECIFIC CONNECTION STRING GOES HERE";
        // Use the name of your Azure IoT device here - this should be the same as the name in the connections string
        private const string IOT_HUB_DEVICE = "YOUR DEVICE NAME GOES HERE";
        // Provide a short description of the location of the device, such as 'Home Office' or 'Garage'
        private const string IOT_HUB_DEVICE_LOCATION = "YOUR DEVICE LOCATION GOES HERE";

        private const Int32 SPI_CHIP_SELECT_LINE = 0; // Line 0 maps to physical pin 24 on the RPi2
        private const string SPI_CONTROLLER_NAME = "SPI0";
        private const int ADC_RESOLUTION = 4096; // Use 1024 for the MCP3002
        private const int RED_LED_PIN = 12;

        private SolidColorBrush redFill = new SolidColorBrush(Windows.UI.Colors.Red);
        private SolidColorBrush grayFill = new SolidColorBrush(Windows.UI.Colors.LightGray);

        DeviceClient deviceClient;
        private GpioPin redLedPin;
        private SpiDevice SpiAdc;
        private Timer readSensorTimer;
        private Timer sendMessageTimer;
        private int adcValue;

        public MainPage()
        {
            this.InitializeComponent();
            
            // Register the Unloaded event to clean up on exit
            Unloaded += MainPage_Unloaded;
            
            // Initialize GPIO and SPI
            InitAll();
        }

        private async void InitAll()
        {
            try
            {
                InitGpio();
                await InitSpi();
            }
            catch (Exception ex)
            {
                StatusText.Text = ex.Message;
                return;
            }
            
            // Read sensors ever 25ms and refresh the UI
            readSensorTimer = new Timer(this.SensorTimer_Tick, null, 0, 25);
            
            // Instantiate the Azure device client
            deviceClient = DeviceClient.CreateFromConnectionString(IOT_HUB_CONN_STRING);
            
            // Send messages to Azure IoT Hub every one-second
            sendMessageTimer = new Timer(this.MessageTimer_Tick, null, 0, 1000);
            
            StatusText.Text = "Status: Running";
        }
        
        private void MessageTimer_Tick(object state)
        {
            SendMessageToIoTHub(adcValue);
        }

        private async Task SendMessageToIoTHub(int darkness)
        {
            try
            {
                 var payload = "{\"deviceId\": \"" +
                    IOT_HUB_DEVICE + 
                    "\", \"location\": \"" +
                    IOT_HUB_DEVICE_LOCATION +
                    "\", \"data\": \"darkness:" +
                    adcValue + 
                    "\", \"localTimestamp\": \"" +
                    DateTime.Now.ToLocalTime().ToString() + 
                    "\"}";

                // UI updates must be invoked on the UI thread
                var task = this.Dispatcher.RunAsync(Windows.UI.Core.CoreDispatcherPriority.Normal, () =>
                {
                    MessageLog.Text = "Sending message: " + payload + "\n" + MessageLog.Text;
                });

                var msg = new Message(Encoding.UTF8.GetBytes(payload));

                await deviceClient.SendEventAsync(msg);
            }
            catch (Exception ex)
            {
                // UI updates must be invoked on the UI thread
                var task = this.Dispatcher.RunAsync(Windows.UI.Core.CoreDispatcherPriority.Normal, () =>
                {
                    MessageLog.Text = "Sending message: " + ex.Message + "\n" + MessageLog.Text;
                });
            }
        }

        private void SensorTimer_Tick(object state)
        {
            ReadAdc();
            LightLed();
        }

        private void LightLed()
        {
            SolidColorBrush fillColor = grayFill;

            // Tunr on LED if potentiometer is rotated more than halfway
            if (adcValue > ADC_RESOLUTION / 2)
            {
                redLedPin.Write(GpioPinValue.Low);
                fillColor = redFill;
            }
            else
            {
                redLedPin.Write(GpioPinValue.High);
                fillColor = grayFill;
            }

            // UI updates must be invoked on the UI thread
            var task = this.Dispatcher.RunAsync(Windows.UI.Core.CoreDispatcherPriority.Normal, () =>
            {
                IndicatorBar.Fill = fillColor;
            });
        }

        private void ReadAdc()
        {
            // Create a buffer to hold the read data
            byte[] readBuffer = new byte[3];
            byte[] writeBuffer = new byte[3] { 0x00, 0x00, 0x00 };
            
            // Set the SPI configuration data in the first position
            // MCP3208 or MCP3008 use 0x06 - 00000110 channel configuration data
            // MCP3002 use 0x68 - 01101000 channel configuration data
            writeBuffer[0] = 0x06;

            // Read data from the ADC
            SpiAdc.TransferFullDuplex(writeBuffer, readBuffer);
            adcValue = convertToInt(readBuffer);

            // UI updates must be invoked on the UI thread
            var task = this.Dispatcher.RunAsync(Windows.UI.Core.CoreDispatcherPriority.Normal, () =>
            {
                textPlaceHolder.Text = adcValue.ToString();
                IndicatorBar.Width = Map(adcValue, 0, ADC_RESOLUTION-1, 0, 300);
            });
        }

        private double Map(int val, int inMin, int inMax, int outMin, int outMax)
        {
            return Math.Round((double)((val - inMin) * (outMax - outMin) / (inMax - inMin) + outMin));
        }

        private int convertToInt(byte[] data)
        {
            int result = data[1] & 0x0F;
            // Shift the bits left
            result <<= 8;
            // Add the next set of bits
            result += data[2];
            
            /*
            // For the MCP3002 use:
            result = data[0] & 0x03;
            // Shift the bits left
            result <<= 8;
            // Add the next set of bits
            result += data[1];
            */
            
            return result;
        }

        private async Task InitSpi()
        {
            try
            {
                var settings = new SpiConnectionSettings(SPI_CHIP_SELECT_LINE);
                settings.ClockFrequency = 500000; // 0.5 MHz clock rate
                settings.Mode = SpiMode.Mode0; // The ADC expects idle-low clock polarity so we use Mode0

                string spiAqs = SpiDevice.GetDeviceSelector(SPI_CONTROLLER_NAME);
                var deviceInfo = await DeviceInformation.FindAllAsync(spiAqs);
                SpiAdc = await SpiDevice.FromIdAsync(deviceInfo[0].Id, settings);

            }
            catch (Exception ex)
            {
                throw new Exception("SPI initialization failed.", ex);
            }
        }

        private void InitGpio()
        {
            var gpio = GpioController.GetDefault();

            if (gpio == null)
            {
                throw new Exception("There is no GPIO controller on this device.");
            }

            redLedPin = gpio.OpenPin(RED_LED_PIN);
            redLedPin.Write(GpioPinValue.High);
            redLedPin.SetDriveMode(GpioPinDriveMode.Output);
        }

        private void MainPage_Unloaded(object sender, RoutedEventArgs e)
        {
            if (SpiAdc != null)
            {
                SpiAdc.Dispose();
            }

            if (redLedPin != null)
            {
                redLedPin.Dispose();
            }

        }
    }

}
