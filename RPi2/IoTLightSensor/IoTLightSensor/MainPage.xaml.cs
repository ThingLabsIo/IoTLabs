using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;
using Windows.Devices.Gpio;
using Windows.Devices.Spi;
using Windows.Devices.Enumeration;
using System.Threading;
using System.Threading.Tasks;
using System.Text;
using Microsoft.Azure.Devices.Client;

// The Blank Page item template is documented at http://go.microsoft.com/fwlink/?LinkId=402352&clcid=0x409

namespace IoTLightSensor
{
    /// <summary>
    /// An empty page that can be used on its own or navigated to within a Frame.
    /// </summary>
    public sealed partial class MainPage : Page
    {
        /* Important! Change this to either AdcDevice.MCP3002, AdcDevice.MCP3208 or AdcDevice.MCP3008 depending on which ADC you chose     */
        private AdcDevice ADC_DEVICE = AdcDevice.MCP3002;

        enum AdcDevice { NONE, MCP3002, MCP3208, MCP3008 };

        // Use the device specific connection string here
        private const string IOT_HUB_CONN_STRING = "YOUR CONNECTION STRING HERE";
        // Use the name of your Azure IoT device here - this should be the same as the name in the connections string
        private const string IOT_HUB_DEVICE = "YOUR DEVICE NAME HERE";
        // Provide a short description of the location of the device, such as 'Home Office' or 'Garage'
        private const string IOT_HUB_DEVICE_LOCATION = "YOUR LOCATION HERE";

        // Line 0 maps to physical pin 24 on the RPi2
        private const Int32 SPI_CHIP_SELECT_LINE = 0;
        private const string SPI_CONTROLLER_NAME = "SPI0";

        // 01101000 channel configuration data for the MCP3002
        private const byte MCP3002_CONFIG = 0x68;
        // 00000110 channel configuration data for the MCP3208
        private const byte MCP3208_CONFIG = 0x06;
        // 00001000 channel configuration data for the MCP3008
        private const byte MCP3008_CONFIG = 0x08;

        private const int RED_LED_PIN = 12;

        private SolidColorBrush redFill = new SolidColorBrush(Windows.UI.Colors.Red);
        private SolidColorBrush grayFill = new SolidColorBrush(Windows.UI.Colors.LightGray);

        private DeviceClient deviceClient;
        private GpioPin redLedPin;
        private SpiDevice spiAdc;
        private int adcResolution;
        private int adcValue;

        private Timer readSensorTimer;
        private Timer sendMessageTimer;
        public MainPage()
        {
            this.InitializeComponent();

            // Register the Unloaded event to clean up on exit
            Unloaded += MainPage_Unloaded;

            // Initialize GPIO and SPI
            InitAllAsync();
        }

        private async Task InitAllAsync()
        {
            try
            {
                await InitGpioAsync();
                await InitSpiAsync();
            }
            catch (Exception ex)
            {
                StatusText.Text = ex.Message;
                return;
            }

            // Read sensors every 100ms and refresh the UI
            readSensorTimer = new Timer(this.SensorTimer_Tick, null, 0, 100);

            // Instantiate the Azure device client
            deviceClient = DeviceClient.CreateFromConnectionString(IOT_HUB_CONN_STRING);

            // Send messages to Azure IoT Hub every one-second
            sendMessageTimer = new Timer(this.MessageTimer_Tick, null, 0, 2000);

            StatusText.Text = "Status: Running";
        }

        private async void MessageTimer_Tick(object state)
        {
            await SendMessageToIoTHubAsync(adcValue);
        }

        private async Task SendMessageToIoTHubAsync(int darkness)
        {
            try
            {
                var payload = "{\"deviceId\": \"" +
                    IOT_HUB_DEVICE +
                    "\", \"location\": \"" +
                    IOT_HUB_DEVICE_LOCATION +
                    "\", \"messurementValue\": " +
                    darkness +
                    ", \"messurementType\": \"darkness\", \"localTimestamp\": \"" +
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

            // Turn on LED if potentiometer is rotated more than halfway
            switch (ADC_DEVICE)
            {
                case AdcDevice.MCP3208:
                    adcResolution = 4096;
                    break;
                case AdcDevice.MCP3008:
                    adcResolution = 1024;
                    break;
                case AdcDevice.MCP3002:
                    adcResolution = 1024;
                    break;
            }

            if (adcValue > adcResolution * 0.5)
            {
                redLedPin.Write(GpioPinValue.High);
                fillColor = redFill;
            }
            else
            {
                redLedPin.Write(GpioPinValue.Low);
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

            switch (ADC_DEVICE)
            {
                case AdcDevice.MCP3002:
                    writeBuffer[0] = MCP3002_CONFIG;
                    break;
                case AdcDevice.MCP3008:
                    writeBuffer[0] = MCP3008_CONFIG;
                    break;
                case AdcDevice.MCP3208:
                    writeBuffer[0] = MCP3208_CONFIG;
                    break;
            }

            // Read data from the ADC
            spiAdc.TransferFullDuplex(writeBuffer, readBuffer);
            adcValue = convertToInt(readBuffer);

            // UI updates must be invoked on the UI thread
            var task = this.Dispatcher.RunAsync(Windows.UI.Core.CoreDispatcherPriority.Normal, () =>
            {
                textPlaceHolder.Text = adcValue.ToString();
                IndicatorBar.Width = Map(adcValue, 0, adcResolution - 1, 0, 300);
            });
        }

        private double Map(int val, int inMin, int inMax, int outMin, int outMax)
        {
            return Math.Round((double)((val - inMin) * (outMax - outMin) / (inMax - inMin) + outMin));
        }

        private int convertToInt(byte[] data)
        {
            int result = 0;
            switch (ADC_DEVICE)
            {
                case AdcDevice.MCP3002:
                    result = data[0] & 0x03;
                    result <<= 8;
                    result += data[1];
                    break;
                case AdcDevice.MCP3008:
                    result = data[1] & 0x03;
                    result <<= 8;
                    result += data[2];
                    break;
                case AdcDevice.MCP3208:
                    result = data[1] & 0x0F;
                    result <<= 8;
                    result += data[2];
                    break;
            }
            return result;
        }

        private async Task InitSpiAsync()
        {
            try
            {
                var settings = new SpiConnectionSettings(SPI_CHIP_SELECT_LINE);
                // 3.6MHz is the rated speed of the MCP3008 at 5v
                settings.ClockFrequency = 3600000;
                // The ADC expects idle-low clock polarity so we use Mode0
                settings.Mode = SpiMode.Mode0;
                // Get a selector string that will return all SPI controllers on the system
                string spiAqs = SpiDevice.GetDeviceSelector(SPI_CONTROLLER_NAME);
                // Find the SPI bus controller devices with our selector string 
                var deviceInfo = await DeviceInformation.FindAllAsync(spiAqs);
                // Create an SpiDevice with our bus controller and SPI settings
                spiAdc = await SpiDevice.FromIdAsync(deviceInfo[0].Id, settings);
            }
            catch (Exception ex)
            {
                throw new Exception("SPI initialization failed.", ex);
            }
        }

        private async Task InitGpioAsync()
        {
            var gpio = await GpioController.GetDefaultAsync();

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
            if (spiAdc != null)
            {
                spiAdc.Dispose();
            }

            if (redLedPin != null)
            {
                redLedPin.Dispose();
            }
        }
    }
}