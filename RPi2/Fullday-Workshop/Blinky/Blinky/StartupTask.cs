using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Net.Http;
using Windows.ApplicationModel.Background;

using GrovePi;
using GrovePi.Sensors;
using Windows.System.Threading;

namespace Blinky
{
    public sealed class StartupTask : IBackgroundTask
    {
        ThreadPoolTimer timer;
        BackgroundTaskDeferral deferral;
        ILed led;

        public void Run(IBackgroundTaskInstance taskInstance)
        {
            deferral = taskInstance.GetDeferral();

            // Connect the LED to digital port 4
            led = DeviceFactory.Build.Led(Pin.DigitalPin4);

            // Create a timer that will 'tick' every one-second
            timer = ThreadPoolTimer.CreatePeriodicTimer(this.Timer_Tick, TimeSpan.FromSeconds(1));
        }

        private void Timer_Tick(ThreadPoolTimer timer)
        {
            if (led.CurrentState == SensorStatus.Off)
            {
                led.ChangeState(SensorStatus.On);
            }
            else {
                led.ChangeState(SensorStatus.Off);
            }
        }
    }
}
