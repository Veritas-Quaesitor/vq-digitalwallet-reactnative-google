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

process.stdout.write(
  'Owned Google Pay bridge, opaque-token, PayButton, and lifecycle boundaries are present.\n',
);
