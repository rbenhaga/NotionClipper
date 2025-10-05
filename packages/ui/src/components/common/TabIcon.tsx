import React from 'react';
import { TrendingUp, Star, Clock, Folder, LucideProps } from 'lucide-react';

export interface TabIconProps extends Omit<LucideProps, 'ref'> {
    name: 'TrendingUp' | 'Star' | 'Clock' | 'Folder';
}

export function TabIcon({ name, ...props }: TabIconProps) {
    switch (name) {
        case 'TrendingUp':
            return <TrendingUp {...props} />;
        case 'Star':
            return <Star {...props} />;
        case 'Clock':
            return <Clock {...props} />;
        case 'Folder':
            return <Folder {...props} />;
        default:
            return null;
    }
}