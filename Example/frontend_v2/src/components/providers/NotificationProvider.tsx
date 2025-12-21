'use client';
import { useEffect, type PropsWithChildren } from 'react';
import { defaultNotificationApi, setNotificationApi } from '@/lib/notification';

const NotificationProvider = ({ children }: PropsWithChildren) => {
  useEffect(() => {
    setNotificationApi(defaultNotificationApi);
  }, []);

  return <>{children}</>;
};

export default NotificationProvider;


