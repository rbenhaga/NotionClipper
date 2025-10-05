import { TrendingUp, Star, Clock, Folder } from 'lucide-react';

interface TabIconProps {
    name: string;
    size?: number;
}

export default function TabIcon({ name, size = 16 }: TabIconProps) {
    const props = { size };

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