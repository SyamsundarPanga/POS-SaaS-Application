import React from 'react';

export type SkeletonVariant = 'text' | 'card' | 'table' | 'list' | 'circle' | 'rectangle';

interface LoadingSkeletonProps {
  variant?: SkeletonVariant;
  count?: number;
  className?: string;
  width?: string;
  height?: string;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'text',
  count = 1,
  className = '',
  width,
  height,
}) => {
  const renderSkeleton = () => {
    switch (variant) {
      case 'text':
        return (
          <div className={`space-y-3 ${className}`}>
            {[...Array(count)].map((_, idx) => (
              <div
                key={idx}
                className="skeleton h-4 rounded"
                style={{ width: width || `${Math.random() * 30 + 70}%` }}
              />
            ))}
          </div>
        );

      case 'circle':
        return (
          <div className={`flex gap-3 ${className}`}>
            {[...Array(count)].map((_, idx) => (
              <div
                key={idx}
                className="skeleton rounded-full"
                style={{
                  width: width || '48px',
                  height: height || '48px',
                }}
              />
            ))}
          </div>
        );

      case 'rectangle':
        return (
          <div className={`space-y-3 ${className}`}>
            {[...Array(count)].map((_, idx) => (
              <div
                key={idx}
                className="skeleton rounded-xl"
                style={{
                  width: width || '100%',
                  height: height || '200px',
                }}
              />
            ))}
          </div>
        );

      case 'card':
        return (
          <div className={`space-y-4 ${className}`}>
            {[...Array(count)].map((_, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-secondary-200 p-6">
                {/* Card Header */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="skeleton w-12 h-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-1/3 rounded" />
                    <div className="skeleton h-3 w-1/2 rounded" />
                  </div>
                </div>

                {/* Card Content */}
                <div className="space-y-2">
                  <div className="skeleton h-3 w-full rounded" />
                  <div className="skeleton h-3 w-5/6 rounded" />
                  <div className="skeleton h-3 w-4/6 rounded" />
                </div>

                {/* Card Footer */}
                <div className="flex gap-2 mt-4">
                  <div className="skeleton h-8 w-20 rounded-lg" />
                  <div className="skeleton h-8 w-20 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        );

      case 'table':
        return (
          <div className={`bg-white rounded-2xl border border-secondary-200 overflow-hidden ${className}`}>
            {/* Table Header */}
            <div className="bg-secondary-50 px-6 py-3 border-b border-secondary-200">
              <div className="flex gap-4">
                {[...Array(4)].map((_, idx) => (
                  <div key={idx} className="skeleton h-4 w-24 rounded" />
                ))}
              </div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-secondary-200">
              {[...Array(count)].map((_, rowIdx) => (
                <div key={rowIdx} className="px-6 py-4">
                  <div className="flex gap-4">
                    {[...Array(4)].map((_, colIdx) => (
                      <div key={colIdx} className="skeleton h-4 w-32 rounded" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'list':
        return (
          <div className={`space-y-3 ${className}`}>
            {[...Array(count)].map((_, idx) => (
              <div key={idx} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-secondary-200">
                <div className="skeleton w-10 h-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-1/3 rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                </div>
                <div className="skeleton h-8 w-20 rounded-lg" />
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return <>{renderSkeleton()}</>;
};

export default LoadingSkeleton;
