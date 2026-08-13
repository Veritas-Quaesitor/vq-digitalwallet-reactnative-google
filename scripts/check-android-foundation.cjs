'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const nativeRoot = path.join(root, 'android', 'src', 'main', 'java');
const files = [];
const visit = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(file);
    else if (entry.name.endsWith('.kt')) files.push(file);
  }
};
visit(nativeRoot);
const nativeSource = files
  .map((file) => fs.readFileSync(file, 'utf8'))
  .join('\n');
const exampleSource = fs.readFileSync(
  path.join(root, 'example', 'src', 'App.tsx'),
  'utf8',
);
const exampleComponents = fs.readFileSync(
  path.join(root, 'example', 'src', 'components.tsx'),
  'utf8',
);
const exampleBackend = fs.readFileSync(
  path.join(root, 'example', 'src', 'backend.ts'),
  'utf8',
);
const debugManifest = fs.readFileSync(
  path.join(root, 'example', 'android', 'app', 'src', 'debug', 'AndroidManifest.xml'),
  'utf8',
);
const debugNetworkSecurity = fs.readFileSync(
  path.join(
    root,
    'example',
    'android',
    'app',
    'src',
    'debug',
    'res',
    'xml',
    'vq_test_network_security_config.xml',
  ),
  'utf8',
);
const clientSource = fs.readFileSync(
  path.join(root, 'src', 'google-pay', 'client.ts'),
  'utf8',
);
const requestBuilderSource = fs.readFileSync(
  path.join(root, 'src', 'google-pay', 'request-builder.ts'),
  'utf8',
);
const androidBuild = fs.readFileSync(
  path.join(root, 'android', 'build.gradle'),
  'utf8',
);
const packageManifest = JSON.parse(
  fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
);
const exampleMetroConfig = fs.readFileSync(
  path.join(root, 'example', 'metro.config.js'),
  'utf8',
);

