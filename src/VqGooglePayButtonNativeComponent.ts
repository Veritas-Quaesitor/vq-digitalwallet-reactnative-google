import {
  codegenNativeComponent,
  type CodegenTypes,
  type ViewProps,
} from 'react-native';

export interface NativeProps extends ViewProps {
  readonly allowedPaymentMethods: string;
  readonly buttonTheme?: CodegenTypes.WithDefault<'dark' | 'light', 'dark'>;
  readonly buttonType?: CodegenTypes.WithDefault<
    'buy' | 'checkout' | 'order' | 'pay' | 'plain',
    'pay'
  >;
  readonly cornerRadius?: CodegenTypes.WithDefault<CodegenTypes.Int32, 100>;
  readonly onGooglePayPress?: CodegenTypes.DirectEventHandler<null>;
}

export default codegenNativeComponent<NativeProps>('VqGooglePayButton');
