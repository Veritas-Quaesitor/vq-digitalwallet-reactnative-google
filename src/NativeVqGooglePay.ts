import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  checkAvailability(requestJson: string): Promise<boolean>;
  encodePaymentToken(jsonString: string): string;
  getFoundationStatus(): string;
  getGooglePayEnvironment(): string;
  requestPayment(requestJson: string): Promise<string>;
}

export default TurboModuleRegistry.get<Spec>('VqGooglePay');
