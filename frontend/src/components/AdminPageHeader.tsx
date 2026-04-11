import type { ReactNode } from 'react';

type AdminPageHeaderProps = {
  title: string;
  subtitle: string;
  action?: ReactNode;
};

const AdminPageHeader = ({ title, subtitle, action }: AdminPageHeaderProps) => {
  if (action) {
    return (
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-thunder-gold mb-2 sm:text-3xl">{title}</h1>
          <p className="text-sm text-gray-300 sm:text-base">{subtitle}</p>
        </div>
        <div className="w-full md:w-auto">{action}</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-thunder-gold mb-2 sm:text-3xl">{title}</h1>
      <p className="text-sm text-gray-300 sm:text-base">{subtitle}</p>
    </div>
  );
};

export default AdminPageHeader;
