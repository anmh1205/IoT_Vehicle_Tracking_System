import { toast } from 'sonner';

interface PromiseMessages {
  loading: string;
  success: string;
  error: string;
}

export const notificationUtils = {
  success: (title: string, description?: string) => toast.success(title, { description }),
  error: (title: string, description?: string) => toast.error(title, { description }),
  warning: (title: string, description?: string) => toast.warning(title, { description }),
  info: (title: string, description?: string) => toast.info(title, { description }),
  promise: <TPayload>(promise: Promise<TPayload>, messages: PromiseMessages) =>
    toast.promise(promise, messages),
};
