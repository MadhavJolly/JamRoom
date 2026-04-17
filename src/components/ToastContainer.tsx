import React, { useState, useEffect } from 'react';
import { toast, ToastMessage } from '../utils/toast';
import { Check, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsubscribe = toast.subscribe((newToast) => {
      setToasts(prev => [...prev, newToast]);
      
      if (newToast.duration !== Infinity) {
        setTimeout(() => {
          removeToast(newToast.id);
        }, newToast.duration || 3000);
      }
    });

    return unsubscribe;
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full p-4 pointer-events-none">
      {toasts.map((t) => (
        <div 
          key={t.id} 
          className="bg-[#111111] border border-[#222222] text-[#E4E3E0] rounded-xl p-4 flex items-start gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.5)] animate-in slide-in-from-bottom-5 fade-in duration-300 pointer-events-auto"
        >
          {t.type === 'success' && <Check className="text-green-500 flex-shrink-0 mt-0.5" size={18} />}
          {t.type === 'error' && <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />}
          {t.type === 'info' && <Info className="text-[#5D00FF] flex-shrink-0 mt-0.5" size={18} />}
          
          <div className="flex-1 text-sm font-medium pr-2">
            {t.message}
          </div>
          
          <button 
            onClick={() => removeToast(t.id)}
            className="text-[#666666] hover:text-[#E4E3E0] transition-colors flex-shrink-0 focus:outline-none"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};
