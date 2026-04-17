export type ToastType = 'success' | 'error' | 'info';

export interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

export interface ToastMessage extends ToastOptions {
  id: string;
}

type Subscriber = (toast: ToastMessage) => void;

class ToastManager {
  private subscribers: Subscriber[] = [];

  subscribe(callback: Subscriber) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  show(options: ToastOptions | string, type: ToastType = 'info') {
    const id = Math.random().toString(36).substring(2, 9);
    
    let message = '';
    let duration = 3000;
    
    if (typeof options === 'string') {
      message = options;
    } else {
      message = options.message;
      type = options.type || type;
      duration = options.duration || duration;
    }

    const toastMessage: ToastMessage = { id, message, type, duration };
    this.subscribers.forEach(cb => cb(toastMessage));
  }

  success(message: string, duration?: number) {
    this.show({ message, type: 'success', duration });
  }

  error(message: string, duration?: number) {
    this.show({ message, type: 'error', duration });
  }

  info(message: string, duration?: number) {
    this.show({ message, type: 'info', duration });
  }
}

export const toast = new ToastManager();