assert.match(nativeSource, /GetPaymentDataResult/);
assert.match(nativeSource, /activityResultRegistry\.register/);
assert.match(nativeSource, /launcher\?\.unregister\(\)/);
assert.match(nativeSource, /PayButton\(context\)/);
assert.match(nativeSource, /ButtonOptions\.newBuilder\(\)/);
assert.match(nativeSource, /setAllowedPaymentMethods\(allowedPaymentMethods\)/);
assert.match(nativeSource, /setButtonTheme\(buttonTheme\)/);
assert.match(nativeSource, /setButtonType\(buttonType\)/);
assert.match(nativeSource, /setCornerRadius/);
assert.match(nativeSource, /ButtonConstants\.ButtonType\.CHECKOUT/);
assert.match(nativeSource, /ButtonConstants\.ButtonTheme\.LIGHT/);
assert.doesNotMatch(nativeSource, /AutoResolveHelper/);
assert.doesNotMatch(nativeSource, /@google\/react-native-make-payment/);
assert.match(nativeSource, /isReadyToPay\(request\)/);
assert.match(nativeSource, /loadPaymentData\(request\)/);
assert.match(nativeSource, /PaymentDataRequest\.fromJson\(requestJson\)/);
assert.match(nativeSource, /getJSONObject\("paymentMethodData"\)/);
assert.match(nativeSource, /getJSONObject\("tokenizationData"\)/);
assert.match(nativeSource, /getString\("token"\)/);
assert.match(nativeSource, /Base64\.NO_WRAP/);
assert.match(nativeSource, /StandardCharsets\.UTF_8/);
assert.match(nativeSource, /hasPendingPayment\(\)/);
assert.doesNotMatch(
  nativeSource,
  /(?:Log\.|println\(|SharedPreferences|OkHttp|HttpURLConnection)/,
);
assert.match(clientSource, /JSON\.stringify\(rawToken\)/);
assert.doesNotMatch(clientSource, /JSON\.parse\(rawToken\)/);
assert.doesNotMatch(requestBuilderSource, /softwareInfo/);
assert.doesNotMatch(requestBuilderSource, /DIRECT/);
assert.match(androidBuild, /VQ_GOOGLE_PAY_ENVIRONMENT/);
assert.match(androidBuild, /\["TEST", "PRODUCTION"\]/);
assert.match(nativeSource, /override fun getGooglePayEnvironment\(\)/);
assert.match(clientSource, /getGooglePayEnvironment/);
assert.match(androidBuild, /play-services-wallet:20\.0\.0/);
assert.equal(packageManifest.source, './src/index.ts');
assert.equal(packageManifest.exports['.'].source, './src/index.ts');
assert.doesNotMatch(exampleMetroConfig, /conditions:\s*\[\]/);
assert.match(
  fs.readFileSync(path.join(root, 'src', 'VqGooglePayButton.tsx'), 'utf8'),
  /key=\{nativeButtonKey\}/,
);
assert.match(nativeSource, /NativeVqGooglePaySpec/);
assert.match(nativeSource, /VqGooglePayButtonManagerDelegate/);
assert.match(nativeSource, /onAfterUpdateTransaction/);
assert.match(nativeSource, /view\.refreshButton\(\)/);
assert.match(nativeSource, /removeCallbacks\(rebuildButtonRunnable\)/);
assert.match(nativeSource, /post\(rebuildButtonRunnable\)/);
assert.match(nativeSource, /override fun requestLayout\(\)/);
assert.match(nativeSource, /View\.MeasureSpec\.EXACTLY/);
assert.match(nativeSource, /setOnClickListener/);
assert.match(nativeSource, /VqGooglePayPressEvent/);
assert.match(nativeSource, /getEventDispatcher\(reactContext\)/);
assert.match(nativeSource, /EVENT_NAME = "topGooglePayPress"/);
assert.match(nativeSource, /getExportedCustomDirectEventTypeConstants/);
assert.match(nativeSource, /"registrationName" to "onGooglePayPress"/);
assert.match(exampleComponents, /walletFrame:\s*\{[^}]*minHeight:\s*64/s);
assert.match(
  exampleComponents,
  /walletButton:\s*\{[^}]*maxWidth:\s*360[^}]*width:\s*'100%'/s,
);
assert.match(
  fs.readFileSync(
    path.join(
      root,
      'example',
      'android',
      'app',
      'src',
      'main',
      'java',
      'com',
      'vqdigitalwalletreactnativegoogle.example',
      'MainApplication.kt',
    ),
    'utf8',
  ),
  /useDevSupport = BuildConfig\.DEBUG/,
);
assert.match(exampleSource, /client=\{client\}/);
assert.match(exampleSource, /onPayment=/);
assert.match(exampleSource, /onError=/);
assert.match(exampleSource, /Clipboard\.setString\(paymentResult\.paymentToken\)/);
assert.match(exampleSource, /Clipboard\.setString\(''\)/);
assert.match(exampleSource, /label="Copy Base64 token"/);
assert.match(exampleSource, /label="Reset harness"/);
assert.match(exampleSource, /Harness reset to defaults/);
assert.match(exampleSource, /Valid changes are applied automatically/);
assert.doesNotMatch(exampleSource, /Apply configuration/);
assert.doesNotMatch(exampleSource, /Check availability/);
assert.doesNotMatch(exampleSource, /Mount Google Pay button/);
assert.doesNotMatch(exampleSource, /buttonType=/);
assert.doesNotMatch(exampleSource, /cornerRadius=/);
assert.doesNotMatch(exampleSource, /theme=/);
assert.doesNotMatch(exampleSource, /Programmatic payment/);
assert.doesNotMatch(exampleSource, /client\.pay\(/);
assert.match(exampleBackend, /url\.protocol !== 'https:'/);
assert.match(
  exampleBackend,
  /buildBackendRequestBody\([\s\S]*resolved\.environmentProfileId/,
);
assert.match(exampleBackend, /payment\.googlePayEnvironment/);
assert.match(exampleBackend, /\/v1\/environment-profiles/);
assert.match(exampleBackend, /MAX_BACKEND_RESPONSE_CHARACTERS = 16_384/);
assert.match(exampleBackend, /const body = await response\.text\(\)/);
assert.doesNotMatch(exampleBackend, /response\.json\(/);
assert.match(debugManifest, /android:networkSecurityConfig=/);
assert.match(debugNetworkSecurity, /<certificates src="user"/);
assert.match(debugNetworkSecurity, /cleartextTrafficPermitted="false"/);
assert.match(
  debugNetworkSecurity,
  /<domain includeSubdomains="false">localhost<\/domain>/,
);
assert.match(
  debugNetworkSecurity,
  /<domain includeSubdomains="false">10\.0\.2\.2<\/domain>/,
);

process.stdout.write(
  'Owned Google Pay bridge, opaque-token, PayButton, and lifecycle boundaries are present.\n',
);
