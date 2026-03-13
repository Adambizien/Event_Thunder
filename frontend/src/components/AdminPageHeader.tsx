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
          <h1 className="text-3xl font-bold text-thunder-gold mb-2">{title}</h1>
          <p className="text-gray-300">{subtitle}</p>
        </div>
        {action}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-thunder-gold mb-2">{title}</h1>
      <p className="text-gray-300">{subtitle}</p>
    </div>
  );
};

export default AdminPageHeader;