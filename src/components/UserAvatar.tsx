import React from 'react';
import { Cat, Dog, Bird, Fish, Snail, Bug, Bot, Skull, Smile, Zap, Star, Ghost, User } from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  Cat,
  Dog,
  Bird,
  Fish,
  Snail,
  Bug,
  Bot,
  Skull,
  Smile,
  Zap,
  Star,
  Ghost,
};

interface UserAvatarProps {
  iconName?: string;
  className?: string;
  size?: number;
}

export function UserAvatar({ iconName, className = "", size = 20 }: UserAvatarProps) {
  const IconComponent = iconName && iconMap[iconName] ? iconMap[iconName] : User;

  return (
    <div className={`flex items-center justify-center bg-[#222222] text-[#E4E3E0] ${className}`}>
      <IconComponent size={size} />
    </div>
  );
}
