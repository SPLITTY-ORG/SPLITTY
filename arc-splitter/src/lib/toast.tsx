import toast from 'react-hot-toast';
import { CheckCircle, XCircle, LoaderCircle, Info } from 'lucide-react';

export const toastSuccess = (message: string) => {
  toast.success(() => (
    <div className="flex items-center gap-2">
      <CheckCircle size={16} className="text-green-400" />
      <span>{message}</span>
    </div>
  ));
};

export const toastError = (message: string) => {
  toast.error(() => (
    <div className="flex items-center gap-2">
      <XCircle size={16} className="text-[#C4553D]" />
      <span>{message}</span>
    </div>
  ));
};

export const toastLoading = (message: string) => {
  return toast.loading(() => (
    <div className="flex items-center gap-2">
      <LoaderCircle size={16} className="animate-spin text-[#F2B134]" />
      <span>{message}</span>
    </div>
  ));
};

export const toastInfo = (message: string) => {
  toast(() => (
    <div className="flex items-center gap-2">
      <Info size={16} className="text-[#F2B134]" />
      <span>{message}</span>
    </div>
  ));
};
