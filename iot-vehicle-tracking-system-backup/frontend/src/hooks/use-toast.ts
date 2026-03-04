'use client';

import { useState, useCallback } from 'react';

export interface Toast {
    id: string;
    title?: string;
    description?: string;
    variant?: 'default' | 'destructive';
}

const listeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];

function dispatch(newToasts: Toast[]) {
    toasts = newToasts;
    listeners.forEach((listener) => listener(toasts));
}

export function toast(props: Omit<Toast, 'id'>) {
    const id = Math.random().toString(36).slice(2);
    const newToast = { ...props, id };
    dispatch([...toasts, newToast]);

    setTimeout(() => {
        dispatch(toasts.filter((t) => t.id !== id));
    }, 5000);

    return { id, dismiss: () => dispatch(toasts.filter((t) => t.id !== id)) };
}

export function useToast() {
    const [state, setState] = useState<Toast[]>(toasts);

    useState(() => {
        listeners.push(setState);
        return () => {
            const index = listeners.indexOf(setState);
            if (index > -1) listeners.splice(index, 1);
        };
    });

    return {
        toasts: state,
        toast,
        dismiss: (id: string) => dispatch(toasts.filter((t) => t.id !== id)),
    };
}
