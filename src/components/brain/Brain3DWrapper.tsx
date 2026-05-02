'use client';

import dynamic from 'next/dynamic';

const Brain3DVisualization = dynamic(
  () => import('@/components/brain/Brain3DVisualization'),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center h-[700px]">
      <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ) }
);

export default Brain3DVisualization;
