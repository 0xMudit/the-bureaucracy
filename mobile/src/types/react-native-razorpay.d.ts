declare module "react-native-razorpay" {
  export interface RazorpayOptions {
    key: string;
    /** Paise. The server sends the order's amount; never recompute it here. */
    amount: number | string;
    currency: string;
    name?: string;
    description?: string;
    order_id: string;
    image?: string;
    prefill?: { name?: string; email?: string; contact?: string };
    notes?: Record<string, string>;
    theme?: { color?: string; backdrop_color?: string };
    retry?: { enabled: boolean; max_count: number };
    modal?: { backdropclose?: boolean; escape?: boolean; handleback?: boolean };
    remember_customer?: boolean;
  }

  export interface RazorpaySuccess {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }

  export interface RazorpayFailure {
    code: number;
    description: string;
  }

  const RazorpayCheckout: {
    open(options: RazorpayOptions): Promise<RazorpaySuccess>;
    onExternalWalletSelection(callback: (wallet: unknown) => void): void;
  };

  export default RazorpayCheckout;
}
