'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useTimer } from '@/hooks/useTimer';
import { Subject } from '@/types/study';

interface SubjectButtonProps {
  subject: Subject;
}

export function SubjectButton({ subject }: SubjectButtonProps) {
  const router = useRouter();
  const { startTimer } = useTimer();

  const handleClick = async () => {
    try {
      await startTimer(subject);
      router.push(`/timer?subject=${subject}`);
    } catch (error) {
      console.error('Failed to start timer:', error);
    }
  };

  const getSubjectColor = (subject: Subject) => {
    const colors = {
      数学: 'bg-blue-500 hover:bg-blue-600',
      英語: 'bg-green-500 hover:bg-green-600',
      国語: 'bg-red-500 hover:bg-red-600',
      理科: 'bg-purple-500 hover:bg-purple-600',
      社会: 'bg-orange-500 hover:bg-orange-600'
    };
    return colors[subject];
  };

  return (
    <Button
      onClick={handleClick}
      className={`h-12 text-white font-bold ${getSubjectColor(subject)}`}
    >
      {subject}
    </Button>
  );
}
