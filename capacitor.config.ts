import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pointmax.velocity',
  appName: 'PointMax Velocity',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
    // For development, you can point to localhost:
    // url: 'http://localhost:3000',
    // cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#02040a', // Your dark-900 color
      showSpinner: false,
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#02040a',
    },
  },
};

export default config;
